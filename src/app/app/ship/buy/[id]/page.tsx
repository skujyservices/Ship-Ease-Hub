import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { WAREHOUSES, type WarehouseCode } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import type { ProcurementQuote, RequestItem } from "@/lib/inbound/procurement";
import { BuyActions } from "../BuyClient";
import { PROCUREMENT_LABEL } from "../labels";

export const metadata: Metadata = { title: "Buy for me request" };

const money = (n: number, c: string) => new Intl.NumberFormat("en-GB", { style: "currency", currency: c }).format(n);

export default async function BuyRequestPage({ params, searchParams }: PageProps<"/app/ship/buy/[id]">) {
  const user = await requireUser("/app/ship/buy");
  const { id } = await params;
  const { payment } = await searchParams;
  const r = await db.procurementRequest.findUnique({ where: { id } });
  if (!r || (r.userId !== user.id && user.role === "CUSTOMER")) notFound();

  const items = r.items as RequestItem[];
  const quote = r.quote as ProcurementQuote | null;
  const st = PROCUREMENT_LABEL[r.status] ?? PROCUREMENT_LABEL.REQUESTED;
  // eslint-disable-next-line react-hooks/purity -- request-time comparison in a server component
  const expired = r.quoteExpiresAt ? r.quoteExpiresAt.getTime() < Date.now() : false;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/app/ship/buy" className="text-sm font-semibold text-purple">← Buy for me</Link>
      {payment === "paid" && <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm text-success">Payment received. We&apos;ll place your order shortly.</p>}

      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-light text-navy">Order from {WAREHOUSES[r.warehouse as WarehouseCode]}</h1>
          <span className={`chip ${st.cls}`}>{st.label}</span>
        </div>
        <ul className="divide-y divide-silver/60">
          {items.map((it, i) => (
            <li key={i} className="flex items-start justify-between gap-3 py-3 text-sm">
              <span className="min-w-0">
                <a href={it.url} target="_blank" rel="noreferrer" className="block truncate font-semibold text-purple">{quote?.items[i]?.label ?? it.url}</a>
                <span className="text-navy/60">{[it.variant, it.notes].filter(Boolean).join(" · ") || "No notes"}</span>
              </span>
              <span className="shrink-0 text-navy/70">
                × {it.quantity}
                {quote && <span className="block text-right font-medium text-navy">{money(quote.items[i].unitPrice * it.quantity, quote.currency)}</span>}
              </span>
            </li>
          ))}
        </ul>
        {r.status === "REQUESTED" && <p className="text-sm text-navy/60">We&apos;re checking prices with the store. You&apos;ll get a quote by email and WhatsApp.</p>}
        {r.storeOrderRef && <p className="text-sm text-navy/70">Store order: <b>{r.storeOrderRef}</b>. Track it under <Link href="/app/ship/abroad" className="font-semibold text-purple">Ship from abroad</Link>.</p>}
      </div>

      {quote && (
        <div className="card space-y-2 text-sm">
          <h2 className="mb-1 text-lg font-medium text-navy">Quote</h2>
          <div className="flex justify-between"><span className="text-navy/70">Store delivery &amp; tax to our warehouse</span><span>{money(quote.storeShipping, quote.currency)}</span></div>
          <div className="flex justify-between"><span className="text-navy/70">Items + delivery in naira (rate ₦{quote.fxRate.toLocaleString()} / {quote.currency})</span><span>{formatMoney(quote.subtotalMinor)}</span></div>
          <div className="flex justify-between"><span className="text-navy/70">Service fee ({quote.feePercent}%)</span><span>{formatMoney(quote.feeMinor)}</span></div>
          <div className="flex justify-between border-t border-silver pt-2 text-base font-semibold text-navy"><span>Total</span><span>{formatMoney(quote.totalMinor)}</span></div>
          {r.status === "QUOTED" && r.quoteExpiresAt && (
            <p className={`text-xs ${expired ? "text-danger" : "text-navy/60"}`}>
              {expired ? "This quote has expired. We'll send an updated one." : `Price held until ${r.quoteExpiresAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.`}
            </p>
          )}
          <p className="text-xs text-navy/60">Shipping to Lagos is paid when your items reach our warehouse.</p>
        </div>
      )}

      <BuyActions id={r.id} canPay={r.status === "QUOTED" && !expired} canCancel={["REQUESTED", "QUOTED"].includes(r.status)} />
    </div>
  );
}
