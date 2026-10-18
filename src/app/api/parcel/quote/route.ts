import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { HttpError, clientIp, handle, rateLimit } from "@/lib/http";
import { TerminalError } from "@/lib/terminal/client";
import { quoteSchema, type AddressForm } from "@/lib/outbound/schema";
import { createQuote } from "@/lib/outbound/service";
import { quoteView } from "@/lib/outbound/view";

// Works without an account (guest quotes). Each quote calls Terminal several times
// (some paid, e.g. duty estimates), so guests are rate-limited.
export const POST = handle(async (req: Request) => {
  const user = await getCurrentUser();
  rateLimit(`quote:${user?.id ?? clientIp(req)}`, user ? 60 : 10, 3600_000);
  const body = await req.json();
  const input = quoteSchema.parse(body);
  const shipment = await createQuote(input, user?.id ?? null).catch((e: Error) => {
    if (e instanceof TerminalError) throw e;
    throw new HttpError(400, e.message); // e.g. a phone number that doesn't match its country
  });

  if (user) {
    const toSave: AddressForm[] = [];
    if (body.save?.from) toSave.push(input.from);
    if (body.save?.to) toSave.push(input.to);
    for (const a of toSave)
      await db.savedAddress.create({
        data: {
          userId: user.id,
          firstName: a.first_name,
          lastName: a.last_name,
          email: a.email,
          phone: a.phone,
          line1: a.line1,
          line2: a.line2,
          city: a.city,
          state: a.state,
          country: a.country,
          zip: a.zip,
        },
      });
  }
  return NextResponse.json(quoteView(shipment));
});
