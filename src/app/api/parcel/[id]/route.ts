import { NextResponse } from "next/server";
import { handle, shipmentForRequest } from "@/lib/http";
import { quoteView } from "@/lib/outbound/view";

export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/parcel/[id]">) => {
  const { id } = await ctx.params;
  const { shipment } = await shipmentForRequest(id);
  return NextResponse.json(quoteView(shipment));
});
