import { NextResponse } from "next/server";
import { HttpError, handle, shipmentForRequest } from "@/lib/http";
import { startCheckout } from "@/lib/checkout";
import { getSettings } from "@/lib/settings";
import { storageState } from "@/lib/inbound/service";
import { STATUS } from "@/lib/status";

// Pay storage owed so far at the Lagos hub, so pickup is quick
export const POST = handle(async (_req: Request, ctx: RouteContext<"/api/inbound/[id]/storage-fee">) => {
  const { id } = await ctx.params;
  const { shipment, user } = await shipmentForRequest(id, { requireUser: true });
  if (shipment.status !== STATUS.READY_FOR_PICKUP) throw new HttpError(409, "There's no storage fee to pay.");
  const { outstandingMinor } = storageState(shipment, await getSettings());
  if (outstandingMinor <= 0) throw new HttpError(409, "Nothing to pay. Storage is still free.");

  const url = await startCheckout({
    userId: user!.id,
    email: user!.email,
    purpose: "STORAGE_FEE",
    amountMinor: outstandingMinor,
    currency: "NGN",
    description: `Storage fee ${shipment.code}`,
    shipmentId: id,
    returnPath: `/app/shipments/${id}`,
  });
  return NextResponse.json({ url });
});
