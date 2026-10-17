import "server-only";
import crypto from "node:crypto";

/**
 * Paystack (NGN) and Stripe (GBP/USD) over their REST APIs.
 * Each provider exposes: start a checkout, verify a payment, refund, verify a webhook.
 */

export type CheckoutStart = { reference: string; redirectUrl: string; providerRef?: string };

// ---------------- Paystack ----------------

async function paystack<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`https://api.paystack.co${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json()) as { status: boolean; message: string; data: T };
  if (!res.ok || !json.status) throw new Error(`Paystack: ${json.message}`);
  return json.data;
}

export async function paystackInitialize(input: {
  reference: string;
  email: string;
  amountMinor: number;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<CheckoutStart> {
  const data = await paystack<{ authorization_url: string; reference: string }>("POST", "/transaction/initialize", {
    email: input.email,
    amount: input.amountMinor,
    currency: "NGN",
    reference: input.reference,
    callback_url: input.callbackUrl,
    metadata: input.metadata,
  });
  return { reference: data.reference, redirectUrl: data.authorization_url };
}

export async function paystackVerify(reference: string) {
  const data = await paystack<{ status: string; amount: number; currency: string }>(
    "GET",
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
  return { paid: data.status === "success", amountMinor: data.amount, currency: data.currency, raw: data };
}

export const paystackRefund = (reference: string, amountMinor?: number) =>
  paystack("POST", "/refund", { transaction: reference, amount: amountMinor });

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const expected = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// ---------------- Stripe ----------------

async function stripe<T>(method: string, path: string, form?: Record<string, string>): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
    cache: "no-store",
  });
  const json = (await res.json()) as T & { error?: { message: string } };
  if (!res.ok) throw new Error(`Stripe: ${json.error?.message ?? res.status}`);
  return json;
}

export async function stripeCheckout(input: {
  reference: string;
  email: string;
  amountMinor: number;
  currency: "GBP" | "USD";
  description: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutStart> {
  const session = await stripe<{ id: string; url: string }>("POST", "/checkout/sessions", {
    mode: "payment",
    customer_email: input.email,
    client_reference_id: input.reference,
    "metadata[reference]": input.reference,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": input.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(input.amountMinor),
    "line_items[0][price_data][product_data][name]": input.description,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });
  return { reference: input.reference, redirectUrl: session.url, providerRef: session.id };
}

export async function stripeVerify(sessionId: string) {
  const s = await stripe<{ payment_status: string; amount_total: number; currency: string; payment_intent: string }>(
    "GET",
    `/checkout/sessions/${sessionId}`,
  );
  return { paid: s.payment_status === "paid", amountMinor: s.amount_total, currency: s.currency.toUpperCase(), raw: s };
}

export const stripeRefund = (paymentIntent: string, amountMinor?: number) =>
  stripe("POST", "/refunds", { payment_intent: paymentIntent, ...(amountMinor ? { amount: String(amountMinor) } : {}) });

export function verifyStripeSignature(rawBody: string, header: string | null, toleranceSec = 300) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const v1 = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  return v1.some((sig) => sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

export const newReference = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`.toUpperCase();
