import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, handle, rateLimit } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { createAddress, verifyAddressNin } from "@/lib/terminal/api";
import { TerminalError } from "@/lib/terminal/client";
import { internationalPhone } from "@/lib/outbound/service";

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
  await rateLimit(`nin:${user.id}`, 3, 24 * 3600_000);
  const input = schema.parse(await req.json());

  // Step 1: the address (errors here are about email/phone/address, not the NIN)
  let addressId: string;
  try {
    const address = await createAddress({
      first_name: input.first_name,
      last_name: input.last_name,
      email: user.email,
      phone: await internationalPhone(user.phone ?? "", "NG"),
      line1: input.line1,
      city: input.city,
      state: input.state,
      zip: input.zip,
      country: "NG",
    });
    addressId = address.address_id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/phone/i.test(msg)) throw new HttpError(422, "Please update your phone number to a valid Nigerian number first.");
    if (/email/i.test(msg)) throw new HttpError(422, "Your account email doesn't look valid. Please contact us.");
    throw new HttpError(422, `We couldn't use that address: ${msg}`);
  }

  // Step 2: the NIN against that name
  try {
    const verified = await verifyAddressNin(addressId, input.nin);
    if (verified.verified === false) throw new HttpError(422, "We couldn't verify that NIN with this name.");
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e instanceof TerminalError && e.status < 500) throw new HttpError(422, "We couldn't verify that NIN with this name. Check both match your NIN slip exactly.");
    throw e;
  }

  await db.user.update({ where: { id: user.id }, data: { ninVerifiedAt: new Date(), ninName: `${input.first_name} ${input.last_name}` } });
  return NextResponse.json({ ok: true });
});
