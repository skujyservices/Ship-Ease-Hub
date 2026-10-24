import { NextResponse } from "next/server";
import { runStorageJob } from "@/lib/inbound/service";
import { housekeeping } from "@/lib/housekeeping";

// Daily storage-fee / reminder / disposal job. Vercel Cron calls this with
// "Authorization: Bearer $CRON_SECRET" (see vercel.json); any scheduler can do the same.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const storage = await runStorageJob();
  const cleanup = await housekeeping();
  return NextResponse.json({ storage, cleanup });
}
