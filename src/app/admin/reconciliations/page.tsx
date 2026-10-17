import Link from "next/link";
import { db } from "@/lib/db";
import { getReconciliations } from "@/lib/terminal/api";
import { formatMoney, toMinor } from "@/lib/money";
import { ErrorNote, PageTitle, Table, safe, td } from "../ui";

export default async function ReconciliationsPage() {
  const res = await safe(() => getReconciliations({ perPage: 100 }));
  const list = res.data?.reconciliations ?? [];
  const ours = await db.shipment.findMany({
    where: { terminalShipmentId: { in: list.map((r) => r.shipment_id) } },
    select: { id: true, code: true, terminalShipmentId: true, reconciliations: { select: { terminalId: true, customerPaid: true } } },
  });
  const byTid = new Map(ours.map((s) => [s.terminalShipmentId, s]));

  return (
    <div>
      <PageTitle
        title="Weight checks"
        subtitle="When a carrier re-weighs a parcel, Terminal bills the difference to your wallet. Customers see a 'Pay the difference' button on their shipment."
      />
      <ErrorNote error={res.error} />
      <Table head={["Shipment", "Type", "Declared → actual", "Extra charge", "Billed", "Customer paid"]}>
        {list.map((r) => {
          const s = byTid.get(r.shipment_id);
          const sd = (r.shipment_data as { declared_weight?: number; actual_weight?: number }[] | undefined)?.[0];
          const paid = s?.reconciliations.find((x) => x.terminalId === r.reconcilliation_id)?.customerPaid;
          return (
            <tr key={r.reconcilliation_id} className={r.voided ? "opacity-50" : ""}>
              <td className={td}>
                {s ? <Link className="font-mono font-semibold text-purple" href={`/admin/shipments/${s.id}`}>{s.code}</Link> : <span className="font-mono">{r.shipment_id}</span>}
              </td>
              <td className={`${td} capitalize`}>{r.charge_type}{r.voided ? " (voided)" : ""}</td>
              <td className={td}>{sd ? `${sd.declared_weight} kg → ${sd.actual_weight} kg` : "–"}</td>
              <td className={td}>{formatMoney(toMinor(r.total_exception_charge))}</td>
              <td className={td}>{r.is_charged ? "Yes" : "Not yet"}</td>
              <td className={td}>{paid ? "Yes" : "No"}</td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
