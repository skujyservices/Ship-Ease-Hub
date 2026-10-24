import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { customerInsights } from "@/lib/insights";
import { PURPOSE_LABEL } from "@/lib/checkout";
import { PushToggle } from "@/components/ServiceWorker";
import { BarChart } from "@/components/BarChart";
import { logout } from "@/app/(auth)/actions";
import { deleteAddress } from "./actions";
import { VerifyNin } from "./VerifyNin";
import { ProfileForm, SecurityForms } from "./ProfileForms";

export const metadata: Metadata = { title: "Account" };

const short = (minor: number) => (minor >= 100_000_00 ? `₦${Math.round(minor / 100_000_00)}k` : formatMoney(minor));

export default async function AccountPage() {
  const user = await requireUser("/app/account");
  const [addresses, insights, payments] = await Promise.all([
    db.savedAddress.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    customerInsights(user.id),
    db.payment.findMany({ where: { userId: user.id, status: { in: ["SUCCESS", "REFUNDED"] } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-light text-navy">Account</h1>

      <section className="card">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="label mb-0">Profile</p>
          {user.ninVerifiedAt && <span className="chip bg-success/10 text-success">✓ Identity verified</span>}
          {user.emailVerifiedAt && <span className="chip bg-mist text-navy">✓ Email confirmed</span>}
        </div>
        <ProfileForm name={user.name} phone={user.phone ?? ""} businessName={user.businessName ?? ""} />
        <p className="mt-4 border-t border-silver/60 pt-4 text-sm text-navy/70">
          Your suite ID: <span className="font-mono font-semibold text-purple">{user.suiteId}</span> ·{" "}
          <Link href="/app/ship/abroad" className="font-semibold text-purple">My USA, UK &amp; China addresses</Link>
        </p>
        {!user.ninVerifiedAt && (
          <div className="mt-4 border-t border-silver/60 pt-4">
            <VerifyNin defaultName={user.name} />
          </div>
        )}
      </section>

      <section className="card">
        <p className="label">Sign-in &amp; security</p>
        <SecurityForms email={user.email} pendingEmail={user.pendingEmail} />
      </section>

      <section className="card space-y-4">
        <p className="label">Your shipping</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["This month", formatMoney(insights.thisMonthMinor)],
            ["Parcels sent", String(insights.sent)],
            ["From abroad", String(insights.received)],
            ["Delivered", String(insights.delivered)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-mist p-3">
              <p className="text-xs text-navy/60">{k}</p>
              <p className="font-display text-xl font-medium text-navy">{v}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="mb-3 text-sm font-medium text-navy">Spend per month</p>
          <BarChart data={insights.months} format={short} label="Spend per month, last 6 months" height={120} />
        </div>
        {insights.topDestinations.length > 0 && (
          <p className="text-sm text-navy/70">
            Top destinations: {insights.topDestinations.map(([c, n]) => `${c} (${n})`).join(" · ")}
          </p>
        )}
      </section>

      <section className="card">
        <p className="label">Payments &amp; receipts</p>
        {payments.length === 0 ? (
          <p className="text-sm text-navy/60">No payments yet.</p>
        ) : (
          <ul className="divide-y divide-silver/60">
            {payments.map((p) => (
              <li key={p.id}>
                <Link href={`/app/receipts/${p.id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-purple">
                  <span>
                    <span className="font-semibold text-navy">{PURPOSE_LABEL[p.purpose]}</span>
                    <span className="block text-navy/60">{(p.paidAt ?? p.createdAt).toLocaleDateString("en-GB")} · {p.reference}</span>
                  </span>
                  <span className="text-right font-medium text-navy">
                    {formatMoney(p.amountMinor, p.currency)}
                    {p.status === "REFUNDED" && <span className="block text-xs text-danger">Refunded</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" id="addresses">
        <p className="label">Saved addresses</p>
        {addresses.length === 0 ? (
          <p className="text-sm text-navy/60">Tick &quot;Save this address&quot; when you send a parcel and it will appear here.</p>
        ) : (
          <ul className="divide-y divide-silver/60">
            {addresses.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="font-semibold text-navy">{a.firstName} {a.lastName}</span>
                  <span className="block text-navy/60">{a.line1}, {a.city}, {a.country}</span>
                </span>
                <form action={deleteAddress.bind(null, a.id)}>
                  <button className="text-sm font-semibold text-danger">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-2">
        <p className="label">Notifications</p>
        <p className="text-sm text-navy/70">We send every update by email and WhatsApp. Turn on push to get them on this device too.</p>
        <PushToggle />
      </section>

      <form action={logout}>
        <button className="btn-ghost w-full">Sign out</button>
      </form>
    </div>
  );
}
