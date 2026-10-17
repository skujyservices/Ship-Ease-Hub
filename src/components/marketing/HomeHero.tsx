import Link from "next/link";
import { RouteMap } from "./RouteMap";

/** Home hero: "From Lagos to the world and back." beside the animated route map. */
export function HomeHero() {
  return (
    <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-8 lg:grid-cols-[1fr_1.05fr] lg:pt-14">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-purple">Modern Logistics &amp; Shipping</p>
        <h1 className="mt-6 text-[3.1rem] font-light leading-[1] tracking-tight sm:text-[5.25rem]">
          From Lagos
          <br />
          to the world{" "}
          <span className="relative inline-block whitespace-nowrap font-normal text-purple">
            and back.
            <span className="bar-cut absolute -bottom-1 left-2 h-2.5 w-[92%] bg-cyan sm:-bottom-2 sm:h-3.5" />
          </span>
        </h1>
        <p className="mt-8 max-w-md text-lg leading-relaxed text-navy/65">
          Send parcels to any country with duties included. Shop from the USA, UK and China and collect in Lagos. One clear price, updates on WhatsApp.
        </p>

        <form action="/track" className="mt-10 flex max-w-md items-center gap-2 rounded-full border border-silver bg-white p-1.5 shadow-[0_10px_40px_-12px_rgba(0,0,46,0.25)]">
          <input name="code" aria-label="Tracking code" placeholder="Enter a tracking code" className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-navy/40" />
          <button className="rounded-full bg-purple px-5 py-3 text-sm font-semibold text-white hover:bg-purple-600">Track</button>
        </form>
        <p className="mt-4 text-sm text-navy/60">
          or <Link href="/quote" className="font-semibold text-purple underline-offset-4 hover:underline">get an instant quote →</Link>
        </p>
      </div>

      <div className="relative">
        <RouteMap />

        {/* Floating cards (example data) */}
        <div className="animate-float absolute -left-4 top-8 hidden w-56 rounded-2xl bg-white p-4 shadow-[0_20px_50px_-20px_rgba(0,0,46,0.45)] sm:block lg:-left-10">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-navy/50">SEH-7K3M9QX</p>
          <p className="mt-1 text-sm font-semibold">Lagos → London</p>
          <div className="mt-2.5 flex gap-1">
            <div className="bar-cut h-1.5 flex-1 bg-purple" />
            <div className="bar-cut h-1.5 flex-1 bg-cyan" />
            <div className="bar-cut h-1.5 flex-1 bg-silver" />
          </div>
          <p className="mt-2 text-[11px] font-medium text-purple">In transit · arrives Thu</p>
        </div>

        <div className="absolute -bottom-14 right-6 hidden rounded-2xl bg-white px-4 py-3 shadow-[0_20px_50px_-20px_rgba(0,0,46,0.45)] sm:block" style={{ animation: "seh-float 7s ease-in-out infinite reverse" }}>
          <p className="text-[11px] text-navy/50">Lagos → London · 2.5 kg</p>
          <p className="font-display text-xl font-medium">
            ₦84,500 <span className="text-xs font-normal text-success">duties included</span>
          </p>
        </div>

        <div className="absolute -right-3 top-[38%] hidden items-center gap-2 rounded-full bg-white px-3 py-2 text-[11px] font-semibold shadow-lg md:flex lg:-right-8">
          <span className="h-2 w-2 rounded-full bg-cyan" /> From China · 10–14 days
        </div>
      </div>
    </section>
  );
}
