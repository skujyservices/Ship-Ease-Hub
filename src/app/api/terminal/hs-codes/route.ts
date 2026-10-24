import { NextResponse, type NextRequest } from "next/server";
import { searchHsCodes } from "@/lib/terminal/api";
import { clientIp, handle, rateLimit } from "@/lib/http";

type Hit = Record<string, unknown>;

// Simplified HS code search for the customs item description
export const GET = handle(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) return NextResponse.json([]);
  await rateLimit(`hs:${clientIp(req)}`, 60, 60_000);
  const data = (await searchHsCodes(q, { perPage: 10 })) as Hit[] | { hscodes?: Hit[]; hs_codes?: Hit[]; data?: Hit[] };
  const list: Hit[] = Array.isArray(data) ? data : (data.hscodes ?? data.hs_codes ?? data.data ?? []);
  return NextResponse.json(
    list.slice(0, 10).map((h) => ({
      code: String(h.hs_code ?? h.code ?? ""),
      label: String(h.sub_category ?? h.description ?? h.category ?? h.name ?? ""),
      category: h.category ? String(h.category) : undefined,
    })),
  );
});
