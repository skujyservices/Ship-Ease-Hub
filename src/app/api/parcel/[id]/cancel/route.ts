import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, handle, shipmentForRequest } from "@/lib/http";
import { cancelOnTerminal } from "@/lib/outbound/service";
import { refundPayment } from "@/lib/checkout";
import { STATUS } from "@/lib/status";
import { notifyUser } from "@/lib/notify";
import { cancelInbound } from "@/lib/inbound/service";

// Cancel before the courier collects it, then refund the customer in full
export const POST = handle(async (_req: Request, ctx: RouteContext<"/api/parcel/[id]/cancel">) => {
  const { id } = await ctx.params;
  const { shipment } = await shipmentForRequest(id, { requireUser: true });

  if ([STATUS.DRAFT, STATUS.AWAITING_PAYMENT].includes(shipment.status as never)) {
    if (shipment.kind === "INBOUND") await cancelInbound(shipment);
    else await db.shipment.update({ where: { id }, data: { status: STATUS.CANCELLED } });
    return NextResponse.json({ ok: true });
  }
  if (shipment.kind === "INBOUND") throw new HttpError(409, "Paid Shop & Ship orders can't be cancelled online. Please contact us.");
  if (![STATUS.BOOKED, STATUS.PICKUP_SCHEDULED, STATUS.BOOKING_FAILED].includes(shipment.status as never))
    throw new HttpError(409, "This shipment can no longer be cancelled because the courier already has it.");

  if (shipment.status !== STATUS.BOOKING_FAILED) await cancelOnTerminal(id);
  else await db.shipment.update({ where: { id }, data: { status: STATUS.CANCELLED } });

  const payment = await db.payment.findFirst({ where: { shipmentId: id, purpose: "SHIPMENT", status: "SUCCESS" } });
  if (payment) await refundPayment(payment);

  if (shipment.userId)
    await notifyUser(shipment.userId, {
      title: `${shipment.code} cancelled`,
      body: payment ? "Your shipment was cancelled and your payment is being refunded." : "Your shipment was cancelled.",
      url: `/app/shipments/${id}`,
    });
  return NextResponse.json({ ok: true });
});
