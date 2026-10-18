import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, handle } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  warehouse: z.enum(["US", "GB", "CN"]),
  store: z.string().trim().min(1, "Which store is it from?").max(100),
  storeTracking: z.string().trim().max(100).optional(),
  description: z.string().trim().min(2, "Describe what's inside").max(300),
  declaredValue: z.number().min(0).optional(), // origin currency, major units
});

// Customer tells us a package is on its way to one of their foreign addresses
export const POST = handle(async (req: Request) => {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Please sign in");
  const input = schema.parse(await req.json());
  const pkg = await db.package.create({
    data: {
      userId: user.id,
      warehouse: input.warehouse,
      status: "EXPECTED",
      store: input.store,
      storeTracking: input.storeTracking || null,
      description: input.description,
      declaredValue: input.declaredValue ? Math.round(input.declaredValue * 100) : null,
    },
  });
  return NextResponse.json({ id: pkg.id });
});
