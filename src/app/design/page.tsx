import Link from "next/link";
import { LogoStacked } from "@/components/Logo";

const CARDS = [
  { href: "/design/a", name: "Midnight Glass", body: "Dark, immersive and premium. A glowing hero with a floating live-quote card, glass panels and a bento feature grid.", swatch: "bg-brand" },
  { href: "/design/b", name: "Clean Editorial", body: "Bright, airy and calm. Oversized type, generous white space, a phone mockup of the app, and silver surfaces.", swatch: "bg-grid" },
  { href: "/design/c", name: "Route Map", body: "Bold and geometric. Big logo-bar shapes, an animated route map from Lagos to the world, and a quote form right in the hero.", swatch: "bg-purple" },
];

export default function DesignIndex() {
  return (
    <main className="bg-grid min-h-dvh px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <LogoStacked className="h-14 w-auto" />
        <h1 className="mt-10 text-4xl font-normal text-navy">
          Three <span className="text-purple">design directions</span>
        </h1>
        <p className="mt-3 max-w-xl text-navy/70">Same logo and colours, three different personalities. Open each one, then pick a favourite (or mix parts).</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {CARDS.map((c, i) => (
            <Link key={c.href} href={c.href} className="card group overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-xl">
              <div className={`${c.swatch} h-32`} />
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-purple">Direction {"ABC"[i]}</p>
                <p className="mt-1 text-xl font-medium text-navy">{c.name}</p>
                <p className="mt-2 text-sm text-navy/70">{c.body}</p>
                <p className="mt-4 font-semibold text-purple group-hover:underline">View →</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
