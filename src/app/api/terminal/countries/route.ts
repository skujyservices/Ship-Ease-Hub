import { NextResponse } from "next/server";
import { getCountries } from "@/lib/terminal/api";
import { handle } from "@/lib/http";

let cache: { at: number; data: unknown } | null = null;

export const GET = handle(async () => {
  if (!cache || Date.now() - cache.at > 24 * 3600_000) {
    const countries = await getCountries();
    cache = {
      at: Date.now(),
      data: countries.map((c) => ({ code: c.isoCode, name: c.name, flag: c.flag, phonecode: c.phonecode })),
    };
  }
  return NextResponse.json(cache.data);
});
