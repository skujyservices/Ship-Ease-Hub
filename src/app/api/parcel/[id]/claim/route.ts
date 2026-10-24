import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, handle, shipmentForRequest } from "@/lib/http";
import { claimSchema } from "@/lib/outbound/schema";
import { fileClaim } from "@/lib/terminal/api";
import { addEvent, ensureInsuranceId } from "@/lib/outbound/service";

// Insurance claim for a lost or damaged parcel
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/parcel/[id]/claim">) => {
  const { id } = await ctx.params;
  const { shipment } = await shipmentForRequest(id, { requireUser: true });
  const insuranceId = shipment.insuranceId ?? (await ensureInsuranceId(id));
  if (!insuranceId) throw new HttpError(409, shipment.withInsurance ? "Your insurance is still being confirmed. Please try again shortly." : "This shipment wasn't insured, so a claim can't be filed.");
  const input = claimSchema.parse(await req.json());

  const claim = await fileClaim(insuranceId, {
    reason: input.reason,
    description: input.description,
    witnesses: input.witnesses.length ? input.witnesses : undefined,
  });
  await db.claim.create({
    data: { terminalId: claim.claim_id, shipmentId: id, reason: input.reason, description: input.description, status: claim.status },
  });
  await addEvent(id, "CLAIM", `Insurance claim filed (${input.reason.replace(/-/g, " ")})`, "system");
  return NextResponse.json({ ok: true, claimId: claim.claim_id });
});
