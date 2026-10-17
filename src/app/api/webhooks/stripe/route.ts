import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyStripeSignature } from "@/lib/payments";
import { confirmPayment } from "@/lib/checkout";

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature")))
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  const event = JSON.parse(raw) as { id: string; type: string; data: { object: { client_reference_id?: string } } };

  try {
    await db.webhookEvent.create({
      data: { source: "stripe", eventKey: `stripe:${event.id}`, event: event.type, payload: event as unknown as Prisma.InputJsonValue },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return NextResponse.json({ ok: true });
    throw e;
  }

  const ref = event.data.object.client_reference_id;
  if (event.type === "checkout.session.completed" && ref) await confirmPayment(ref);
  return NextResponse.json({ ok: true });
}
