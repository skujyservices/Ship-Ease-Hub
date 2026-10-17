import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { LogoMark } from "@/components/Logo";
import { LineMotif } from "@/components/brand/LineMotif";
import { BRAND } from "@/lib/brand";

const SERVICES = [
  {
    title: "Send a parcel",
    body: "From anywhere in Nigeria to any country. Compare DHL, UPS, FedEx, Aramex and more. Duties are included in the price, so there are no surprises for your receiver.",
    href: "/quote",
    cta: "Get a price",
  },
  {
    title: "Shop & Ship",
    body: "Get your own address in the USA, UK and China. Shop online; we combine your packages and fly them to Lagos.",
    href: "/signup",
    cta: "Get my addresses",
  },
  {
    title: "Buy for me",
    body: "Send us the product links. We buy for you (5% service fee), then ship to Lagos.",
    href: "/signup",
    cta: "Start a request",
  },
];

const STEPS = [
  ["Get a price", "Live rates from top carriers, with duties and insurance worked out upfront."],
  ["Book and pay", "Pay securely by card or bank. We book the courier and send your label."],
  ["Track it", "Updates by email, WhatsApp and push, and a tracking link to share."],
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-brand relative overflow-hidden text-white">
          <LineMotif className="pointer-events-none absolute -right-24 top-10 hidden w-[620px] opacity-40 lg:block" color="#16C7D9" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-24 pt-14 md:grid-cols-2 md:items-center">
            <div>
              <h1 className="text-4xl font-normal leading-[1.08] sm:text-6xl">
                <span className="text-cyan">Modern</span>
                <br />
                Logistics &amp;
                <br />
                Shipping Solution
              </h1>
              <p className="mt-5 max-w-md text-lg text-silver">
                Send parcels from Nigeria to the world, and bring your shopping home from the USA, UK and China. {BRAND.promise}.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/quote" className="btn-accent">Get a quote</Link>
                <Link href="/signup" className="btn border border-white/30 text-white hover:bg-white/10">Create account</Link>
              </div>
            </div>
            <form action="/track" className="rounded-2xl bg-white p-6 text-ink shadow-2xl shadow-black/30">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-silver">
                  <LogoMark className="h-4 w-auto" />
                </span>
                <div>
                  <label htmlFor="code" className="block text-base font-semibold text-navy">Track a shipment</label>
                  <p className="text-sm text-navy/60">No account needed.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input id="code" name="code" className="input" placeholder="e.g. SEH-7K3M9QX" required />
                <button className="btn-primary">Track</button>
              </div>
            </form>
          </div>
        </section>

        <section className="bg-grid">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-3xl font-normal text-navy">
              Three ways to <span className="text-purple">ship</span>
            </h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {SERVICES.map((s, i) => (
                <div key={s.title} className="card relative flex flex-col overflow-hidden">
                  <div className="bar-cut mb-5 h-2 bg-purple" style={{ width: `${[64, 80, 52][i]}%`, marginLeft: `${[0, 12, 10][i]}%` }} />
                  <h3 className="text-xl font-medium text-navy">{s.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-navy/70">{s.body}</p>
                  <Link href={s.href} className="mt-5 font-semibold text-purple">{s.cta} →</Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-normal text-navy">
            How it <span className="text-purple">works</span>
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="font-display text-4xl font-light text-purple">{i + 1}</span>
                <div>
                  <p className="font-semibold text-navy">{title}</p>
                  <p className="mt-1 text-sm text-navy/70">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
