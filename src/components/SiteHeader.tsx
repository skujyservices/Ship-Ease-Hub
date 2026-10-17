import Link from "next/link";
import { Logo } from "./Logo";

/** Dark marketing header (spec: marketing site dark, app light). */
export function SiteHeader() {
  return (
    <header className="bg-navy">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo tone="light" />
        <nav className="flex items-center gap-2 text-sm font-semibold sm:gap-5">
          <Link href="/track" className="hidden text-white/80 hover:text-white sm:inline">Track</Link>
          <Link href="/quote" className="hidden text-white/80 hover:text-white sm:inline">Get a quote</Link>
          <Link href="/login" className="text-white/80 hover:text-white">Sign in</Link>
          <Link href="/signup" className="btn-accent px-4 py-2">Get started</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-navy text-white/70">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm sm:grid-cols-3">
        <div>
          <Logo tone="light" />
          <p className="mt-3">Ship from Nigeria to the world. Shop from the USA, UK and China to Nigeria.</p>
        </div>
        <div>
          <p className="font-semibold text-white">Lagos pickup hub</p>
          <p className="mt-2">Lawani, off University Road, Yaba, Lagos</p>
        </div>
        <div>
          <p className="font-semibold text-white">UK office</p>
          <p className="mt-2">Basildon, Essex</p>
          <Link href="/terms" className="mt-3 inline-block text-white hover:underline">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
