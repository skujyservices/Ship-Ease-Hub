import "server-only";
import type { Payment, PaymentPurpose } from "@prisma/client";
import { db } from "./db";
import { newReference, paystackInitialize, paystackRefund, paystackVerify, stripeCheckout, stripeRefund, stripeVerify } from "./payments";
import { bookPaidShipment } from "./outbound/service";

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

/** Starts a hosted checkout and records a PENDING payment. Returns the URL to send the customer to. */
export async function startCheckout(input: {
  userId: string;
  email: string;
  purpose: PaymentPurpose;
  amountMinor: number;
  currency: "NGN" | "GBP" | "USD";
  description: string;
  shipmentId?: string;
  procurementId?: string;
  returnPath: string;
}) {
  const reference = newReference("SEH");
  const callback = `${appUrl()}/api/payments/callback?reference=${reference}&next=${encodeURIComponent(input.returnPath)}`;

  const provider = input.currency === "NGN" ? "PAYSTACK" : "STRIPE";
  const started =
    provider === "PAYSTACK"
      ? await paystackInitialize({
          reference,
          email: input.email,
          amountMinor: input.amountMinor,
          callbackUrl: callback,
          metadata: { purpose: input.purpose, shipmentId: input.shipmentId },
        })
      : await stripeCheckout({
          reference,
          email: input.email,
          amountMinor: input.amountMinor,
          currency: input.currency as "GBP" | "USD",
          description: input.description,
          successUrl: callback,
          cancelUrl: `${appUrl()}${input.returnPath}`,
        });

  await db.payment.create({
    data: {
      reference,
      provider,
      purpose: input.purpose,
      amountMinor: input.amountMinor,
      currency: input.currency,
      userId: input.userId,
      shipmentId: input.shipmentId,
      procurementId: input.procurementId,
      raw: started.providerRef ? { sessionId: started.providerRef } : undefined,
    },
  });
  return started.redirectUrl;
}

/**
 * Verifies a payment with the provider and runs what it paid for. Safe to call
 * many times (redirect callback and webhooks both call it).
 */
export async function confirmPayment(reference: string): Promise<Payment | null> {
  const payment = await db.payment.findUnique({ where: { reference } });
  if (!payment) return null;

  if (payment.status === "PENDING") {
    const result =
      payment.provider === "PAYSTACK"
        ? await paystackVerify(reference)
        : await stripeVerify((payment.raw as { sessionId: string }).sessionId);

    const ok = result.paid && result.amountMinor >= payment.amountMinor && result.currency === payment.currency;
    await db.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: ok
        ? { status: "SUCCESS", paidAt: new Date(), raw: { ...((payment.raw as object) ?? {}), verify: result.raw as object } }
        : result.paid
          ? { status: "FAILED", raw: { mismatch: result.raw as object } }
          : {},
    });
  }

  const fresh = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
  if (fresh.status === "SUCCESS") await fulfil(fresh);
  return fresh;
}

async function fulfil(payment: Payment) {
  switch (payment.purpose) {
    case "SHIPMENT":
      if (payment.shipmentId) await bookPaidShipment(payment.shipmentId);
      break;
    case "WEIGHT_ADJUSTMENT":
      await db.reconciliation.updateMany({ where: { shipmentId: payment.shipmentId! }, data: { customerPaid: true } });
      break;
    // STORAGE_FEE and PROCUREMENT are fulfilled by the inbound flows
  }
}

export async function refundPayment(payment: Payment) {
  if (payment.status !== "SUCCESS") return;
  if (payment.provider === "PAYSTACK") await paystackRefund(payment.reference);
  else {
    const intent = (payment.raw as { verify?: { payment_intent?: string } })?.verify?.payment_intent;
    if (!intent) throw new Error("Stripe payment intent missing; refund from the Stripe dashboard.");
    await stripeRefund(intent);
  }
  await db.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED", refundedAt: new Date() } });
}
