import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyPaystackSignature } from "@/lib/payments";
import { confirmPayment } from "@/lib/checkout";

// Backup for customers who close the tab before returning from Paystack
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyPaystackSignature(raw, req.headers.get("x-paystack-signature")))
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  const payload = JSON.parse(raw) as { event: string; data: { reference: string; id: number } };

  try {
    await db.webhookEvent.create({
      data: {
        source: "paystack",
        eventKey: `paystack:${payload.event}:${payload.data.id}`,
        event: payload.event,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return NextResponse.json({ ok: true });
    throw e;
  }

  if (payload.event === "charge.success") await confirmPayment(payload.data.reference);
  return NextResponse.json({ ok: true });
}
