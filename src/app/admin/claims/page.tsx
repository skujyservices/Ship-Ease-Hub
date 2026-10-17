import Link from "next/link";
import { db } from "@/lib/db";
import { getClaims } from "@/lib/terminal/api";
import { ErrorNote, PageTitle, Table, safe, td } from "../ui";

export default async function ClaimsPage() {
  const res = await safe(() => getClaims({ perPage: 100 }));
  const local = await db.claim.findMany({ include: { shipment: { select: { id: true, code: true } } } });
  const byId = new Map(local.map((c) => [c.terminalId, c]));

  return (
    <div>
      <PageTitle title="Insurance claims" subtitle="Customers file claims from their shipment page; Terminal handles them with the insurer." />
      <ErrorNote error={res.error} />
      <Table head={["Claim", "Shipment", "Reason", "Description", "Status", "Filed"]}>
        {(res.data?.claims ?? []).map((c) => {
          const mine = byId.get(c.claim_id);
          return (
            <tr key={c.claim_id}>
              <td className={`${td} font-mono`}>{c.claim_id}</td>
              <td className={td}>
                {mine ? <Link className="font-mono font-semibold text-purple" href={`/admin/shipments/${mine.shipment.id}`}>{mine.shipment.code}</Link> : "–"}
              </td>
              <td className={td}>{c.reason}</td>
              <td className={`${td} max-w-sm text-navy/70`}>{String(c.description ?? "")}</td>
              <td className={`${td} capitalize`}>{c.status}</td>
              <td className={td}>{c.created_at ? new Date(String(c.created_at)).toLocaleDateString("en-GB") : ""}</td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
