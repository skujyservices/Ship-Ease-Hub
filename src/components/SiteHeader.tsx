import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Logo, LogoBadge, LogoLockup } from "./Logo";

/** Dark marketing header (marketing site dark, app light). */
export function SiteHeader() {
  return (
    <header className="bg-navy">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo tone="dark" className="h-7 w-auto sm:h-8" />
        <nav className="flex items-center gap-2 text-sm font-semibold sm:gap-6">
          <Link href="/track" className="hidden text-silver hover:text-white sm:inline">Track</Link>
          <Link href="/quote" className="hidden text-silver hover:text-white sm:inline">Get a quote</Link>
          <Link href="/login" className="text-silver hover:text-white">Sign in</Link>
          <Link href="/signup" className="btn-accent px-4 py-2">Get started</Link>
        </nav>
      </div>
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
