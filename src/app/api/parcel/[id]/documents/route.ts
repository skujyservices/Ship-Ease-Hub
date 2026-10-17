import { NextResponse } from "next/server";
import { handle, shipmentForRequest } from "@/lib/http";
import { analyzeDocuments } from "@/lib/outbound/service";

// Which regulatory documents (e.g. FDA prior notice) the goods may need at the destination
export const POST = handle(async (_req: Request, ctx: RouteContext<"/api/parcel/[id]/documents">) => {
  const { id } = await ctx.params;
  const { shipment } = await shipmentForRequest(id);
  const existing = (shipment.regulatoryDocs as { available?: unknown[] } | null)?.available;
  if (existing) return NextResponse.json(existing);
  if (shipment.toAddress && (shipment.toAddress as { country: string }).country === "NG") return NextResponse.json([]);
  return NextResponse.json((await analyzeDocuments(shipment)) ?? []);
});
