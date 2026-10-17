import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { STATUS, statusMeta } from "@/lib/status";
import { StatusChip } from "@/components/Status";
import { PageTitle, Table, td } from "../ui";

export default async function AdminShipments({ searchParams }: PageProps<"/admin/shipments">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const shipments = await db.shipment.findMany({
    where: {
      status: status ? status : { not: STATUS.DRAFT },
      ...(q
        ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { terminalShipmentId: { contains: q } }, { trackingNumber: { contains: q } }, { user: { email: { contains: q, mode: "insensitive" } } }] }
        : {}),
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageTitle title="Shipments" />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} className="input max-w-xs" placeholder="Code, Terminal ID, tracking, email" />
        <select name="status" defaultValue={status} className="input max-w-[200px]">
          <option value="">All (except quotes)</option>
          {Object.values(STATUS).map((s) => (
            <option key={s} value={s}>{statusMeta(s).label}</option>
          ))}
        </select>
        <button className="btn-primary">Filter</button>
      </form>
      <Table head={["Code", "Customer", "Route", "Carrier", "Total", "Status", "Created"]}>
        {shipments.map((s) => {
          const to = s.toAddress as { city?: string; country?: string } | null;
          return (
            <tr key={s.id}>
              <td className={td}><Link href={`/admin/shipments/${s.id}`} className="font-mono font-semibold text-purple">{s.code}</Link></td>
              <td className={td}>{s.user?.name ?? "Guest"}<span className="block text-xs text-navy/60">{s.user?.email}</span></td>
              <td className={td}>{s.kind === "OUTBOUND" ? `NG → ${to?.city ?? ""}, ${to?.country ?? ""}` : `${s.warehouse} → NG`}</td>
              <td className={td}>{s.carrierName ?? "–"}</td>
              <td className={td}>{s.totalMinor ? formatMoney(s.totalMinor, s.currency) : "–"}</td>
              <td className={td}><StatusChip status={s.status} /></td>
              <td className={td}>{s.createdAt.toLocaleDateString("en-GB")}</td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
