import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { STATUS, statusMeta } from "@/lib/status";
import { BulkClient } from "./BulkClient";

export const metadata: Metadata = { title: "Send many parcels" };

export default async function BulkPage({ searchParams }: PageProps<"/app/ship/bulk">) {
  const user = await requireUser("/app/ship/bulk");
  const { batch: batchId, payment } = await searchParams;
  const [saved, batches] = await Promise.all([
    db.savedAddress.findMany({ where: { userId: user.id, country: "NG" }, orderBy: { createdAt: "desc" } }),
    db.batch.findMany({ where: { userId: user.id }, include: { shipments: { select: { status: true, totalMinor: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link href="/app/ship" className="text-sm font-semibold text-purple">← Ship</Link>
        <h1 className="mt-2 text-3xl font-light text-navy">Send many parcels</h1>
        <p className="mt-2 text-navy/65">Upload a spreadsheet of orders, check the prices, and pay once. Each parcel gets its own label and tracking.</p>
      </div>

      {payment === "paid" && <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm text-success">Payment received. We&apos;re booking your parcels now. Labels appear under Shipments.</p>}

      <BulkClient
        saved={saved.map((a) => ({
          id: a.id, label: a.label, first_name: a.firstName, last_name: a.lastName, email: a.email, phone: a.phone,
          line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, country: a.country, zip: a.zip,
        }))}
      />

      {batches.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-medium text-navy">Previous uploads</h2>
          <ul className="space-y-2">
            {batches.map((b) => {
              const booked = b.shipments.filter((s) => statusMeta(s.status).phase > 1 || [STATUS.BOOKED, STATUS.PICKUP_SCHEDULED].includes(s.status as never)).length;
              const unpaid = b.shipments.filter((s) => s.status === STATUS.AWAITING_PAYMENT);
              return (
                <li key={b.id} className={`card flex flex-wrap items-center justify-between gap-2 text-sm ${b.id === batchId ? "border-purple" : ""}`}>
                  <span>
                    <span className="font-semibold text-navy">{b.name}</span>
                    <span className="block text-navy/60">{b.createdAt.toLocaleDateString("en-GB")} · {b.shipments.length} parcels · {booked} booked</span>
                  </span>
                  {unpaid.length > 0 && <span className="chip bg-gold/20 text-navy">{unpaid.length} unpaid · {formatMoney(unpaid.reduce((s, x) => s + (x.totalMinor ?? 0), 0))}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
