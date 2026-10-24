import { NextResponse } from "next/server";
import { HttpError, handle, rateLimit, shipmentForRequest } from "@/lib/http";
import { quoteSchema } from "@/lib/outbound/schema";
import { createQuote } from "@/lib/outbound/service";

// Ship again: same sender, receiver and contents, with fresh live rates
export const POST = handle(async (_req: Request, ctx: RouteContext<"/api/parcel/[id]/again">) => {
  const { id } = await ctx.params;
  const { shipment, user } = await shipmentForRequest(id, { requireUser: true });
  if (shipment.kind !== "OUTBOUND") throw new HttpError(400, "Only sent parcels can be repeated.");
  await rateLimit(`quote:${user!.id}`, 60, 3600_000);
  const input = quoteSchema.parse({ from: shipment.fromAddress, to: shipment.toAddress, parcels: shipment.parcels, purpose: shipment.purpose ?? "personal" });
  const next = await createQuote(input, user!.id);
  return NextResponse.json({ id: next.id });
});
