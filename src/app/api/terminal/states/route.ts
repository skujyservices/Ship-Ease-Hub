import { NextResponse, type NextRequest } from "next/server";
import { getStates } from "@/lib/terminal/api";
import { HttpError, handle } from "@/lib/http";

export const GET = handle(async (req: NextRequest) => {
  const country = req.nextUrl.searchParams.get("country");
  if (!country) throw new HttpError(400, "country is required");
  const states = await getStates(country);
  return NextResponse.json(states.map((s) => ({ code: s.isoCode, name: s.name })));
});
