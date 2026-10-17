import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { STATUS } from "@/lib/status";
import { getSettings } from "@/lib/settings";
import { markup, type PriceLine } from "@/lib/outbound/pricing";
import { PhaseBars, StatusChip } from "@/components/Status";
import { EventList } from "@/components/EventList";
import { ShipmentActions } from "./ShipmentActions";

export const metadata: Metadata = { title: "Shipment" };

type Addr = { first_name: string; last_name: string; line1: string; city: string; state: string; country: string };

export default async function ShipmentPage({ params, searchParams }: PageProps<"/app/shipments/[id]">) {
  const user = await requireUser("/app/shipments");
  const { id } = await params;
  const { payment } = await searchParams;

  const s = await db.shipment.findUnique({
    where: { id },
    include: {
      events: { orderBy: { occurredAt: "desc" } },
      reconciliations: { where: { voided: false, customerPaid: false, extraChargeMinor: { gt: 0 } } },
      claims: true,
    },
  });
  if (!s || (s.userId !== user.id && user.role === "CUSTOMER")) notFound();

  const from = s.fromAddress as Addr | null;
  const to = s.toAddress as Addr | null;
  const pricing = (s.pricing as PriceLine[] | null) ?? [];
  const docs = (s.regulatoryDocs as { purchased?: { name: string; document_url?: string }[] } | null)?.purchased ?? [];
  const settings = await getSettings();
  const adjustment = s.reconciliations[0];

  const links = [
    { href: s.labelUrl, label: "Shipping label" },
    { href: s.invoiceUrl, label: "Commercial invoice" },
    { href: s.podUrl, label: "Proof of delivery" },
    ...docs.map((d) => ({ href: d.document_url, label: d.name })),
  ].filter((l): l is { href: string; label: string } => Boolean(l.href));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/app/shipments" className="text-sm font-semibold text-purple">← Shipments</Link>

      {payment === "paid" && <Banner tone="good">Payment received. We&apos;re booking your shipment now.</Banner>}
      {payment === "failed" && <Banner tone="bad">Your payment didn&apos;t go through. You weren&apos;t charged.</Banner>}
      {payment === "pending" && <Banner tone="warn">We&apos;re still confirming your payment. This page will update shortly.</Banner>}

      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-sm text-navy/60">{s.code}</p>
            <h1 className="text-xl font-bold text-navy">
              {from?.city ?? s.warehouse} → {to?.city ?? "Lagos"}, {to?.country ?? "NG"}
            </h1>
          </div>
          <StatusChip status={s.status} />
        </div>
        <PhaseBars status={s.status} />

        {s.status === STATUS.AWAITING_PAYMENT && (
          <Link href={`/app/ship/parcel?q=${s.id}`} className="btn-primary w-full">Complete payment</Link>
        )}
        {s.status === STATUS.DRAFT && (
          <Link href={`/app/ship/parcel?q=${s.id}`} className="btn-primary w-full">Choose a carrier</Link>
        )}
        {s.status === STATUS.BOOKING_FAILED && (
          <Banner tone="bad">
            Your payment went through, but the carrier booking hit a problem. Our team has been alerted and will fix it, or refund you in full.
          </Banner>
        )}

        {s.carrierName && (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-navy/60">Carrier</dt>
              <dd className="font-semibold text-navy">{s.carrierName}</dd>
            </div>
            {s.trackingNumber && (
              <div>
                <dt className="text-navy/60">Tracking number</dt>
                <dd className="font-semibold text-navy">
                  {s.carrierTrackingUrl ? (
                    <a href={s.carrierTrackingUrl} target="_blank" rel="noreferrer" className="text-purple">{s.trackingNumber}</a>
                  ) : (
                    s.trackingNumber
                  )}
                </dd>
              </div>
            )}
            {s.pickupOption && (
              <div>
                <dt className="text-navy/60">Collection</dt>
                <dd className="font-semibold capitalize text-navy">
                  {s.pickupOption.replace(/_/g, " ")}
                  {s.pickupDate ? ` · ${s.pickupDate}` : ""}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-navy/60">Share tracking</dt>
              <dd className="font-semibold text-navy">
                <Link href={`/track/${s.code}`} className="text-purple">/track/{s.code}</Link>
              </dd>
            </div>
          </dl>
        )}

        {links.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {links.map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="btn-ghost">
                ↓ {l.label}
              </a>
            ))}
          </div>
        )}
      </div>

      <ShipmentActions
        id={s.id}
        canCancel={[STATUS.BOOKED, STATUS.PICKUP_SCHEDULED, STATUS.AWAITING_PAYMENT, STATUS.DRAFT].includes(s.status as never)}
        canClaim={Boolean(s.insuranceId) && !s.claims.length && [STATUS.IN_TRANSIT, STATUS.DELIVERED, STATUS.RETURNED, STATUS.AWAITING_CLEARANCE].includes(s.status as never)}
        canRefresh={s.kind === "OUTBOUND" && [STATUS.BOOKED, STATUS.PICKUP_SCHEDULED, STATUS.IN_TRANSIT, STATUS.AWAITING_CLEARANCE].includes(s.status as never)}
        adjustmentDue={adjustment ? formatMoney(markup(adjustment.extraChargeMinor, { ...settings, outboundMarkupFixedMinor: 0 })) : null}
      />

      {s.claims.map((c) => (
        <Banner key={c.id} tone="warn">
          Insurance claim {c.terminalId}: {c.status}
        </Banner>
      ))}

      {pricing.length > 0 && (
        <div className="card space-y-2">
          <h2 className="mb-2 font-bold text-navy">Payment</h2>
          {pricing.map((l) => (
            <div key={l.key} className="flex justify-between text-sm">
              <span className="text-navy/70">{l.label}</span>
              <span className="text-navy">{formatMoney(l.minor, s.currency)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-silver pt-2 font-bold text-navy">
            <span>Total</span>
            <span>{formatMoney(s.totalMinor ?? 0, s.currency)}</span>
          </div>
        </div>
      )}

      {to && (
        <div className="card grid gap-4 text-sm sm:grid-cols-2">
          {[["From", from], ["To", to]].map(([label, a]) => {
            const ad = a as Addr | null;
            return ad ? (
              <div key={label as string}>
                <p className="label">{label as string}</p>
                <p className="font-semibold text-navy">{ad.first_name} {ad.last_name}</p>
                <p className="text-navy/70">{ad.line1}, {ad.city}, {ad.state}, {ad.country}</p>
              </div>
            ) : null;
          })}
        </div>
      )}

      <div className="card">
        <h2 className="mb-4 font-bold text-navy">Updates</h2>
        <EventList events={s.events} />
      </div>
    </div>
  );
}

function Banner({ tone, children }: { tone: "good" | "bad" | "warn"; children: React.ReactNode }) {
  const cls = { good: "bg-success/10 text-success", bad: "bg-danger/10 text-danger", warn: "bg-gold/20 text-navy" }[tone];
  return <p className={`rounded-xl px-4 py-3 text-sm font-medium ${cls}`}>{children}</p>;
}
