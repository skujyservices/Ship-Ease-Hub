import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, handle, shipmentForRequest } from "@/lib/http";
import { startCheckout } from "@/lib/checkout";
import { STATUS } from "@/lib/status";

const bodySchema = z.object({ acceptTerms: z.literal(true, "Please accept the terms to continue") });

// Sign-in is required here (spec: ask people to register only when they're ready to pay)
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/parcel/[id]/pay">) => {
  const { id } = await ctx.params;
  const { shipment, user } = await shipmentForRequest(id, { requireUser: true });
  bodySchema.parse(await req.json());
  if (shipment.status !== STATUS.AWAITING_PAYMENT || !shipment.totalMinor)
    throw new HttpError(409, "Choose a rate before paying.");

  // A guest quote becomes the customer's at checkout
  if (!shipment.userId) await db.shipment.update({ where: { id }, data: { userId: user!.id } });

  const url = await startCheckout({
    userId: user!.id,
    email: user!.email,
    purpose: "SHIPMENT",
    amountMinor: shipment.totalMinor,
    currency: "NGN",
    description: `Shipment ${shipment.code}`,
    shipmentId: shipment.id,
    returnPath: `/app/shipments/${shipment.id}`,
  });
  return NextResponse.json({ url });
});
