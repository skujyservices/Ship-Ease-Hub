import { NextResponse } from "next/server";
import { handle, shipmentForRequest } from "@/lib/http";
import { refreshTracking } from "@/lib/outbound/service";

// Pull the latest status from Terminal (webhooks normally keep it fresh)
export const POST = handle(async (_req: Request, ctx: RouteContext<"/api/parcel/[id]/track">) => {
  const { id } = await ctx.params;
  await shipmentForRequest(id, { requireUser: true });
  const s = await refreshTracking(id);
  return NextResponse.json({ status: s.status });
});
