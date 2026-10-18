import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, handle } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { startCheckout } from "@/lib/checkout";
import type { ProcurementQuote } from "@/lib/inbound/procurement";

export const POST = handle(async (_req: Request, ctx: RouteContext<"/api/buy/[id]/pay">) => {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Please sign in");
  const r = await db.procurementRequest.findUnique({ where: { id } });
  if (!r || r.userId !== user.id) throw new HttpError(404, "Request not found");
  if (r.status !== "QUOTED") throw new HttpError(409, "This request isn't waiting for payment.");
  if (r.quoteExpiresAt && r.quoteExpiresAt < new Date()) throw new HttpError(409, "This quote has expired. We'll send you an updated one.");

  const quote = r.quote as ProcurementQuote;
  const url = await startCheckout({
    userId: user.id,
    email: user.email,
    purpose: "PROCUREMENT",
    amountMinor: quote.totalMinor,
    currency: "NGN",
    description: "Buy for me order",
    procurementId: id,
    returnPath: `/app/ship/buy/${id}`,
  });
  return NextResponse.json({ url });
});
