import Link from "next/link";
import { Logo } from "@/components/Logo";
import { HomeSections, SiteNav } from "@/components/marketing/Editorial";

/* Direction B · Clean Editorial: bright, airy, typographic. */

export default function DirectionB() {
  return (
    <div className="bg-white text-navy">
      <SiteNav home="/design/b" active="Send a parcel" />

      {/* HERO */}
      <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-8 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-purple">Modern Logistics &amp; Shipping</p>
          <h1 className="mt-6 text-[3.25rem] font-light leading-[0.98] tracking-tight sm:text-[5.5rem]">
            Ship from Lagos to{" "}
            <span className="relative inline-block font-normal text-purple">
              anywhere.
              <span className="bar-cut absolute -bottom-1 left-2 h-2.5 w-[92%] bg-cyan sm:-bottom-2 sm:h-3.5" />
            </span>
          </h1>
          <p className="mt-8 max-w-md text-lg leading-relaxed text-navy/65">
            One clear price with duties included, the best couriers, and updates on WhatsApp. Shopping abroad? We bring it home too.
          </p>

          <form action="/track" className="mt-10 flex max-w-md items-center gap-2 rounded-full border border-silver bg-white p-1.5 shadow-[0_10px_40px_-12px_rgba(0,0,46,0.25)]">
            <input name="code" aria-label="Tracking code" placeholder="Enter a tracking code" className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-navy/40" />
            <button className="rounded-full bg-purple px-5 py-3 text-sm font-semibold text-white hover:bg-purple-600">Track</button>
          </form>
          <p className="mt-4 text-sm text-navy/60">
            or <Link href="/quote" className="font-semibold text-purple underline-offset-4 hover:underline">get an instant quote →</Link>
          </p>
        </div>

        {/* Phone mockup */}
        <div className="relative mx-auto flex h-[560px] w-full max-w-md items-center justify-center">
          <div className="absolute inset-x-4 inset-y-10 rounded-[3rem] bg-silver/50" />
          <svg viewBox="0 0 300 200" className="absolute -right-6 top-6 w-72 opacity-90" aria-hidden>
            <path d="M40 0H300V52H64Z" fill="#3C15C8" />
            <path d="M110 74H300V126H134Z" fill="#3C15C8" opacity=".5" />
            <path d="M100 148H260V200H124Z" fill="#3C15C8" opacity=".2" />
          </svg>
          <div className="relative w-[270px] rounded-[2.6rem] border-[10px] border-navy bg-white shadow-[0_40px_80px_-30px_rgba(0,0,46,0.55)]">
            <div className="mx-auto mt-2 h-5 w-24 rounded-full bg-navy" />
            <div className="space-y-3 px-4 pb-6 pt-4">
              <div className="flex items-center justify-between">
                <Logo href={null} className="h-4 w-auto" />
                <span className="h-7 w-7 rounded-full bg-mist" />
              </div>
              <p className="pt-2 text-[11px] font-semibold uppercase tracking-widest text-navy/50">Your shipment</p>
              <div className="rounded-2xl bg-navy p-4 text-white">
                <p className="text-[10px] text-silver/70">SEH-7K3M9QX</p>
                <p className="mt-1 text-base font-medium">Lagos → London</p>
                <div className="mt-3 flex gap-1">
                  <div className="bar-cut h-1.5 flex-1 bg-purple" />
                  <div className="bar-cut h-1.5 flex-1 bg-cyan" />
                  <div className="bar-cut h-1.5 flex-1 bg-white/20" />
                </div>
                <p className="mt-2 text-[11px] text-cyan">In transit · arrives Thu</p>
              </div>
              {[
                ["Picked up in Lagos", "Mon 14:38"],
                ["Departed Lagos hub", "Mon 21:10"],
                ["Arrived London", "Wed 06:02"],
              ].map(([t, d]) => (
                <div key={t} className="flex items-center justify-between rounded-xl bg-mist px-3 py-2.5">
                  <span className="text-xs font-medium">{t}</span>
                  <span className="text-[10px] text-navy/50">{d}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-xl border border-silver px-3 py-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-[10px] text-white">✓</span>
                <span className="text-[11px] text-navy/70">WhatsApp update sent</span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-2 left-0 rounded-2xl bg-white px-4 py-3 shadow-xl sm:-left-4">
            <p className="text-[11px] text-navy/50">Total, duties included</p>
            <p className="font-display text-xl font-medium">₦84,500</p>
          </div>
        </div>
      </section>

      <HomeSections />
    </div>
  );
}
