import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PushToggle } from "@/components/ServiceWorker";
import { logout } from "@/app/(auth)/actions";
import { deleteAddress } from "./actions";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser("/app/account");
  const addresses = await db.savedAddress.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-navy">Account</h1>

      <section className="card">
        <p className="label">Profile</p>
        <p className="text-lg font-semibold text-navy">{user.name}</p>
        <p className="text-sm text-navy/70">{user.email} · {user.phone}</p>
        <p className="mt-3 text-sm text-navy/70">
          Your suite ID: <span className="font-mono font-semibold text-purple">{user.suiteId}</span>
        </p>
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
