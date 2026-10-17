import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, handle, shipmentForRequest } from "@/lib/http";
import { startCheckout } from "@/lib/checkout";
import { getSettings } from "@/lib/settings";
import { markup } from "@/lib/outbound/pricing";

// Carrier re-weighed the parcel heavier (Terminal reconciliation): customer pays the difference
export const POST = handle(async (_req: Request, ctx: RouteContext<"/api/parcel/[id]/pay-adjustment">) => {
  const { id } = await ctx.params;
  const { shipment, user } = await shipmentForRequest(id, { requireUser: true });
  const rec = await db.reconciliation.findFirst({
    where: { shipmentId: id, voided: false, customerPaid: false, extraChargeMinor: { gt: 0 } },
    orderBy: { createdAt: "desc" },
  });
  if (!rec) throw new HttpError(404, "Nothing to pay for this shipment.");
  const settings = await getSettings();
  const amount = markup(rec.extraChargeMinor, { ...settings, outboundMarkupFixedMinor: 0 });

  const url = await startCheckout({
    userId: user!.id,
    email: user!.email,
    purpose: "WEIGHT_ADJUSTMENT",
    amountMinor: amount,
    currency: "NGN",
    description: `Weight adjustment for ${shipment.code}`,
    shipmentId: id,
    returnPath: `/app/shipments/${id}`,
  });
  return NextResponse.json({ url });
});
