import { NextResponse } from "next/server";
import { HttpError, handle, shipmentForRequest } from "@/lib/http";
import { selectSchema } from "@/lib/outbound/schema";
import { selectRate } from "@/lib/outbound/service";
import { quoteView } from "@/lib/outbound/view";
import { STATUS } from "@/lib/status";

export const POST = handle(async (req: Request, ctx: RouteContext<"/api/parcel/[id]/select">) => {
  const { id } = await ctx.params;
  const { shipment } = await shipmentForRequest(id);
  if (![STATUS.DRAFT, STATUS.AWAITING_PAYMENT].includes(shipment.status as never))
    throw new HttpError(409, "This shipment has already been paid for.");
  const updated = await selectRate(shipment, selectSchema.parse(await req.json())).catch((e: Error) => {
    throw new HttpError(400, e.message);
  });
  return NextResponse.json(quoteView(updated));
});
