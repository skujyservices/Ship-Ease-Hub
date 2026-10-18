import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handle, shipmentForRequest } from "@/lib/http";
import { startCheckout } from "@/lib/checkout";
import { getSettings } from "@/lib/settings";
import { STATUS } from "@/lib/status";

const schema = z.object({
  currency: z.enum(["NGN", "GBP", "USD"]),
  acceptTerms: z.literal(true, "Please accept the pickup rules to continue"),
});

// Pay for a Shop & Ship shipment. Priced in NGN; diaspora payers can pay in GBP or USD at our FX rate.
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/inbound/[id]/pay">) => {
  const { id } = await ctx.params;
  const { shipment, user } = await shipmentForRequest(id, { requireUser: true });
  const { currency } = schema.parse(await req.json());
  if (shipment.kind !== "INBOUND" || shipment.status !== STATUS.AWAITING_PAYMENT || !shipment.totalMinor)
    throw new HttpError(409, "This shipment isn't waiting for payment.");

  const fx = (await getSettings()).fxToNgn;
  const amountMinor = currency === "NGN" ? shipment.totalMinor : Math.ceil(shipment.totalMinor / fx[currency]);

  const url = await startCheckout({
    userId: user!.id,
    email: user!.email,
    purpose: "SHIPMENT",
    amountMinor,
    currency,
    description: `Shop & Ship ${shipment.code}`,
    shipmentId: id,
    returnPath: `/app/shipments/${id}`,
  });
  return NextResponse.json({ url });
});
