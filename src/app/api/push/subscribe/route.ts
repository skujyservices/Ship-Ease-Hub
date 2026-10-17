import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, handle } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";

const subSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

export const POST = handle(async (req: Request) => {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Sign in first");
  const sub = subSchema.parse(await req.json());
  await db.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    update: { userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
  return NextResponse.json({ ok: true });
});
