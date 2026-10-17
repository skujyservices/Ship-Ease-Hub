import Link from "next/link";
import { Logo, LogoMark } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteHeader";

/* Direction A · Midnight Glass: dark, immersive, premium. */

const RATES = [
  { carrier: "DHL Express", eta: "3–5 days", price: "₦84,500", best: "Fastest" },
  { carrier: "UPS Saver", eta: "4–6 days", price: "₦79,200", best: "" },
  { carrier: "Aramex", eta: "6–8 days", price: "₦61,900", best: "Cheapest" },
];

export default function DirectionA() {
  return (
    <div className="bg-ink text-white">
      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        {/* light */}
        <div className="absolute -left-40 top-20 -z-10 h-[520px] w-[520px] rounded-full bg-purple/50 blur-[140px]" />
        <div className="absolute -right-32 top-64 -z-10 h-[420px] w-[420px] rounded-full bg-cyan/25 blur-[140px]" />
        <div
          className="absolute inset-0 -z-10 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse at 50% 30%, black 20%, transparent 70%)",
          }}
        />

        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
          <Logo tone="dark" href="/design/a" className="h-7 w-auto" />
          <div className="hidden items-center gap-8 text-sm text-silver md:flex">
            <a href="#services" className="hover:text-white">Services</a>
            <a href="#how" className="hover:text-white">How it works</a>
            <Link href="/track" className="hover:text-white">Track</Link>
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Link href="/login" className="hidden text-silver hover:text-white sm:inline">Sign in</Link>
            <Link href="/signup" className="rounded-full bg-white px-5 py-2.5 text-navy hover:bg-silver">Get started</Link>
          </div>
        </nav>

        <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 pb-28 pt-10 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-silver backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan" /> Nigeria ⇄ the world · duties included
            </p>
            <h1 className="mt-6 text-5xl font-light leading-[1.02] tracking-tight sm:text-7xl">
              Movement,
              <br />
              <span className="bg-gradient-to-r from-cyan via-[#7b6cff] to-[#b9a8ff] bg-clip-text font-normal text-transparent">made easy.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-silver/90">
              Send parcels from Nigeria to any country, or shop from the USA, UK and China and collect in Lagos. One price, live tracking, no surprises.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/quote" className="rounded-full bg-cyan px-7 py-3.5 text-sm font-semibold text-navy shadow-[0_0_40px_-8px] shadow-cyan transition hover:brightness-110">
                Get an instant quote
              </Link>
              <Link href="/signup" className="rounded-full border border-white/20 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10">
                Get my US · UK · China address
              </Link>
            </div>
            <p className="mt-12 text-xs uppercase tracking-[0.2em] text-silver/50">Carriers we book</p>
            <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-lg font-semibold text-white/40">
              <span>DHL</span><span>UPS</span><span>FedEx</span><span>Aramex</span><span>GIG</span>
            </div>
          </div>

          {/* Glass stack */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="animate-float rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-silver">Live quote</p>
                <span className="rounded-full bg-cyan/15 px-2.5 py-1 text-[11px] font-semibold text-cyan">Duties included</span>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <div>
                  <p className="text-2xl font-medium">Lagos</p>
                  <p className="text-xs text-silver/70">NG · 2.5 kg</p>
                </div>
                <div className="relative mx-2 h-px flex-1 bg-gradient-to-r from-white/10 via-cyan to-white/10">
                  <LogoMark className="absolute left-1/2 top-1/2 h-3 w-auto -translate-x-1/2 -translate-y-1/2" color="#16C7D9" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-medium">London</p>
                  <p className="text-xs text-silver/70">GB</p>
                </div>
              </div>
              <ul className="mt-6 space-y-2">
                {RATES.map((r, i) => (
                  <li key={r.carrier} className={`flex items-center justify-between rounded-2xl px-4 py-3 ${i === 0 ? "bg-white text-navy" : "bg-white/[0.04]"}`}>
                    <div>
                      <p className="text-sm font-semibold">{r.carrier}</p>
                      <p className={`text-xs ${i === 0 ? "text-navy/60" : "text-silver/60"}`}>{r.eta}{r.best && ` · ${r.best}`}</p>
                    </div>
                    <p className="font-display text-lg font-medium">{r.price}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-center text-[11px] text-silver/50">Example prices</p>
            </div>

            <div className="absolute -bottom-10 -left-6 w-60 rounded-2xl border border-white/10 bg-navy/80 p-4 shadow-xl backdrop-blur-xl sm:-left-16" style={{ animation: "seh-float 7s ease-in-out infinite reverse" }}>
              <p className="text-[11px] font-medium uppercase tracking-widest text-silver/60">SEH-7K3M9QX</p>
              <p className="mt-1 text-sm font-semibold">In transit to London</p>
              <div className="mt-3 flex gap-1.5">
                <div className="bar-cut h-2 flex-1 bg-purple" />
                <div className="bar-cut h-2 flex-1 bg-cyan" />
                <div className="bar-cut h-2 flex-1 bg-white/15" />
              </div>
            </div>

            <div className="absolute -right-4 -top-8 flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur-xl sm:-right-10">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-[10px]">✓</span> Delivered · signed by T. Odu
            </div>
          </div>
        </div>
      </section>

      {/* BENTO */}
      <section id="services" className="mx-auto max-w-7xl px-5 py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan">Services</p>
        <h2 className="mt-3 max-w-2xl text-4xl font-light sm:text-5xl">Everything you need to move goods, in one place.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3 md:grid-rows-2">
          <Bento className="md:col-span-2 md:row-span-2" title="Send a parcel" body="Compare live prices from the world's top couriers. Duties, insurance and customs paperwork are worked out before you pay.">
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {["Pickup from your door", "Customs documents", "Insurance & claims"].map((t) => (
                <div key={t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-silver">
                  <div className="bar-cut mb-3 h-1.5 w-10 bg-cyan" />
                  {t}
                </div>
              ))}
            </div>
          </Bento>
          <Bento title="Shop & Ship" body="Your own address in the USA, UK and China. We combine packages and fly them to Lagos.">
            <div className="mt-5 flex gap-2">
              {["USA", "UK", "China"].map((c) => (
                <span key={c} className="rounded-full bg-white/10 px-3 py-1 text-xs">{c}</span>
              ))}
            </div>
          </Bento>
          <Bento title="Buy for me" body="Paste the product links. We buy for you for a 5% fee, then ship it home." />
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:grid-cols-3">
          {[
            ["01", "Quote", "Live prices with duties included."],
            ["02", "Book", "Pay by card or bank transfer. We book the courier."],
            ["03", "Track", "Updates by WhatsApp, email and push."],
          ].map(([n, t, b]) => (
            <div key={n}>
              <p className="font-display text-5xl font-extralight text-white/25">{n}</p>
              <p className="mt-4 text-xl font-medium">{t}</p>
              <p className="mt-2 text-silver/80">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-purple to-[#1d0b78] px-8 py-16 text-center">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan/30 blur-[100px]" />
          <h2 className="relative text-4xl font-light sm:text-5xl">Ready when you are.</h2>
          <p className="relative mx-auto mt-4 max-w-md text-silver">Get a price in under a minute. No account needed until you pay.</p>
          <Link href="/quote" className="relative mt-8 inline-flex rounded-full bg-white px-8 py-4 text-sm font-semibold text-navy hover:bg-silver">
            Get an instant quote
          </Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function Bento({ title, body, className = "", children }: { title: string; body: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-7 ${className}`}>
      <p className="text-2xl font-medium">{title}</p>
      <p className="mt-2 max-w-md text-silver/80">{body}</p>
      {children}
    </div>
  );
}
