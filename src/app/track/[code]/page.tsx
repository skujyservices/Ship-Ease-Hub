import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { PhaseBars, StatusChip } from "@/components/Status";
import { EventList } from "@/components/EventList";
import { refreshTracking } from "@/lib/outbound/service";
import { STATUS } from "@/lib/status";

export const metadata: Metadata = { title: "Tracking" };

const LIVE = [STATUS.BOOKED, STATUS.PICKUP_SCHEDULED, STATUS.IN_TRANSIT, STATUS.AWAITING_CLEARANCE] as string[];

// Public: recipients track without logging in. Only city/country and events are shown.
export default async function TrackPage({ params }: PageProps<"/track/[code]">) {
  const { code } = await params;
  let shipment = await db.shipment.findUnique({ where: { code: decodeURIComponent(code).toUpperCase() } });

  // Webhooks keep this fresh; poll Terminal as a fallback if it's gone quiet for 30 minutes
  if (shipment?.kind === "OUTBOUND" && LIVE.includes(shipment.status)) {
    shipment = await refreshTracking(shipment.id, 30 * 60_000).catch(() => shipment);
  }

  const visible = shipment && ![STATUS.DRAFT, STATUS.AWAITING_PAYMENT, STATUS.CANCELLED].includes(shipment.status as never);
  const events = visible ? await db.shipmentEvent.findMany({ where: { shipmentId: shipment!.id }, orderBy: { occurredAt: "desc" } }) : [];
  const to = shipment?.toAddress as { city?: string; country?: string } | null;
  const from = shipment?.fromAddress as { city?: string; country?: string } | null;

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-mist px-4 py-10">
        <div className="mx-auto max-w-xl space-y-4">
          {!visible ? (
            <div className="card text-center">
              <p className="font-semibold text-navy">We couldn&apos;t find a shipment with code {decodeURIComponent(code)}.</p>
              <p className="mt-1 text-sm text-navy/60">Check the code and try again.</p>
              <Link href="/track" className="btn-ghost mt-4">Try another code</Link>
            </div>
          ) : (
            <>
              <div className="card space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm text-navy/60">{shipment!.code}</p>
                    <p className="text-lg font-bold text-navy">
                      {from?.city}, {from?.country} → {to?.city}, {to?.country}
                    </p>
                  </div>
                  <StatusChip status={shipment!.status} />
                </div>
                <PhaseBars status={shipment!.status} />
                {shipment!.carrierName && (
                  <p className="text-sm text-navy/70">
                    {shipment!.carrierName}
                    {shipment!.trackingNumber && <> · {shipment!.trackingNumber}</>}
                    {shipment!.carrierTrackingUrl && (
                      <> · <a href={shipment!.carrierTrackingUrl} className="font-semibold text-purple" target="_blank" rel="noreferrer">Carrier tracking</a></>
                    )}
                  </p>
                )}
              </div>
              <div className="card">
                <h2 className="mb-4 font-bold text-navy">Updates</h2>
                <EventList events={events} />
              </div>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
