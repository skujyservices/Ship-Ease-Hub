import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ActionButton } from "./ActionButton";
import { markRefunded } from "./actions";
import { recentErrors } from "@/lib/housekeeping";
import { getWalletBalance } from "@/lib/terminal/api";
import { getSettings } from "@/lib/settings";
import { formatMoney, toMinor } from "@/lib/money";
import { STATUS } from "@/lib/status";
import { StatusChip } from "@/components/Status";
import { ErrorNote, PageTitle, safe } from "./ui";

export default async function AdminOverview() {
  const [wallet, settings, failed, counts, unprocessed, paidToday, errors, refundIssues] = await Promise.all([
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
    recentErrors(),
    db.payment.findMany({ where: { status: "SUCCESS", raw: { path: ["refundError"], not: Prisma.AnyNull } }, orderBy: { createdAt: "desc" }, take: 10 }),
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
        <Stat
          label="Needs attention"
          value={String(failed.length + unprocessed + refundIssues.length)}
          warn={failed.length + unprocessed + refundIssues.length > 0}
          hint={`${failed.length} booking failures · ${unprocessed} webhook errors · ${refundIssues.length} refunds to do by hand`}
        />
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

      {refundIssues.length > 0 && (
        <section className="card">
          <h2 className="mb-1 font-medium text-navy">Refunds to finish by hand</h2>
          <p className="mb-3 text-sm text-navy/60">The automatic refund failed. Refund these in Paystack/Stripe, then mark them refunded here.</p>
          <ul className="divide-y divide-silver/60 text-sm">
            {refundIssues.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                <span className="font-mono">{p.reference} · {p.provider}</span>
                <span className="flex items-center gap-3">
                  {formatMoney(p.amountMinor, p.currency)}
                  <ActionButton className="chip bg-mist text-navy" confirmText="Confirm you've refunded this in Paystack/Stripe?" action={markRefunded.bind(null, p.id)}>Mark refunded</ActionButton>
                </span>
                <span className="w-full text-xs text-danger">{String((p.raw as { refundError?: string }).refundError)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2 className="mb-1 font-medium text-navy">Server errors (last 7 days)</h2>
        {errors.length === 0 ? (
          <p className="text-sm text-navy/60">None. 🎉</p>
        ) : (
          <ul className="divide-y divide-silver/60 text-sm">
            {errors.map((e) => (
              <li key={e.id} className="py-2.5">
                <span className="font-mono text-xs text-navy/60">{e.createdAt.toLocaleString("en-GB")} · {e.routeType} · {e.path}</span>
                <span className="block text-danger">{e.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
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
