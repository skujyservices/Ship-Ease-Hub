import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, handle } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";

// Customer withdraws a request before paying
export const POST = handle(async (_req: Request, ctx: RouteContext<"/api/buy/[id]/cancel">) => {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Please sign in");
  const done = await db.procurementRequest.updateMany({
    where: { id, userId: user.id, status: { in: ["REQUESTED", "QUOTED"] } },
    data: { status: "CANCELLED" },
  });
  if (!done.count) throw new HttpError(409, "This request can't be cancelled now.");
  return NextResponse.json({ ok: true });
});
