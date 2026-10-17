import { NextResponse } from "next/server";
import { validateAddress } from "@/lib/terminal/api";
import { addressSchema } from "@/lib/outbound/schema";
import { clientIp, handle, rateLimit } from "@/lib/http";

// Global address validation (Terminal charges ~$0.02 per call), used on the destination address
export const POST = handle(async (req: Request) => {
  rateLimit(`validate:${clientIp(req)}`, 20, 3600_000);
  const a = addressSchema.parse(await req.json());
  try {
    const result = await validateAddress({ line1: a.line1, line2: a.line2, city: a.city, state: a.state, country: a.country, zip: a.zip });
    return NextResponse.json(result);
  } catch {
    // Country not supported for validation: carry on without it
    return NextResponse.json({ is_valid: true, skipped: true, validation_messages: [] });
  }
});
