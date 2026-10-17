import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyTerminalSignature } from "@/lib/terminal/webhook";
import { processTerminalEvent } from "@/lib/terminal/events";

/**
 * Terminal Africa webhooks. Verify the signature on the raw body, store the event once
 * (deduplicated on event_id), acknowledge, then process. Failed events keep their error
 * and can be retried from Admin → Terminal → Webhooks.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyTerminalSignature(raw, req.headers.get("x-terminal-signature")))
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let payload: { event: string; event_id?: string; data: Record<string, unknown> };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const eventKey = `terminal:${payload.event_id ?? crypto.createHash("sha256").update(raw).digest("hex")}`;
  let stored;
  try {
    stored = await db.webhookEvent.create({
      data: { source: "terminal", eventKey, event: payload.event, payload: payload as Prisma.InputJsonValue },
    });
  } catch (e) {
    // Duplicate delivery or replay: already accepted
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return NextResponse.json({ ok: true });
    console.error("webhook store failed", e);
    // Non-2xx makes Terminal retry later
    return NextResponse.json({ error: "storage unavailable" }, { status: 503 });
  }

  try {
    await processTerminalEvent(payload);
    await db.webhookEvent.update({ where: { id: stored.id }, data: { processedAt: new Date() } });
  } catch (e) {
    await db.webhookEvent.update({ where: { id: stored.id }, data: { error: e instanceof Error ? e.message : String(e) } });
  }
  return NextResponse.json({ ok: true });
}
