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
      <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={
              t.primary
                ? "btn-primary ml-2 px-4 py-2"
                : `rounded-lg px-3 py-2 text-sm font-semibold ${active(t.href) ? "bg-mist text-navy" : "text-navy/60 hover:text-navy"}`
            }
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-silver/70 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden"
        aria-label="Main"
      >
        {TABS.map((t) =>
          t.primary ? (
            <Link key={t.href} href={t.href} className="-mt-5 flex flex-col items-center" aria-current={active(t.href) ? "page" : undefined}>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple shadow-lg shadow-purple/30">
                <LogoMark className="h-6 w-7 text-white" />
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
