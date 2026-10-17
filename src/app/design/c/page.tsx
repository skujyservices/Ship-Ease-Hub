import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteHeader";

/* Direction C · Route Map: bold, geometric, energetic. */

// Abstract network: Lagos at the hub, routes out to the world (not to scale)
const HUB = { x: 300, y: 250 };
const CITIES = [
  { name: "London", x: 270, y: 70 },
  { name: "New York", x: 70, y: 120 },
  { name: "Dubai", x: 470, y: 150 },
  { name: "Shanghai", x: 560, y: 80 },
  { name: "Accra", x: 200, y: 300 },
  { name: "Johannesburg", x: 420, y: 400 },
];
const arc = (c: { x: number; y: number }) => {
  const mx = (HUB.x + c.x) / 2;
  const my = (HUB.y + c.y) / 2 - Math.abs(HUB.x - c.x) * 0.35 - 30;
  return `M${HUB.x} ${HUB.y} Q${mx} ${my} ${c.x} ${c.y}`;
};

export default function DirectionC() {
  return (
    <div className="bg-white text-navy">
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-purple text-white">
        {/* Giant logo bars bleeding off the edge */}
        <svg viewBox="0 0 600 340" className="absolute -right-40 bottom-0 -z-10 w-[900px] max-w-none opacity-90 lg:-right-20" aria-hidden>
          <path d="M0 0H600V96H52Z" fill="#00002E" />
          <path d="M150 122H600V218H202Z" fill="#00002E" opacity=".55" />
          <path d="M130 244H520V340H182Z" fill="#00002E" opacity=".3" />
        </svg>

        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
          <Logo tone="dark" href="/design/c" className="h-7 w-auto" markColor="#FFFFFF" />
          <div className="flex items-center gap-6 text-sm font-semibold">
            <Link href="/track" className="hidden text-white/80 hover:text-white sm:inline">Track</Link>
            <Link href="/login" className="hidden text-white/80 hover:text-white sm:inline">Sign in</Link>
            <Link href="/signup" className="rounded-lg bg-white px-5 py-2.5 text-purple hover:bg-silver">Get started</Link>
          </div>
        </nav>

        <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-6 lg:grid-cols-2 lg:items-center lg:pb-28 lg:pt-12">
          <div>
            <h1 className="text-5xl font-normal leading-[1.02] sm:text-7xl">
              From Lagos
              <br />
              to the world.
              <br />
              <span className="text-gold">And back.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-white/80">
              Export parcels to any country with duties included. Import from the USA, UK and China and collect in Lagos.
            </p>

            {/* Quote form in the hero */}
            <form action="/quote" className="mt-10 grid max-w-xl gap-2 rounded-2xl bg-white p-2 text-navy shadow-2xl shadow-navy/40 sm:grid-cols-[0.8fr_1.4fr_0.6fr_auto]">
              <label className="rounded-xl px-4 py-2.5 hover:bg-mist">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-navy/50">From</span>
                <span className="text-sm font-semibold">Nigeria</span>
              </label>
              <label className="rounded-xl px-4 py-2.5 hover:bg-mist">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-navy/50">To</span>
                <select name="to" className="w-full bg-transparent text-sm font-semibold outline-none" defaultValue="GB">
                  <option value="GB">United Kingdom</option>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GH">Ghana</option>
                  <option value="AE">UAE</option>
                </select>
              </label>
              <label className="rounded-xl px-4 py-2.5 hover:bg-mist">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-navy/50">Weight</span>
                <input name="kg" type="number" min="0.1" step="0.1" defaultValue="2" className="w-full bg-transparent text-sm font-semibold outline-none" aria-label="Weight in kg" />
              </label>
              <button className="rounded-xl bg-cyan px-6 py-3 text-sm font-semibold text-navy hover:brightness-95">Get price</button>
            </form>
            <p className="mt-3 text-sm text-white/70">No account needed · duties included</p>
          </div>

          {/* Route network */}
          <div className="relative">
            <svg viewBox="0 0 640 460" className="w-full" aria-label="Routes from Lagos to London, New York, Dubai, Shanghai, Accra and Johannesburg">
              {CITIES.map((c) => (
                <path key={c.name} d={arc(c)} fill="none" stroke="#16C7D9" strokeWidth="2" strokeDasharray="6 14" strokeLinecap="round" className="animate-dash" />
              ))}
              {CITIES.map((c) => (
                <g key={c.name}>
                  <circle cx={c.x} cy={c.y} r="14" fill="#16C7D9" className="animate-ping-soft" opacity=".4" />
                  <circle cx={c.x} cy={c.y} r="5" fill="#fff" />
                  <text x={c.x} y={c.y - 18} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="600" fontFamily="var(--font-display)">{c.name}</text>
                </g>
              ))}
              <circle cx={HUB.x} cy={HUB.y} r="28" fill="#D4AF37" opacity=".25" className="animate-ping-soft" />
              <circle cx={HUB.x} cy={HUB.y} r="11" fill="#D4AF37" />
              <text x={HUB.x + 20} y={HUB.y + 34} fill="#fff" fontSize="18" fontWeight="700" fontFamily="var(--font-display)">Lagos</text>
            </svg>
          </div>
        </div>
      </section>

      {/* Facts band */}
      <section className="bg-navy text-white">
        <div className="mx-auto grid max-w-7xl divide-white/10 px-5 sm:grid-cols-3 sm:divide-x">
          {[
            ["Duties included", "No surprise bills for your receiver"],
            ["USA · UK · China", "Your own shopping addresses"],
            ["WhatsApp updates", "Plus email and push, every step"],
          ].map(([t, b]) => (
            <div key={t} className="py-8 sm:px-8 first:sm:pl-0">
              <p className="font-display text-2xl font-medium">{t}</p>
              <p className="mt-1 text-sm text-silver">{b}</p>
            </div>
          ))}
        </div>
        <div className="stripe h-1.5" />
      </section>

      {/* Services */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <h2 className="text-4xl font-normal sm:text-5xl">
          Pick your <span className="text-purple">route.</span>
        </h2>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {[
            { t: "Send a parcel", sub: "Nigeria → World", b: "Live prices from DHL, UPS, FedEx, Aramex and more. Pickup, drop-off and insurance included.", href: "/quote", cta: "Get a price", w: "78%" },
            { t: "Shop & Ship", sub: "USA · UK · China → Lagos", b: "Shop online with your own overseas address. We combine and fly it home by air.", href: "/signup", cta: "Get my addresses", w: "92%" },
            { t: "Buy for me", sub: "Any store → Lagos", b: "Send us the links. We buy for a 5% fee, then ship it with Shop & Ship.", href: "/signup", cta: "Start a request", w: "64%" },
          ].map((s, i) => (
            <Link key={s.t} href={s.href} className="group relative overflow-hidden rounded-3xl bg-mist p-8 transition hover:bg-navy hover:text-white">
              <div className="bar-cut h-4 bg-purple transition group-hover:bg-cyan" style={{ width: s.w, marginLeft: ["0%", "8%", "6%"][i] }} />
              <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-purple group-hover:text-cyan">{s.sub}</p>
              <p className="mt-2 text-3xl font-medium">{s.t}</p>
              <p className="mt-3 text-navy/70 group-hover:text-silver">{s.b}</p>
              <p className="mt-8 font-semibold">{s.cta} →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Inbound corridors */}
      <section className="bg-grid">
        <div className="mx-auto max-w-7xl px-5 py-24">
          <h2 className="text-4xl font-normal">Shopping abroad? <span className="text-purple">We fly it home.</span></h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["US", "USA", "7–10 days"],
              ["UK", "United Kingdom", "7–10 days"],
              ["CN", "China", "10–14 days"],
            ].map(([flag, name, eta]) => (
              <div key={name} className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy font-display text-sm font-semibold text-white">{flag}</span>
                <div className="flex-1">
                  <p className="font-semibold">{name} → Lagos</p>
                  <p className="text-sm text-navy/60">By air · {eta}</p>
                </div>
                <div className="flex gap-1">
                  <div className="bar-cut h-2 w-6 bg-purple" />
                  <div className="bar-cut h-2 w-6 bg-cyan" />
                  <div className="bar-cut h-2 w-6 bg-gold" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-navy text-white">
        <svg viewBox="0 0 600 200" className="absolute -left-32 top-1/2 w-[700px] max-w-none -translate-y-1/2 opacity-30" aria-hidden>
          <path d="M0 0H460V56H30Z" fill="#3C15C8" />
          <path d="M90 72H500V128H120Z" fill="#3C15C8" />
          <path d="M80 144H400V200H110Z" fill="#3C15C8" />
        </svg>
        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-20 md:flex-row md:items-center">
          <h2 className="max-w-xl text-4xl font-normal">Your next shipment is a minute away.</h2>
          <Link href="/quote" className="rounded-xl bg-gold px-8 py-4 text-sm font-semibold text-navy hover:brightness-95">Get an instant quote</Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
