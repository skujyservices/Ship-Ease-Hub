import { NextResponse } from "next/server";
import { getDefaultPackaging, getPackaging } from "@/lib/terminal/api";
import { handle } from "@/lib/http";

// Terminal's default box plus any packaging presets saved on SEH's Terminal account
export const GET = handle(async () => {
  const [def, mine] = await Promise.all([getDefaultPackaging(), getPackaging({ perPage: 100 }).catch(() => ({ packaging: [] }))]);
  const all = [def, ...(mine.packaging ?? []).filter((p) => p.packaging_id !== def.packaging_id)];
  return NextResponse.json(
    all.map((p) => ({
      id: p.packaging_id,
      name: p.name,
      type: p.type,
      dims: `${p.length}×${p.width}×${p.height} cm`,
      weight: p.weight,
      isDefault: Boolean(p.default),
    })),
  );
});
