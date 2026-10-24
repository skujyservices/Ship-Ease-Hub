import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings, WAREHOUSES, type WarehouseCode } from "@/lib/settings";
import { chargeableKg } from "@/lib/inbound/service";
import { BRAND } from "@/lib/brand";
import { photoUrls } from "@/lib/storage";
import { CopyButton, PackagePicker, PreAlertForm, type PackageRow } from "./AbroadClient";

export const metadata: Metadata = { title: "Ship from abroad" };

export default async function AbroadPage() {
  const user = await requireUser("/app/ship/abroad");
  const settings = await getSettings();
  const packages = await db.package.findMany({
    where: { userId: user.id, shipmentId: null, status: { in: ["EXPECTED", "RECEIVED"] } },
    orderBy: [{ status: "desc" }, { createdAt: "desc" }],
  });

  const perKg = Object.fromEntries(
    (Object.keys(WAREHOUSES) as WarehouseCode[]).map((w) => [w, Math.round(settings.inboundRates[w].perKgMinor * (1 + settings.inboundMarkupPercent / 100))]),
  ) as Record<WarehouseCode, number>;

  const thumbs = await Promise.all(packages.map((p) => photoUrls(p.photos.slice(0, 1))));
  const rows: PackageRow[] = packages.map((p, i) => ({
    photo: thumbs[i][0] ?? null,
    id: p.id,
    warehouse: p.warehouse as WarehouseCode,
    status: p.status as PackageRow["status"],
    store: p.store,
    description: p.description,
    chargeableKg: p.status === "RECEIVED" ? chargeableKg(p, settings.volumetricDivisor) : null,
    receivedAt: p.receivedAt?.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) ?? null,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <Link href="/app/ship" className="text-sm font-semibold text-purple">← Ship</Link>
        <h1 className="mt-2 text-3xl font-light text-navy">Ship from abroad</h1>
        <p className="mt-2 text-navy/65">
          Shop on any US, UK or Chinese store using your address below. When your package arrives we&apos;ll tell you, then you pay to fly it to Lagos and collect it at {BRAND.lagosPickup}.
        </p>
      </div>

      <section>
        <h2 className="text-xl font-medium text-navy">Your addresses</h2>
        <p className="mt-1 text-sm text-navy/60">
          Always include your suite ID <span className="font-mono font-semibold text-purple">{user.suiteId}</span> so the warehouse knows it&apos;s yours.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(Object.keys(WAREHOUSES) as WarehouseCode[]).map((w) => {
            const a = settings.warehouses[w];
            const ready = Boolean(a.line1);
            const lines = [
              `${user.name} ${user.suiteId}`,
              a.line1,
              a.line2 ? `${a.line2}, Suite ${user.suiteId}` : `Suite ${user.suiteId}`,
              `${a.city}${a.state ? `, ${a.state}` : ""} ${a.zip}`.trim(),
              WAREHOUSES[w],
              a.phone,
            ].filter(Boolean);
            return (
              <div key={w} className="card flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold text-navy">
                    <span className="rounded-md bg-navy px-1.5 py-0.5 text-[10px] text-white">{w === "GB" ? "UK" : w}</span>
                    {WAREHOUSES[w]}
                  </span>
                  {ready && <CopyButton text={lines.join("\n")} label="Copy all" />}
                </div>
                {ready ? (
                  <address className="mt-4 space-y-0.5 text-sm not-italic text-navy/75">
                    {lines.map((l, i) => (
                      <p key={i} className={i === 0 ? "font-semibold text-navy" : ""}>{l}</p>
                    ))}
                  </address>
                ) : (
                  <p className="mt-4 text-sm text-navy/60">Address coming soon.</p>
                )}
                <p className="mt-auto pt-4 text-xs text-navy/50">By air · {settings.inboundRates[w].etaDays}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-medium text-navy">Your packages</h2>
          <PreAlertForm />
        </div>
        <PackagePicker packages={rows} perKg={perKg} />
      </section>
    </div>
  );
}
