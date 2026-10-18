import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSettings, WAREHOUSES, type WarehouseCode } from "@/lib/settings";
import { notifyUser } from "@/lib/notify";
import { formatMoney } from "@/lib/money";

/**
 * Buy for me: customer sends product links → staff quote (items + store shipping + 5% fee, in NGN)
 * → customer pays → staff buy → an EXPECTED package appears at the warehouse → Shop & Ship from there.
 */

export const ORIGIN_CURRENCY = { US: "USD", GB: "GBP", CN: "CNY" } as const;

export const requestItemSchema = z.object({
  url: z.url("Paste the full product link"),
  variant: z.string().trim().max(200).default(""),
  quantity: z.number().int().min(1).max(50),
  notes: z.string().trim().max(500).default(""),
});
export type RequestItem = z.infer<typeof requestItemSchema>;

export const requestSchema = z.object({
  warehouse: z.enum(["US", "GB", "CN"]),
  items: z.array(requestItemSchema).min(1, "Add at least one item").max(20),
});

export type ProcurementQuote = {
  currency: "USD" | "GBP" | "CNY";
  items: { url: string; label: string; unitPrice: number; quantity: number }[];
  storeShipping: number; // store's own shipping + tax to our warehouse, origin currency
  fxRate: number; // NGN per unit of origin currency
  subtotalMinor: number; // NGN
  feePercent: number;
  feeMinor: number;
  totalMinor: number;
};

export async function createRequest(userId: string, input: z.infer<typeof requestSchema>) {
  return db.procurementRequest.create({ data: { userId, warehouse: input.warehouse, items: input.items, status: "REQUESTED" } });
}

export const quoteInputSchema = z.object({
  items: z.array(z.object({ label: z.string().trim().min(1), unitPrice: z.number().positive() })),
  storeShipping: z.number().min(0),
});

export async function quoteRequest(id: string, input: z.infer<typeof quoteInputSchema>) {
  const s = await getSettings();
  const req = await db.procurementRequest.findUniqueOrThrow({ where: { id } });
  const items = req.items as RequestItem[];
  if (input.items.length !== items.length) throw new Error("Price every item.");
  const currency = ORIGIN_CURRENCY[req.warehouse as WarehouseCode];
  const fxRate = s.fxToNgn[currency];
  const originTotal = input.items.reduce((sum, it, i) => sum + it.unitPrice * items[i].quantity, 0) + input.storeShipping;
  const subtotalMinor = Math.round(originTotal * fxRate * 100);
  const feeMinor = Math.round(subtotalMinor * (s.procurementFeePercent / 100));
  const quote: ProcurementQuote = {
    currency,
    items: input.items.map((it, i) => ({ url: items[i].url, label: it.label, unitPrice: it.unitPrice, quantity: items[i].quantity })),
    storeShipping: input.storeShipping,
    fxRate,
    subtotalMinor,
    feePercent: s.procurementFeePercent,
    feeMinor,
    totalMinor: subtotalMinor + feeMinor,
  };
  const updated = await db.procurementRequest.update({
    where: { id },
    data: { status: "QUOTED", quote, quoteExpiresAt: new Date(Date.now() + 48 * 3600_000) },
  });
  await notifyUser(req.userId, {
    title: "Your Buy for me quote is ready",
    body: `Total ${formatMoney(quote.totalMinor)} including our ${s.procurementFeePercent}% fee. The price holds for 48 hours.`,
    url: `/app/ship/buy/${id}`,
    cta: "Review and pay",
  });
  return updated;
}

export async function markProcurementPaid(id: string) {
  const req = await db.procurementRequest.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });
  await notifyUser(req.userId, {
    title: "Payment received for your Buy for me order",
    body: "We'll place your order with the store and let you know when it's bought.",
    url: `/app/ship/buy/${id}`,
  });
}

export async function markPurchased(id: string, storeOrderRef: string) {
  const req = await db.procurementRequest.findUniqueOrThrow({ where: { id } });
  if (req.status !== "PAID") throw new Error("Only paid requests can be marked as bought.");
  const quote = req.quote as ProcurementQuote;
  await db.$transaction([
    db.procurementRequest.update({ where: { id }, data: { status: "PURCHASED", storeOrderRef } }),
    db.package.create({
      data: {
        userId: req.userId,
        warehouse: req.warehouse,
        status: "EXPECTED",
        store: "Buy for me",
        storeTracking: storeOrderRef,
        description: quote.items.map((i) => `${i.quantity} × ${i.label}`).join(", "),
        procurementId: id,
      },
    }),
  ]);
  await notifyUser(req.userId, {
    title: "We've bought your items",
    body: `Your order is on its way to our ${WAREHOUSES[req.warehouse as WarehouseCode]} warehouse. We'll tell you when it arrives so you can ship it to Lagos.`,
    url: "/app/ship/abroad",
  });
}
