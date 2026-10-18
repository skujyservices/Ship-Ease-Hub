import Link from "next/link";
import { businessInsights } from "@/lib/insights";
import { formatMoney } from "@/lib/money";
import { WAREHOUSES, type WarehouseCode } from "@/lib/settings";
import { PURPOSE_LABEL } from "@/lib/checkout";
import { BarChart } from "@/components/BarChart";
import { PageTitle, Table, td } from "../ui";

const RANGES = [7, 30, 90] as const;
const short = (minor: number) => (minor >= 1_000_000_00 ? `₦${(minor / 1_000_000_00).toFixed(1)}m` : minor >= 100_000_00 ? `₦${Math.round(minor / 100_000_00)}k` : formatMoney(minor));

export default async function InsightsPage({ searchParams }: PageProps<"/admin/insights">) {
  const { days } = await searchParams;
  const range = RANGES.includes(Number(days) as never) ? Number(days) : 30;
  const d = await businessInsights(range);
  const marginPct = d.outbound.revenue ? Math.round((d.outbound.margin / d.outbound.revenue) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle title="Insights" subtitle="Revenue, margin and volume. Naira payments only; GBP/USD payments are counted separately." />
        <div className="mb-6 flex gap-1 rounded-full bg-white p-1 text-sm font-semibold">
          {RANGES.map((r) => (
            <Link key={r} href={`/admin/insights?days=${r}`} className={`rounded-full px-4 py-1.5 ${r === range ? "bg-navy text-white" : "text-navy/60"}`}>
              {r} days
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Revenue (₦)" value={formatMoney(d.revenueNgn)} hint={`${d.foreignPayments} payments in £/$ not included`} />
        <Tile label="Send-a-parcel margin" value={formatMoney(d.outbound.margin)} hint={`${marginPct}% of ${formatMoney(d.outbound.revenue)} · ${d.outbound.count} parcels`} />
        <Tile label="Shop & Ship" value={`${d.inbound.count} shipments`} hint={`${d.inbound.kg.toFixed(1)} kg billed`} />
        <Tile label="Refunds" value={formatMoney(d.refundsMinor)} hint={`in the last ${range} days`} />
      </div>

      <section className="card">
        <p className="mb-4 font-medium text-navy">Naira revenue per day</p>
        <BarChart data={d.daily} format={short} label={`Naira revenue per day, last ${d.daily.length} days`} height={180} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-medium text-navy">Revenue by service</h2>
          <Table head={["Service", "Revenue"]}>
            {d.byPurpose.map(([k, v]) => (
              <tr key={k}><td className={td}>{PURPOSE_LABEL[k as keyof typeof PURPOSE_LABEL] ?? k}</td><td className={`${td} text-right`}>{formatMoney(v)}</td></tr>
            ))}
          </Table>
        </section>
        <section>
          <h2 className="mb-3 font-medium text-navy">Top destinations (sent)</h2>
          <Table head={["Country", "Parcels", "Revenue"]}>
            {d.destinations.map(([c, v]) => (
              <tr key={c}><td className={td}>{c}</td><td className={td}>{v.n}</td><td className={`${td} text-right`}>{formatMoney(v.revenue)}</td></tr>
            ))}
          </Table>
        </section>
        <section>
          <h2 className="mb-3 font-medium text-navy">Carriers</h2>
          <Table head={["Carrier", "Parcels", "Revenue"]}>
            {d.carriers.map(([c, v]) => (
              <tr key={c}><td className={td}>{c}</td><td className={td}>{v.n}</td><td className={`${td} text-right`}>{formatMoney(v.revenue)}</td></tr>
            ))}
          </Table>
        </section>
        <section>
          <h2 className="mb-3 font-medium text-navy">Shop &amp; Ship by warehouse</h2>
          <Table head={["Warehouse", "Shipments", "Kg", "Revenue"]}>
            {d.warehouses.map(([w, v]) => (
              <tr key={w}><td className={td}>{WAREHOUSES[w as WarehouseCode] ?? w}</td><td className={td}>{v.n}</td><td className={td}>{v.kg.toFixed(1)}</td><td className={`${td} text-right`}>{formatMoney(v.revenue)}</td></tr>
            ))}
          </Table>
        </section>
      </div>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <p className="label">{label}</p>
      <p className="font-display text-2xl font-medium text-navy">{value}</p>
      {hint && <p className="mt-1 text-xs text-navy/60">{hint}</p>}
    </div>
  );
}
