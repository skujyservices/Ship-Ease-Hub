import { NextResponse } from "next/server";
import { HttpError, handle } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { createRequest, requestSchema } from "@/lib/inbound/procurement";

// New Buy for me request
export const POST = handle(async (req: Request) => {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Please sign in");
  const r = await createRequest(user.id, requestSchema.parse(await req.json()));
  return NextResponse.json({ id: r.id });
});
