import type { Metadata } from "next";
import Link from "next/link";

// Design directions for review. Not linked from the site and not indexed.
export const metadata: Metadata = { title: "Design directions", robots: { index: false, follow: false } };

const DIRECTIONS = [
  ["/design/a", "A · Midnight Glass"],
  ["/design/b", "B · Clean Editorial"],
  ["/design/c", "C · Route Map"],
  ["/design/d", "D · Editorial Routes"],
] as const;

export default function DesignLayout({ children }: LayoutProps<"/design">) {
  return (
    <>
      <div className="sticky top-0 z-50 flex items-center justify-center gap-1 bg-ink/90 px-2 py-2 text-xs font-semibold backdrop-blur">
        <span className="mr-2 hidden text-white/50 sm:inline">Design directions:</span>
        {DIRECTIONS.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-full px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white">
            {label}
          </Link>
        ))}
      </div>
      {children}
    </>
  );
}
