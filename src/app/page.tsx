import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { LogoMark } from "@/components/Logo";

const SERVICES = [
  {
    title: "Send a parcel",
    body: "From anywhere in Nigeria to any country. Compare DHL, UPS, FedEx, Aramex and more. Duties are included in the price, so there are no surprises for your receiver.",
    href: "/quote",
    cta: "Get a price",
  },
  {
    title: "Shop & Ship",
    body: "Get your own address in the USA, UK and China. Shop online, we combine your packages and fly them to Lagos.",
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

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-navy text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-20 pt-12 md:grid-cols-2 md:items-center">
            <div>
              <LogoMark className="mb-6 h-10 w-12 text-white" />
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Shipping made easy, both ways.</h1>
              <p className="mt-4 max-w-md text-lg text-white/75">
                Send parcels from Nigeria to the world, and bring your shopping home from the USA, UK and China.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/quote" className="btn-accent">Get a quote</Link>
                <Link href="/signup" className="btn border border-white/30 text-white hover:bg-white/10">Create account</Link>
              </div>
            </div>
            <form action="/track" className="rounded-2xl bg-white p-6 text-ink shadow-xl">
              <label htmlFor="code" className="label">Track a shipment</label>
              <p className="mb-4 text-sm text-navy/60">No account needed.</p>
              <div className="flex gap-2">
                <input id="code" name="code" className="input" placeholder="e.g. SEH-7K3M9QX" required />
                <button className="btn-primary">Track</button>
              </div>
            </form>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold text-navy">Three ways to ship</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {SERVICES.map((s) => (
              <div key={s.title} className="card flex flex-col">
                <h3 className="text-lg font-bold text-navy">{s.title}</h3>
                <p className="mt-2 flex-1 text-sm text-navy/70">{s.body}</p>
                <Link href={s.href} className="mt-5 font-semibold text-purple">{s.cta} →</Link>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
