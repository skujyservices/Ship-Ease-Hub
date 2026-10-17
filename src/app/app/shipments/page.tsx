import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { listTab } from "@/lib/status";
import { StatusChip } from "@/components/Status";

export const metadata: Metadata = { title: "Shipments" };

const TABS = [
  { key: "all", label: "All" },
  { key: "action", label: "Action needed" },
  { key: "warehouse", label: "At warehouse" },
  { key: "onway", label: "On the way" },
  { key: "done", label: "Delivered" },
] as const;

export default async function ShipmentsPage({ searchParams }: PageProps<"/app/shipments">) {
  const user = await requireUser("/app/shipments");
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "all";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const all = await db.shipment.findMany({
    where: {
      userId: user.id,
      ...(q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { trackingNumber: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const shipments = tab === "all" ? all : all.filter((s) => listTab(s.status) === tab);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-light text-navy">Shipments</h1>
        <form className="w-full sm:w-64">
          <input name="q" defaultValue={q} className="input" placeholder="Search by code" aria-label="Search shipments" />
          {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
        </form>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/app/shipments?tab=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${tab === t.key ? "bg-navy text-white" : "bg-white text-navy/70"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {shipments.length === 0 ? (
        <div className="card mt-6 text-center">
          <p className="font-semibold text-navy">{all.length ? "Nothing here." : "No shipments yet."}</p>
          <Link href="/app/ship/parcel" className="btn-primary mt-4">Send a parcel</Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {shipments.map((s) => {
            const to = s.toAddress as { city?: string; country?: string } | null;
            return (
              <li key={s.id}>
                <Link href={`/app/shipments/${s.id}`} className="card flex items-center gap-4 transition hover:border-purple">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-navy/60">{s.code}</p>
                    <p className="truncate font-semibold text-navy">
                      {s.kind === "OUTBOUND" ? `To ${to?.city ?? ""}, ${to?.country ?? ""}` : `From ${s.warehouse}`}
                    </p>
                    <p className="text-xs text-navy/60">
                      {s.carrierName ?? "Quote"} · {s.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusChip status={s.status} />
                    {s.totalMinor ? <span className="text-sm font-semibold text-navy">{formatMoney(s.totalMinor, s.currency)}</span> : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
