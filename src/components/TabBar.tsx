"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "./Logo";

const TABS = [
  { href: "/app/shipments", label: "Shipments", icon: "M4 7h16M4 12h16M4 17h10" },
  { href: "/app/ship", label: "Ship", primary: true },
  { href: "/app/account", label: "Account", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" },
];

/** Mobile: bottom bar with Ship as the big middle button. Desktop: top links. */
export function TabBar() {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <>
      <nav className="hidden items-center gap-3 sm:flex" aria-label="Main">
        <div className="flex items-center gap-1 rounded-full bg-mist p-1 text-sm font-medium">
          {TABS.filter((t) => !t.primary).map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-full px-4 py-2 transition ${active(t.href) ? "bg-white text-navy shadow-sm" : "text-navy/60 hover:text-navy"}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <Link href="/app/ship" className="btn-primary px-5 py-2.5">
          <LogoMark className="h-2.5 w-auto" color="#FFFFFF" /> Ship
        </Link>
      </nav>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-silver/70 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden"
        aria-label="Main"
      >
        {TABS.map((t) =>
          t.primary ? (
            <Link key={t.href} href={t.href} className="-mt-5 flex flex-col items-center" aria-current={active(t.href) ? "page" : undefined}>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-purple shadow-lg shadow-purple/30">
                <LogoMark className="h-5 w-auto" color="#FFFFFF" />
              </span>
              <span className="mt-1 text-[11px] font-semibold text-navy">Ship</span>
            </Link>
          ) : (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold ${active(t.href) ? "text-purple" : "text-navy/60"}`}
              aria-current={active(t.href) ? "page" : undefined}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d={t.icon} />
              </svg>
              {t.label}
            </Link>
          ),
        )}
      </nav>
    </>
  );
}
