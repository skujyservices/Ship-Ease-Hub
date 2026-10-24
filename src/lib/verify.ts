import "server-only";
import { headers } from "next/headers";
import { db } from "./db";
import { createToken } from "./tokens";
import { sendEmail } from "./notify";
import { HttpError, rateLimit } from "./http";

/**
 * Email ownership. A link is sent to the address; clicking it (see /verify/[token]) marks
 * the account verified, or switches it to `pendingEmail` when the customer changed address.
 */
export async function sendVerification(userId: string, to: string, change = false) {
  const token = await createToken(userId, "verify", 48);
  await sendEmail(to, {
    title: change ? "Confirm your new email address" : "Confirm your email for Ship Ease Hub",
    body: change
      ? "Tap the button to start using this address for your Ship Ease Hub account. The link works for 48 hours."
      : "Welcome! Tap the button to confirm your email so we can send you receipts and shipment updates. The link works for 48 hours.",
    url: `/verify/${token}`,
    cta: "Confirm email",
  });
}

/** Payments need a confirmed email (receipts and refunds go there), unless email isn't set up yet. */
export async function requireVerifiedEmail(userId: string) {
  if (!process.env.RESEND_API_KEY) return; // nothing could be confirmed without an email provider
  const u = await db.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
  if (!u?.emailVerifiedAt) throw new HttpError(403, "Please confirm your email address first. We sent you a link (check spam), or resend it from the banner at the top.");
}

/** Limits by client IP inside server actions (which have no Request object). */
export async function limitByIp(scope: string, limit: number, windowMs: number) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  await rateLimit(`${scope}:${ip}`, limit, windowMs);
}

export const tooMany = (e: unknown) => e instanceof HttpError && e.status === 429;
