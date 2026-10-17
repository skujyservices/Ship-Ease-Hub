import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteHeader";
export { SiteNav } from "@/components/SiteHeader";

/* Shared marketing pieces in the Editorial style (home page and design previews). */

const FAQ = [
  ["Are duties really included?", "Yes. For international parcels we estimate import duties with the carrier and include them in your price, so your receiver pays nothing on arrival."],
  ["Do I need an account to get a price?", "No. You only create an account when you're ready to pay."],
  ["Where do I collect Shop & Ship packages?", "At our Lagos hub. Collection is free for 2 days after we notify you."],
  ["How will I know where my parcel is?", "We send every update by WhatsApp, email and push notification, plus a tracking link you can share."],
];

export function HomeSections() {
  return (
    <>
      {/* Carriers */}
      <section className="border-y border-silver/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-5 py-8 text-xl font-semibold text-navy/30">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-navy/50">We book</span>
          <span>DHL Express</span><span>UPS</span><span>FedEx</span><span>Aramex</span><span>GIG Logistics</span>
        </div>
      </section>

      {/* Services, editorial list */}
      <section id="services" className="mx-auto max-w-7xl scroll-mt-6 px-5 py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <h2 className="text-4xl font-light leading-tight">
            Three services.
            <br />
            <span className="text-purple">One easy hub.</span>
          </h2>
          <div className="divide-y divide-silver/70 border-y border-silver/70">
            {[
              ["Send a parcel", "Nigeria to any country, or across Nigeria. Pickup from your door or drop off nearby.", "/quote"],
              ["Shop & Ship", "Your own address in the USA, UK and China. We combine your orders and fly them to Lagos.", "/signup"],
              ["Buy for me", "Send us product links. We buy for a 5% fee and ship it home.", "/signup"],
            ].map(([t, b, href], i) => (
              <Link key={t} href={href} className="group grid grid-cols-[3rem_1fr_auto] items-start gap-4 py-8">
                <span className="font-display text-sm text-navy/40">0{i + 1}</span>
                <span>
                  <span className="block text-2xl font-medium group-hover:text-purple">{t}</span>
                  <span className="mt-2 block max-w-lg text-navy/65">{b}</span>
                </span>
                <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-silver transition group-hover:border-purple group-hover:bg-purple group-hover:text-white">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Shop & Ship spotlight */}
      <section id="shop-ship" className="bg-grid scroll-mt-6">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 lg:grid-cols-2">
          <div className="card mx-auto w-full max-w-md p-6 shadow-[0_30px_60px_-30px_rgba(0,0,46,0.35)]">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold"><span className="rounded-md bg-navy px-1.5 py-0.5 text-[10px] text-white">UK</span> Your UK address</p>
              <span className="chip bg-mist text-navy">Copy</span>
            </div>
            <div className="mt-4 space-y-1 text-sm text-navy/75">
              <p className="font-semibold text-navy">Ada Obi <span className="text-purple">SEH-10482</span></p>
              <p>SEH partner warehouse</p>
              <p>Street address, City, Postcode</p>
              <p>United Kingdom</p>
            </div>
            <div className="stripe mt-6 h-1 rounded-full" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-purple">Shop &amp; Ship</p>
            <h2 className="mt-4 text-4xl font-light leading-tight">Shop like you live there.<br />Collect it in Lagos.</h2>
            <p className="mt-5 max-w-md text-navy/65">Use your Ship Ease Hub address at checkout on any US, UK or Chinese store. We&apos;ll tell you the moment it lands.</p>
            <Link href="/signup" className="btn-primary mt-8 rounded-full px-7">Get my addresses</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-24">
        <h2 className="text-center text-4xl font-light">Questions, answered</h2>
        <div className="mt-10 divide-y divide-silver/70 border-y border-silver/70">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-medium">
                {q}
                <span className="ml-4 text-purple transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-navy/65">{a}</p>
            </details>
          ))}
        </div>
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <LogoMark className="h-8 w-auto" />
          <p className="text-2xl font-light">Ready to ship?</p>
          <Link href="/quote" className="rounded-full bg-navy px-8 py-4 text-sm font-semibold text-white hover:bg-purple">Get an instant quote</Link>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
