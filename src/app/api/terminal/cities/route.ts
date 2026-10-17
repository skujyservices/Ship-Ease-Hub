import { NextResponse, type NextRequest } from "next/server";
import { getCities } from "@/lib/terminal/api";
import { HttpError, handle } from "@/lib/http";

export const GET = handle(async (req: NextRequest) => {
  const country = req.nextUrl.searchParams.get("country");
  if (!country) throw new HttpError(400, "country is required");
  const cities = await getCities(country, req.nextUrl.searchParams.get("state") ?? undefined);
  return NextResponse.json(cities.map((c) => c.name));
});
