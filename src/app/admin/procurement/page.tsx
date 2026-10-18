import Link from "next/link";
import { db } from "@/lib/db";
import { WAREHOUSES, type WarehouseCode } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import type { ProcurementQuote, RequestItem } from "@/lib/inbound/procurement";
import { PROCUREMENT_LABEL } from "@/app/app/ship/buy/labels";
import { PageTitle, Table, td } from "../ui";

const ORDER = ["REQUESTED", "PAID", "QUOTED", "PURCHASED", "CANCELLED"];

export default async function ProcurementQueue({ searchParams }: PageProps<"/admin/procurement">) {
  const { status } = await searchParams;
  const filter = typeof status === "string" ? status : "";
  const requests = await db.procurementRequest.findMany({
    where: filter ? { status: filter } : { status: { in: ["REQUESTED", "QUOTED", "PAID"] } },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  requests.sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));

  return (
    <div>
      <PageTitle title="Buy for me" subtitle="Quote new requests, then buy paid ones and enter the store's order number." />
      <div className="mb-4 flex flex-wrap gap-2">
        {[["", "Open"], ...Object.entries(PROCUREMENT_LABEL).map(([k, v]) => [k, v.label])].map(([k, label]) => (
          <Link key={k} href={`/admin/procurement${k ? `?status=${k}` : ""}`} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === k ? "bg-navy text-white" : "bg-white text-navy/70"}`}>
            {label}
          </Link>
        ))}
      </div>
      <Table head={["Requested", "Customer", "From", "Items", "Total", "Status"]}>
        {requests.map((r) => {
          const st = PROCUREMENT_LABEL[r.status];
          const quote = r.quote as ProcurementQuote | null;
          return (
            <tr key={r.id}>
              <td className={td}><Link href={`/admin/procurement/${r.id}`} className="font-semibold text-purple">{r.createdAt.toLocaleDateString("en-GB")}</Link></td>
              <td className={td}>{r.user.name}<span className="block font-mono text-xs text-navy/60">{r.user.suiteId}</span></td>
              <td className={td}>{WAREHOUSES[r.warehouse as WarehouseCode]}</td>
              <td className={td}>{(r.items as RequestItem[]).length}</td>
              <td className={td}>{quote ? formatMoney(quote.totalMinor) : "–"}</td>
              <td className={td}><span className={`chip ${st?.cls}`}>{st?.label ?? r.status}</span></td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
