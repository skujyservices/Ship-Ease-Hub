import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings, WAREHOUSES, type WarehouseCode } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import type { ProcurementQuote, RequestItem } from "@/lib/inbound/procurement";
import { BuyForm } from "./BuyClient";
import { PROCUREMENT_LABEL } from "./labels";

export const metadata: Metadata = { title: "Buy for me" };


export default async function BuyPage() {
  const user = await requireUser("/app/ship/buy");
  const [settings, requests] = await Promise.all([
    getSettings(),
    db.procurementRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link href="/app/ship" className="text-sm font-semibold text-purple">← Ship</Link>
        <h1 className="mt-2 text-3xl font-light text-navy">Buy for me</h1>
      </div>

      <BuyForm feePercent={settings.procurementFeePercent} />

      {requests.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-medium text-navy">Your requests</h2>
          <ul className="space-y-2">
            {requests.map((r) => {
              const items = r.items as RequestItem[];
              const quote = r.quote as ProcurementQuote | null;
              const st = PROCUREMENT_LABEL[r.status] ?? PROCUREMENT_LABEL.REQUESTED;
              return (
                <li key={r.id}>
                  <Link href={`/app/ship/buy/${r.id}`} className="card flex items-center gap-4 transition hover:border-purple">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-navy">
                        {items.length} item{items.length > 1 ? "s" : ""} from {WAREHOUSES[r.warehouse as WarehouseCode]}
                      </span>
                      <span className="block truncate text-xs text-navy/60">{items.map((i) => new URL(i.url).hostname.replace("www.", "")).join(", ")}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <span className={`chip ${st.cls}`}>{st.label}</span>
                      {quote && <span className="text-sm font-semibold text-navy">{formatMoney(quote.totalMinor)}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
