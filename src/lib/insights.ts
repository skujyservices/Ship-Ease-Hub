import "server-only";
import { db } from "./db";
import { STATUS } from "./status";
import type { QuotedRate } from "./outbound/service";

/** Numbers behind the customer and admin insights pages. Money in minor units (NGN). */

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export function lastMonths(n: number, now = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { key: monthKey(d), label: d.toLocaleDateString("en-GB", { month: "short" }) };
  });
}

export function lastDays(n: number, now = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getTime() - (n - 1 - i) * 86_400_000);
    return { key: dayKey(d), label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) };
  });
}

const NGN = (p: { currency: string; amountMinor: number }) => (p.currency === "NGN" ? p.amountMinor : 0);

export async function customerInsights(userId: string) {
  const since = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);
  const [payments, shipments] = await Promise.all([
    db.payment.findMany({ where: { userId, status: "SUCCESS", paidAt: { gte: since } }, select: { amountMinor: true, currency: true, paidAt: true } }),
    db.shipment.findMany({ where: { userId, status: { notIn: [STATUS.DRAFT, STATUS.CANCELLED] } }, select: { kind: true, status: true, toAddress: true, warehouse: true } }),
  ]);
  const months = lastMonths(6).map((m) => ({ ...m, value: payments.filter((p) => monthKey(p.paidAt!) === m.key).reduce((s, p) => s + NGN(p), 0) }));
  const destinations = new Map<string, number>();
  for (const s of shipments.filter((x) => x.kind === "OUTBOUND")) {
    const c = (s.toAddress as { country?: string } | null)?.country ?? "?";
    destinations.set(c, (destinations.get(c) ?? 0) + 1);
  }
  return {
    months,
    thisMonthMinor: months.at(-1)!.value,
    sent: shipments.filter((s) => s.kind === "OUTBOUND").length,
    received: shipments.filter((s) => s.kind === "INBOUND").length,
    delivered: shipments.filter((s) => [STATUS.DELIVERED, STATUS.COLLECTED].includes(s.status as never)).length,
    topDestinations: [...destinations.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
  };
}

export async function businessInsights(days: number) {
  const since = new Date(Date.now() - days * 86_400_000);
  const [payments, outbound, inbound, refunds] = await Promise.all([
    db.payment.findMany({ where: { status: "SUCCESS", paidAt: { gte: since } }, select: { amountMinor: true, currency: true, paidAt: true, purpose: true } }),
    db.shipment.findMany({
      where: { kind: "OUTBOUND", createdAt: { gte: since }, status: { notIn: [STATUS.DRAFT, STATUS.AWAITING_PAYMENT, STATUS.CANCELLED, STATUS.BOOKING_FAILED] } },
      select: { totalMinor: true, selectedRate: true, toAddress: true, carrierName: true, pricing: true },
    }),
    db.shipment.findMany({
      where: { kind: "INBOUND", createdAt: { gte: since }, status: { notIn: [STATUS.AWAITING_PAYMENT, STATUS.CANCELLED] } },
      select: { totalMinor: true, warehouse: true, chargeableKg: true, storageFeePaidMinor: true },
    }),
    db.payment.aggregate({ where: { status: "REFUNDED", refundedAt: { gte: since } }, _sum: { amountMinor: true } }),
  ]);

  const revenueNgn = payments.reduce((s, p) => s + NGN(p), 0);
  const foreign = payments.filter((p) => p.currency !== "NGN");
  const byPurpose = new Map<string, number>();
  for (const p of payments) byPurpose.set(p.purpose, (byPurpose.get(p.purpose) ?? 0) + NGN(p));

  // Outbound margin: what customers paid vs what Terminal charges (rate + duty + extras passed through)
  let outRevenue = 0;
  let outCost = 0;
  const dest = new Map<string, { n: number; revenue: number }>();
  const carriers = new Map<string, { n: number; revenue: number }>();
  for (const s of outbound) {
    const r = s.selectedRate as QuotedRate | null;
    if (!r) continue; // no Terminal cost on record: leave out rather than overstate margin
    const lines = (s.pricing as { key: string; minor: number }[] | null) ?? [];
    const passThrough = lines.filter((l) => l.key !== "shipping" && l.key !== "priority").reduce((sum, l) => sum + l.minor, 0);
    const priority = r?.priorityPickupMinor && lines.some((l) => l.key === "priority") ? r.priorityPickupMinor : 0;
    outRevenue += s.totalMinor ?? 0;
    outCost += (r?.shippingMinor ?? 0) + priority + passThrough;
    const c = (s.toAddress as { country?: string } | null)?.country ?? "?";
    dest.set(c, { n: (dest.get(c)?.n ?? 0) + 1, revenue: (dest.get(c)?.revenue ?? 0) + (s.totalMinor ?? 0) });
    const k = s.carrierName ?? "?";
    carriers.set(k, { n: (carriers.get(k)?.n ?? 0) + 1, revenue: (carriers.get(k)?.revenue ?? 0) + (s.totalMinor ?? 0) });
  }

  const warehouses = new Map<string, { n: number; kg: number; revenue: number }>();
  for (const s of inbound) {
    const w = s.warehouse ?? "?";
    const cur = warehouses.get(w) ?? { n: 0, kg: 0, revenue: 0 };
    warehouses.set(w, { n: cur.n + 1, kg: cur.kg + (s.chargeableKg ?? 0), revenue: cur.revenue + (s.totalMinor ?? 0) });
  }

  const daily = lastDays(Math.min(days, 31)).map((d) => ({ ...d, value: payments.filter((p) => dayKey(p.paidAt!) === d.key).reduce((s, p) => s + NGN(p), 0) }));

  return {
    revenueNgn,
    foreignPayments: foreign.length,
    refundsMinor: refunds._sum.amountMinor ?? 0,
    byPurpose: [...byPurpose.entries()],
    outbound: { count: outbound.length, revenue: outRevenue, cost: outCost, margin: outRevenue - outCost },
    inbound: { count: inbound.length, kg: inbound.reduce((s, x) => s + (x.chargeableKg ?? 0), 0) },
    destinations: [...dest.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 8),
    carriers: [...carriers.entries()].sort((a, b) => b[1].revenue - a[1].revenue),
    warehouses: [...warehouses.entries()],
    daily,
  };
}
