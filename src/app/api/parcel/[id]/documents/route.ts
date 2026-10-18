import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handle, shipmentForRequest } from "@/lib/http";
import { startCheckout } from "@/lib/checkout";

type Doc = { type: string; name: string; minor: number; free: boolean };

// Customs documents for a booked international shipment (Terminal analyses only after booking)
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/parcel/[id]/documents">) => {
  const { id } = await ctx.params;
  const { shipment, user } = await shipmentForRequest(id, { requireUser: true });
  const { types } = z.object({ types: z.array(z.string()).min(1, "Choose at least one document") }).parse(await req.json());
  const docs = shipment.regulatoryDocs as { available?: Doc[]; purchased?: unknown[] } | null;
  const chosen = (docs?.available ?? []).filter((d) => types.includes(d.type));
  if (!chosen.length) throw new HttpError(400, "Those documents aren't available for this shipment.");
  if (docs?.purchased?.length) throw new HttpError(409, "Documents were already ordered for this shipment.");
  const amount = chosen.reduce((s, d) => s + d.minor, 0);
  if (!amount) throw new HttpError(400, "These documents are free and will be prepared automatically.");

  const url = await startCheckout({
    userId: user!.id,
    email: user!.email,
    purpose: "DOCUMENTS",
    amountMinor: amount,
    currency: "NGN",
    description: `Customs documents ${shipment.code}`,
    shipmentId: id,
    docTypes: chosen.map((d) => d.type),
    returnPath: `/app/shipments/${id}`,
  });
  return NextResponse.json({ url });
});
