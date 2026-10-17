import "server-only";
import crypto from "node:crypto";

/**
 * Terminal signs the exact raw request body with HMAC-SHA512 using the secret key,
 * sent as hex in the X-Terminal-Signature header.
 */
export function verifyTerminalSignature(rawBody: string, signature: string | null): boolean {
  const key = process.env.TERMINAL_SECRET_KEY;
  if (!key || !signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = crypto.createHmac("sha512", key).update(rawBody, "utf8").digest();
  return crypto.timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
