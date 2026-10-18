import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings, WAREHOUSES, type WarehouseCode } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { ORIGIN_CURRENCY, type ProcurementQuote, type RequestItem } from "@/lib/inbound/procurement";
import { PROCUREMENT_LABEL } from "@/app/app/ship/buy/labels";
import { ActionForm } from "../../ActionForm";
import { ActionButton } from "../../ActionButton";
import { PageTitle } from "../../ui";
import { cancelProcurement, markBought, sendQuote } from "../../inbound/actions";

export default async function ProcurementDetail({ params }: PageProps<"/admin/procurement/[id]">) {
  const { id } = await params;
  const r = await db.procurementRequest.findUnique({ where: { id }, include: { user: true } });
  if (!r) notFound();
  const settings = await getSettings();
  const items = r.items as RequestItem[];
  const quote = r.quote as ProcurementQuote | null;
  const currency = ORIGIN_CURRENCY[r.warehouse as WarehouseCode];
  const st = PROCUREMENT_LABEL[r.status];

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/admin/procurement" className="text-sm font-semibold text-purple">← Buy for me</Link>
      <PageTitle title={`${r.user.name} · ${WAREHOUSES[r.warehouse as WarehouseCode]}`} subtitle={`${r.user.email} · ${r.user.phone} · ${r.user.suiteId}`} />
      <span className={`chip ${st?.cls}`}>{st?.label}</span>

      {["REQUESTED", "QUOTED"].includes(r.status) && (
        <div className="card">
          <h2 className="mb-1 text-lg font-medium text-navy">{quote ? "Update quote" : "Write quote"}</h2>
          <p className="mb-4 text-sm text-navy/60">
            Prices in {currency}. We convert at ₦{settings.fxToNgn[currency].toLocaleString()} and add the {settings.procurementFeePercent}% fee. Quote holds 48 hours.
          </p>
          <ActionForm action={sendQuote.bind(null, r.id)} submit={quote ? "Send updated quote" : "Send quote"}>
            {items.map((it, i) => (
              <div key={i} className="grid gap-2 rounded-2xl bg-mist p-3 sm:grid-cols-[1fr_8rem]">
                <div className="min-w-0">
                  <a href={it.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold text-purple">{it.url}</a>
                  <p className="text-xs text-navy/60">× {it.quantity} · {[it.variant, it.notes].filter(Boolean).join(" · ") || "no notes"}</p>
                  <input name="label" aria-label="Item name for the customer" className="input mt-2" placeholder="Item name for the customer" defaultValue={quote?.items[i]?.label ?? ""} required />
                </div>
                <div>
                  <label className="label" htmlFor={`price-${i}`}>Unit price ({currency})</label>
                  <input id={`price-${i}`} name="unitPrice" type="number" min="0.01" step="0.01" className="input" defaultValue={quote?.items[i]?.unitPrice ?? ""} required />
                </div>
              </div>
            ))}
            <div className="max-w-xs">
              <label className="label" htmlFor="store-shipping">Store delivery + tax to warehouse ({currency})</label>
              <input id="store-shipping" name="storeShipping" type="number" min="0" step="0.01" className="input" defaultValue={quote?.storeShipping ?? 0} />
            </div>
          </ActionForm>
        </div>
      )}

      {quote && (
        <div className="card space-y-1 text-sm">
          <p>Items + delivery: <b>{formatMoney(quote.subtotalMinor)}</b></p>
          <p>Fee ({quote.feePercent}%): <b>{formatMoney(quote.feeMinor)}</b></p>
          <p>Customer pays: <b>{formatMoney(quote.totalMinor)}</b></p>
        </div>
      )}

      {r.status === "PAID" && (
        <div className="card">
          <h2 className="mb-3 text-lg font-medium text-navy">Bought it?</h2>
          <ActionForm action={markBought.bind(null, r.id)} submit="Mark as bought">
            <input name="storeOrderRef" className="input max-w-sm" placeholder="Store order number" required />
          </ActionForm>
        </div>
      )}
      {r.storeOrderRef && <p className="text-sm">Store order: <b>{r.storeOrderRef}</b></p>}

      {["REQUESTED", "QUOTED", "PAID"].includes(r.status) && (
        <ActionButton className="btn-danger" confirmText={r.status === "PAID" ? "Cancel and refund the customer?" : "Cancel this request?"} action={cancelProcurement.bind(null, r.id)}>
          {r.status === "PAID" ? "Cancel & refund" : "Cancel request"}
        </ActionButton>
      )}
    </div>
  );
}
