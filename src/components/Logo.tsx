import Link from "next/link";

/** Three slanted bars (air, sea, land) + wordmark. `tone` picks the wordmark colour. */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="140 140 280 232" className={className} aria-hidden>
      <path d="M150 360 L214 152 H262 L198 360 Z" fill="#3C15C8" />
      <path d="M232 360 L296 152 H344 L280 360 Z" fill="#16C7D9" />
      <path d="M314 360 L378 152 H402 L338 360 Z" fill="currentColor" />
    </svg>
  );
}

export function Logo({ tone = "dark", href = "/" }: { tone?: "dark" | "light"; href?: string }) {
  const text = tone === "light" ? "text-white" : "text-navy";
  return (
    <Link href={href} className={`flex items-center gap-2 font-bold tracking-tight ${text}`}>
      <LogoMark className={`h-7 w-8 ${text}`} />
      <span className="text-lg">Ship Ease Hub</span>
    </Link>
  );
}
