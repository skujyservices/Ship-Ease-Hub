import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, handle, rateLimit } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { addressSchema } from "@/lib/outbound/schema";
import { bulkRowSchema } from "@/lib/outbound/bulk";
import { createQuote, selectRate, type StoredQuote } from "@/lib/outbound/service";
import { getDropoffLocations } from "@/lib/terminal/api";

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
  await rateLimit(`bulk:${user.id}`, 300, 3600_000);

  const { from, packaging, purpose, strategy, row } = schema.parse(await req.json());
  const draft = await createQuote(
    { from, to: row.to, purpose, parcels: [{ packaging, items: [{ ...row.item, type: "parcel" }] }] },
    user.id,
    batch.id,
  ).catch((e: Error) => {
    throw new HttpError(422, e.message);
  });
  const quote = draft.rates as unknown as StoredQuote;
  // Bookable without asking: courier pickup, or drop-off at the carrier's nearest point
  const usable = quote.rates.filter((r) => r.pickupOptions.some((o) => o.type === "pickup" || o.type === "dropoff"));
  if (!usable.length) throw new HttpError(422, "No carrier can take this parcel automatically. Open it to choose manually.");
  const pick = [...usable].sort((a, b) => (strategy === "cheapest" ? a.customerFromMinor - b.customerFromMinor : days(a.deliveryTime) - days(b.deliveryTime)))[0];

  let pickupOption: "pickup" | "dropoff" = "pickup";
  let dropoffId: string | undefined;
  let dropoffAddress: string | undefined;
  if (!pick.pickupOptions.some((o) => o.type === "pickup")) {
    pickupOption = "dropoff";
    const points = await getDropoffLocations({ carrier: pick.carrierSlug ?? "", country: "NG", state: from.state }).catch(() => []);
    const point = points[0];
    dropoffId = point?.dropoff_id ?? point?.drop_off_location_id;
    dropoffAddress = point?.address;
    if (!dropoffId) throw new HttpError(422, `${pick.carrierName} needs a drop-off and none is listed near you. Open it to choose manually.`);
  }

  const priced = await selectRate(draft, { rateId: pick.rateId, pickupOption, dropoffId, insurance: false, documents: [] });
  return NextResponse.json({
    shipmentId: priced.id,
    code: priced.code,
    carrier: pick.carrierName,
    eta: pick.deliveryTime,
    totalMinor: priced.totalMinor,
    dutyMinor: pick.dutyMinor,
    dropoffAddress,
  });
});
