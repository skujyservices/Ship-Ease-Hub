import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { PURPOSE_LABEL } from "@/lib/checkout";
import { BRAND } from "@/lib/brand";
import type { PriceLine } from "@/lib/outbound/pricing";
import { Logo } from "@/components/Logo";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "Receipt" };

// Branded receipt; "Download PDF" uses the browser's Save as PDF (print styles hide the app chrome)
export default async function ReceiptPage({ params }: PageProps<"/app/receipts/[id]">) {
  const user = await requireUser("/app/shipments");
  const { id } = await params;
  const p = await db.payment.findUnique({ where: { id }, include: { user: true, shipment: true } });
  if (!p || (p.userId !== user.id && user.role === "CUSTOMER") || p.status === "PENDING" || p.status === "FAILED") notFound();

  const batch = p.batchId ? await db.shipment.findMany({ where: { id: { in: (p.raw as { shipmentIds?: string[] })?.shipmentIds ?? [] } } }) : [];
  const procurement = p.procurementId ? await db.procurementRequest.findUnique({ where: { id: p.procurementId } }) : null;
  const lines: { label: string; minor: number }[] =
    p.purpose === "SHIPMENT" && p.shipment
      ? ((p.shipment.pricing as PriceLine[] | null) ?? []).map((l) => ({ label: l.label, minor: l.minor }))
      : batch.length
        ? batch.map((s) => ({ label: `Shipment ${s.code} to ${(s.toAddress as { city?: string })?.city ?? ""}`, minor: s.totalMinor ?? 0 }))
        : [{ label: PURPOSE_LABEL[p.purpose], minor: p.currency === "NGN" ? p.amountMinor : 0 }];
  const foreign = p.currency !== "NGN";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={p.shipmentId ? `/app/shipments/${p.shipmentId}` : "/app/account"} className="text-sm font-semibold text-purple">← Back</Link>
        <PrintButton />
      </div>

      <article className="overflow-hidden rounded-3xl bg-white shadow-[0_12px_40px_-24px_rgba(0,0,46,0.25)] print:rounded-none print:shadow-none">
        <header className="flex items-center justify-between bg-navy px-8 py-6">
          <Logo tone="dark" href={null} className="h-7 w-auto" />
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-silver">{p.status === "REFUNDED" ? "Refunded" : "Receipt"}</span>
        </header>
        <div className="stripe h-1" />
        <div className="space-y-8 p-8">
          <div className="grid gap-6 text-sm sm:grid-cols-2">
            <div>
              <p className="label">Billed to</p>
              <p className="font-semibold text-navy">{p.user.name}</p>
              <p className="text-navy/70">{p.user.email}</p>
              <p className="text-navy/70">{p.user.phone}</p>
            </div>
            <div className="sm:text-right">
              <p className="label">Reference</p>
              <p className="font-mono font-semibold text-navy">{p.reference}</p>
              <p className="text-navy/70">{(p.paidAt ?? p.createdAt).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}</p>
              <p className="text-navy/70">Paid by {p.provider === "PAYSTACK" ? "Paystack" : "Stripe"}</p>
            </div>
          </div>

          <div>
            <p className="label">{PURPOSE_LABEL[p.purpose]}{p.shipment ? ` · ${p.shipment.code}` : ""}{procurement ? " · Buy for me" : ""}</p>
            <table className="mt-2 w-full text-sm">
              <tbody className="divide-y divide-silver/60">
                {lines.filter((l) => l.minor).map((l, i) => (
                  <tr key={i}><td className="py-2.5 text-navy/75">{l.label}</td><td className="py-2.5 text-right text-navy">{formatMoney(l.minor)}</td></tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-navy">
                  <td className="pt-3 font-semibold text-navy">Total paid</td>
                  <td className="pt-3 text-right font-display text-xl font-medium text-navy">{formatMoney(p.amountMinor, p.currency)}</td>
                </tr>
              </tfoot>
            </table>
            {foreign && <p className="mt-2 text-xs text-navy/55">Charged in {p.currency} at our exchange rate on the day.</p>}
            {p.status === "REFUNDED" && p.refundedAt && <p className="mt-2 text-sm font-medium text-danger">Refunded on {p.refundedAt.toLocaleDateString("en-GB")}.</p>}
          </div>

          <footer className="border-t border-silver/60 pt-5 text-xs leading-relaxed text-navy/55">
            <p className="font-semibold text-navy">{BRAND.name} · {BRAND.tagline}</p>
            <p>UK: {BRAND.ukOffice} · Lagos: {BRAND.lagosDropOff}</p>
            <p>{BRAND.phonesNg.join(" · ")} · USA {BRAND.phoneUsa} · {BRAND.website}</p>
          </footer>
        </div>
      </article>
    </div>
  );
}
