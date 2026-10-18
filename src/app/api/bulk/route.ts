import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, handle } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";

// Start a bulk batch; rows are then priced one by one via /api/bulk/[id]/row
export const POST = handle(async (req: Request) => {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Please sign in");
  const { name } = z.object({ name: z.string().trim().min(1).max(120) }).parse(await req.json());
  const batch = await db.batch.create({ data: { userId: user.id, name } });
  return NextResponse.json({ id: batch.id });
});
