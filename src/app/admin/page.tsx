import Link from "next/link";
import { db } from "@/lib/db";
import { getWalletBalance } from "@/lib/terminal/api";
import { getSettings } from "@/lib/settings";
import { formatMoney, toMinor } from "@/lib/money";
import { STATUS } from "@/lib/status";
import { StatusChip } from "@/components/Status";
import { ErrorNote, PageTitle, safe } from "./ui";

export default async function AdminOverview() {
  const [wallet, settings, failed, counts, unprocessed, paidToday] = await Promise.all([
    safe(() => getWalletBalance()),
    getSettings(),
    db.shipment.findMany({ where: { status: STATUS.BOOKING_FAILED }, orderBy: { updatedAt: "desc" }, take: 10 }),
    db.shipment.groupBy({ by: ["status"], where: { kind: "OUTBOUND" }, _count: true }),
    db.webhookEvent.count({ where: { source: "terminal", processedAt: null } }),
    db.payment.aggregate({
      where: { status: "SUCCESS", paidAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      _sum: { amountMinor: true },
      _count: true,
    }),
  ]);
  const balanceMinor = wallet.data ? toMinor(wallet.data.amount) : null;
  const low = balanceMinor !== null && balanceMinor < settings.terminalLowBalanceMinor;
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="space-y-6">
      <PageTitle title="Overview" subtitle={`Terminal environment: ${process.env.TERMINAL_ENV === "live" ? "LIVE" : "sandbox"}`} />
      <ErrorNote error={wallet.error} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Terminal wallet" value={balanceMinor === null ? "–" : formatMoney(balanceMinor, wallet.data?.currency)} warn={low} hint={low ? "Top up on terminal.africa: bookings will fail when it runs out" : "Pays for every booking"} />
        <Stat label="Paid today" value={formatMoney(paidToday._sum.amountMinor ?? 0)} hint={`${paidToday._count} payments`} />
        <Stat label="In transit" value={String(count(STATUS.IN_TRANSIT) + count(STATUS.AWAITING_CLEARANCE))} hint={`${count(STATUS.AWAITING_CLEARANCE)} in customs`} />
        <Stat label="Needs attention" value={String(failed.length + unprocessed)} warn={failed.length + unprocessed > 0} hint={`${failed.length} booking failures · ${unprocessed} webhook errors`} />
      </div>

      {failed.length > 0 && (
        <section className="card">
          <h2 className="mb-3 font-bold text-navy">Paid but not booked</h2>
          <ul className="divide-y divide-silver/60">
            {failed.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <Link href={`/admin/shipments/${s.id}`} className="font-mono font-semibold text-purple">{s.code}</Link>
                  <span className="block text-danger">{s.bookingError}</span>
                </span>
                <StatusChip status={s.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, hint, warn }: { label: string; value: string; hint?: string; warn?: boolean }) {
  return (
    <div className={`card ${warn ? "border-gold bg-gold/10" : ""}`}>
      <p className="label">{label}</p>
      <p className="text-2xl font-bold text-navy">{value}</p>
      {hint && <p className="mt-1 text-xs text-navy/60">{hint}</p>}
    </div>
  );
}
