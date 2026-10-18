import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, handle, rateLimit } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { createAddress, verifyAddressNin } from "@/lib/terminal/api";
import { TerminalError } from "@/lib/terminal/client";

const schema = z.object({
  first_name: z.string().trim().min(1, "First name as on your NIN"),
  last_name: z.string().trim().min(1, "Last name as on your NIN"),
  nin: z.string().regex(/^\d{11}$/, "NIN is 11 digits"),
  line1: z.string().trim().min(3, "Your street address"),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  zip: z.string().trim().min(1),
});

/**
 * Identity check through Terminal: the name must match the NIN, against a Nigerian address.
 * Terminal charges SEH's wallet per attempt, so attempts are limited. The NIN itself is never stored.
 */
export const POST = handle(async (req: Request) => {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Please sign in");
  if (user.ninVerifiedAt) return NextResponse.json({ ok: true });
  rateLimit(`nin:${user.id}`, 3, 24 * 3600_000);
  const input = schema.parse(await req.json());

  try {
    const address = await createAddress({
      first_name: input.first_name,
      last_name: input.last_name,
      email: user.email,
      phone: user.phone ?? "",
      line1: input.line1,
      city: input.city,
      state: input.state,
      zip: input.zip,
      country: "NG",
    });
    const verified = await verifyAddressNin(address.address_id, input.nin);
    if (verified.verified === false) throw new HttpError(422, "We couldn't verify that NIN with this name.");
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e instanceof TerminalError && e.status < 500) throw new HttpError(422, "We couldn't verify that NIN with this name. Check both match your NIN slip exactly.");
    throw e;
  }

  await db.user.update({ where: { id: user.id }, data: { ninVerifiedAt: new Date(), ninName: `${input.first_name} ${input.last_name}` } });
  return NextResponse.json({ ok: true });
});
