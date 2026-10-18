import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Ship" };

const OPTIONS = [
  { href: "/app/ship/parcel", title: "Send a parcel", body: "From Nigeria to any country, or within Nigeria. Live prices with duties included.", tag: "Nigeria → World" },
  { href: "/app/ship/abroad", title: "Ship from abroad", body: "Your USA, UK and China addresses. Shop online and we fly it to Lagos.", tag: "USA · UK · China → Lagos" },
  { href: "/app/ship/buy", title: "Buy for me", body: "Send us product links. We buy (5% fee) and ship to Lagos.", tag: "Any store → Lagos" },
  { href: "/app/ship/bulk", title: "Send many parcels", body: "Upload a spreadsheet of orders and book them all at once.", tag: "For sellers" },
];

export default function ShipPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-light text-navy">What would you like to do?</h1>
      <div className="mt-6 space-y-3">
        {OPTIONS.map((o, i) => (
          <Link key={o.title} href={o.href} className="card group flex items-center gap-4 transition hover:border-purple">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-purple">{o.tag}</p>
              <p className="mt-1 text-lg font-medium text-navy">{o.title}</p>
              <p className="mt-1 text-sm text-navy/65">{o.body}</p>
            </div>
            <div className="bar-cut h-2 w-10 bg-purple transition group-hover:bg-cyan" style={{ marginLeft: `${[0, 6, 4, 8][i]}px` }} />
          </Link>
        ))}
      </div>
    </div>
  );
}
