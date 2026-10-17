import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Ship" };

const OPTIONS = [
  {
    href: "/app/ship/parcel",
    title: "Send a parcel",
    body: "From Nigeria to any country, or within Nigeria. Live prices with duties included.",
    ready: true,
  },
  {
    href: "/app/account#addresses",
    title: "Ship from abroad",
    body: "Your USA, UK and China addresses. Shop online and we fly it to Lagos.",
    ready: false,
  },
  {
    href: "/app/ship",
    title: "Buy for me",
    body: "Send us product links. We buy (5% fee) and ship to Lagos.",
    ready: false,
  },
];

export default function ShipPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-light text-navy">What would you like to do?</h1>
      <div className="mt-6 space-y-3">
        {OPTIONS.map((o) =>
          o.ready ? (
            <Link key={o.title} href={o.href} className="card block transition hover:border-purple">
              <p className="text-lg font-bold text-navy">{o.title}</p>
              <p className="mt-1 text-sm text-navy/70">{o.body}</p>
            </Link>
          ) : (
            <div key={o.title} className="card opacity-60">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-navy">{o.title}</p>
                <span className="chip bg-gold/20 text-navy">Coming soon</span>
              </div>
              <p className="mt-1 text-sm text-navy/70">{o.body}</p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
