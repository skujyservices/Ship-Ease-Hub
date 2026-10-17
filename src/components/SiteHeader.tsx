import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Logo, LogoBadge, LogoLockup } from "./Logo";

const NAV = [
  ["Send a parcel", "/quote"],
  ["Shop & Ship", "/#shop-ship"],
  ["Buy for me", "/#services"],
  ["Track", "/track"],
] as const;

/** White site navigation (Editorial style). `active` highlights the current section. */
export function SiteNav({ active, home = "/" }: { active?: string; home?: string }) {
  return (
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
      <Logo href={home} className="h-7 w-auto" />
      <div className="hidden items-center gap-1 rounded-full bg-mist p-1 text-sm font-medium md:flex">
        {NAV.map(([label, href]) => (
          <Link
            key={label}
            href={href}
            className={`rounded-full px-4 py-2 transition ${active === label ? "bg-white text-navy shadow-sm" : "text-navy/60 hover:text-navy"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-4 text-sm font-semibold">
        <Link href="/login" className="hidden text-navy/70 hover:text-navy sm:inline">Sign in</Link>
        <Link href="/signup" className="rounded-full bg-navy px-5 py-2.5 text-white transition hover:bg-purple">Get started</Link>
      </div>
    </nav>
  );
}

/** Marketing pages header: the white pill navigation. */
export function SiteHeader({ active }: { active?: string }) {
  return (
    <header className="border-b border-silver/50 bg-white">
      <SiteNav active={active} />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-navy text-silver">
      <div className="stripe h-1.5" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <LogoLockup tone="dark" className="h-11 w-auto" />
          <p className="max-w-xs">{BRAND.tagline}. {BRAND.promise}.</p>
          <LogoBadge tone="dark" className="h-16 w-16 opacity-80" />
        </div>
        <div>
          <p className="font-semibold text-white">Lagos</p>
          <p className="mt-2">Drop-off: {BRAND.lagosDropOff}</p>
          <p className="mt-2">Pickup hub: {BRAND.lagosPickup}</p>
          <p className="mt-2">{BRAND.phonesNg.join(" · ")}</p>
        </div>
        <div>
          <p className="font-semibold text-white">United Kingdom</p>
          <p className="mt-2">{BRAND.ukOffice}</p>
          <p className="mt-4 font-semibold text-white">USA line</p>
          <p className="mt-2">{BRAND.phoneUsa}</p>
        </div>
        <div>
          <p className="font-semibold text-white">Ship Ease Hub</p>
          <ul className="mt-2 space-y-2">
            <li><Link href="/quote" className="hover:text-white">Get a quote</Link></li>
            <li><Link href="/track" className="hover:text-white">Track a shipment</Link></li>
            <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
            <li><a href={`https://instagram.com/${BRAND.instagram}`} className="hover:text-white" target="_blank" rel="noreferrer">@{BRAND.instagram}</a></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 py-5 text-center text-xs text-silver/70">© {BRAND.name} · {BRAND.website}</p>
    </footer>
  );
}
