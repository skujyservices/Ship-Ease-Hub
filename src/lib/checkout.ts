import "server-only";
import type { Payment, PaymentPurpose } from "@prisma/client";
import { db } from "./db";
import { newReference, paystackInitialize, paystackRefund, paystackVerify, stripeCheckout, stripeRefund, stripeVerify } from "./payments";
import { bookPaidShipment, purchaseSelectedDocuments } from "./outbound/service";
import { markInboundPaid } from "./inbound/service";
import { markProcurementPaid } from "./inbound/procurement";
import { sendEmail } from "./notify";
import { formatMoney } from "./money";
import { STATUS } from "./status";

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
  batchId?: string;
  shipmentIds?: string[]; // batch payments: exactly what this payment covers
  docTypes?: string[]; // DOCUMENTS payments: which documents to buy
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
          metadata: { purpose: input.purpose, shipmentId: input.shipmentId, batchId: input.batchId },
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
      batchId: input.batchId,
      raw: { ...(started.providerRef ? { sessionId: started.providerRef } : {}), ...(input.shipmentIds ? { shipmentIds: input.shipmentIds } : {}), ...(input.docTypes ? { docTypes: input.docTypes } : {}) },
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

/** Runs what a successful payment bought, exactly once (claimed atomically via fulfilledAt). */
async function fulfil(payment: Payment) {
  const claimed = await db.payment.updateMany({ where: { id: payment.id, fulfilledAt: null }, data: { fulfilledAt: new Date() } });
  if (claimed.count === 0) return;

  switch (payment.purpose) {
    case "SHIPMENT":
      if (payment.batchId) {
        const covered = (payment.raw as { shipmentIds?: string[] } | null)?.shipmentIds ?? [];
        const items = await db.shipment.findMany({ where: { batchId: payment.batchId, id: { in: covered }, status: STATUS.AWAITING_PAYMENT } });
        for (const s of items) await bookPaidShipment(s.id);
      } else if (payment.shipmentId) {
        const s = await db.shipment.findUniqueOrThrow({ where: { id: payment.shipmentId } });
        if (s.kind === "INBOUND") await markInboundPaid(s.id);
        else await bookPaidShipment(s.id);
      }
      break;
    case "WEIGHT_ADJUSTMENT":
      await db.reconciliation.updateMany({ where: { shipmentId: payment.shipmentId! }, data: { customerPaid: true } });
      break;
    case "STORAGE_FEE":
      await db.shipment.update({ where: { id: payment.shipmentId! }, data: { storageFeePaidMinor: { increment: payment.amountMinor } } });
      break;
    case "PROCUREMENT":
      if (payment.procurementId) await markProcurementPaid(payment.procurementId);
      break;
    case "DOCUMENTS": {
      const types = (payment.raw as { docTypes?: string[] } | null)?.docTypes ?? [];
      const s = await db.shipment.findUniqueOrThrow({ where: { id: payment.shipmentId! } });
      await db.shipment.update({ where: { id: s.id }, data: { regulatoryDocs: { ...((s.regulatoryDocs as object) ?? {}), selected: types } } });
      await purchaseSelectedDocuments(s.id);
      break;
    }
  }

  const user = await db.user.findUnique({ where: { id: payment.userId }, select: { email: true } });
  if (user)
    await sendEmail(user.email, {
      title: `Receipt ${payment.reference}`,
      body: "Thank you. Your payment was successful.",
      lines: [
        ["Amount", formatMoney(payment.amountMinor, payment.currency)],
        ["For", PURPOSE_LABEL[payment.purpose]],
        ["Reference", payment.reference],
      ],
      url: `/app/receipts/${payment.id}`,
      cta: "View receipt",
    }).catch((e) => console.error("receipt email failed", e));
}

export const PURPOSE_LABEL: Record<PaymentPurpose, string> = {
  SHIPMENT: "Shipping",
  STORAGE_FEE: "Storage fee",
  PROCUREMENT: "Buy for me order",
  WEIGHT_ADJUSTMENT: "Weight adjustment",
  DOCUMENTS: "Customs documents",
};

/** Refund, but never undo the action that caused it: a failed refund is recorded for staff to finish by hand. */
export async function tryRefund(payment: Payment): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await refundPayment(payment);
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("refund failed", payment.reference, error);
    await db.payment.update({ where: { id: payment.id }, data: { raw: { ...((payment.raw as object) ?? {}), refundError: error } } });
    return { ok: false, error };
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
