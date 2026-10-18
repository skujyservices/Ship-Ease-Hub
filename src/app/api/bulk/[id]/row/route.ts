import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, handle, rateLimit } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { addressSchema } from "@/lib/outbound/schema";
import { bulkRowSchema } from "@/lib/outbound/bulk";
import { createQuote, selectRate, type StoredQuote } from "@/lib/outbound/service";

const schema = z.object({
  from: addressSchema,
  packaging: z.string().min(1),
  purpose: z.enum(["personal", "commercial", "sample"]),
  strategy: z.enum(["cheapest", "fastest"]),
  row: bulkRowSchema,
});

const days = (t?: string) => Number(/(\d+)/.exec(t ?? "")?.[1] ?? 99);

// Price one spreadsheet row and auto-pick a carrier (cheapest or fastest) with courier pickup
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/bulk/[id]/row">) => {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Please sign in");
  const batch = await db.batch.findUnique({ where: { id } });
  if (!batch || batch.userId !== user.id) throw new HttpError(404, "Batch not found");
  rateLimit(`bulk:${user.id}`, 300, 3600_000);

  const { from, packaging, purpose, strategy, row } = schema.parse(await req.json());
  const draft = await createQuote(
    { from, to: row.to, purpose, parcels: [{ packaging, items: [{ ...row.item, type: "parcel" }] }] },
    user.id,
    batch.id,
  );
  const quote = draft.rates as unknown as StoredQuote;
  // Only rates we can book unattended: plain courier pickup
  const usable = quote.rates.filter((r) => r.pickupOptions.some((o) => o.type === "pickup"));
  if (!usable.length) throw new HttpError(422, "No carrier offers pickup for this row. Open it to choose manually.");
  const pick = [...usable].sort((a, b) => (strategy === "cheapest" ? a.customerFromMinor - b.customerFromMinor : days(a.deliveryTime) - days(b.deliveryTime)))[0];

  const priced = await selectRate(draft, { rateId: pick.rateId, pickupOption: "pickup", insurance: false, documents: [] });
  return NextResponse.json({
    shipmentId: priced.id,
    code: priced.code,
    carrier: pick.carrierName,
    eta: pick.deliveryTime,
    totalMinor: priced.totalMinor,
    dutyMinor: pick.dutyMinor,
  });
});
