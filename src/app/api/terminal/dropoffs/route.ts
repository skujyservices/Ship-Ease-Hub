import { NextResponse, type NextRequest } from "next/server";
import { getDropoffLocations } from "@/lib/terminal/api";
import { HttpError, handle } from "@/lib/http";

export const GET = handle(async (req: NextRequest) => {
  const p = req.nextUrl.searchParams;
  const carrier = p.get("carrier");
  if (!carrier) throw new HttpError(400, "carrier is required");
  const list = await getDropoffLocations({
    carrier,
    country: p.get("country") ?? "NG",
    state: p.get("state") ?? undefined,
    city: p.get("city") ?? undefined,
  });
  return NextResponse.json(
    list.map((d) => ({ id: d.dropoff_id ?? d.drop_off_location_id, address: d.address, city: d.city, state: d.state, phone: d.phone })),
  );
});
