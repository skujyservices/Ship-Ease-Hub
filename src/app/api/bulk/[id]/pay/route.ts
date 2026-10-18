import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, handle } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { startCheckout } from "@/lib/checkout";
import { STATUS } from "@/lib/status";

// One payment for every priced shipment in the batch; each is booked on Terminal after payment
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/bulk/[id]/pay">) => {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Please sign in");
  z.object({ acceptTerms: z.literal(true, "Please accept the terms to continue") }).parse(await req.json());
  const batch = await db.batch.findUnique({ where: { id }, include: { shipments: { where: { status: STATUS.AWAITING_PAYMENT } } } });
  if (!batch || batch.userId !== user.id) throw new HttpError(404, "Batch not found");
  const total = batch.shipments.reduce((s, x) => s + (x.totalMinor ?? 0), 0);
  if (!batch.shipments.length || !total) throw new HttpError(409, "Nothing in this batch is ready to pay for.");

  const url = await startCheckout({
    userId: user.id,
    email: user.email,
    purpose: "SHIPMENT",
    amountMinor: total,
    currency: "NGN",
    description: `${batch.shipments.length} shipments (${batch.name})`,
    batchId: batch.id,
    shipmentIds: batch.shipments.map((x) => x.id),
    returnPath: `/app/ship/bulk?batch=${batch.id}`,
  });
  return NextResponse.json({ url });
});
