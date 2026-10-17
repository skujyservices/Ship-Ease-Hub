import Link from "next/link";
import * as art from "./brand/logoArt";
import type { LogoArt } from "./brand/logoArt";

/**
 * Ship Ease Hub logo, drawn from the vector outlines in the Visual Identity PDF.
 * Variations (guide p.15): horizontal (mark + SEH), brand icon, stacked and
 * two-line "SHIP EASE HUB" lockups, and the badge.
 *
 * Colours per the guide: the mark is always Royal Purple. The wordmark is
 * Midnight Navy on light backgrounds, White (SEH) or Cool Silver (SHIP EASE HUB) on dark.
 */

const PURPLE = "#3C15C8";
const NAVY = "#00002E";

function Art({
  a,
  title,
  className,
  markColor = PURPLE,
  textColor = NAVY,
}: {
  a: LogoArt;
  title?: string;
  className?: string;
  markColor?: string;
  textColor?: string;
}) {
  return (
    <svg viewBox={a.viewBox} className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {a.parts.map((p, i) => (
        <path key={i} d={p.d} transform={p.t || undefined} fill={p.role === "mark" ? markColor : textColor} fillRule="evenodd" />
      ))}
    </svg>
  );
}

type Tone = "light" | "dark"; // background the logo sits on

/** The three-bar brand icon on its own. */
export function LogoMark({ className = "h-6 w-auto", color = PURPLE }: { className?: string; color?: string }) {
  return <Art a={art.mark} className={className} markColor={color} />;
}

/** Primary logo: mark + SEH wordmark. Links home by default. */
export function Logo({ tone = "light", href = "/", className = "h-7 w-auto" }: { tone?: Tone; href?: string | null; className?: string }) {
  const svg = <Art a={art.seh} title="Ship Ease Hub" className={className} textColor={tone === "dark" ? "#FFFFFF" : NAVY} />;
  return href ? (
    <Link href={href} className="inline-flex items-center" aria-label="Ship Ease Hub home">
      {svg}
    </Link>
  ) : (
    svg
  );
}

/** Mark beside "SHIP / EASE HUB" (guide p.16). */
export function LogoLockup({ tone = "light", className = "h-10 w-auto" }: { tone?: Tone; className?: string }) {
  return <Art a={art.horizontal} title="Ship Ease Hub" className={className} textColor={tone === "dark" ? "#C7CBD6" : NAVY} />;
}

/** Mark above "SHIP EASE HUB" (guide p.17). */
export function LogoStacked({ tone = "light", className = "h-14 w-auto" }: { tone?: Tone; className?: string }) {
  return <Art a={art.stacked} title="Ship Ease Hub" className={className} textColor={tone === "dark" ? "#C7CBD6" : NAVY} />;
}

/** Circular seal with "SHIP EASE HUB" around the mark (guide p.15). */
export function LogoBadge({ tone = "light", className = "h-20 w-20" }: { tone?: Tone; className?: string }) {
  return <Art a={art.badge} title="Ship Ease Hub" className={className} textColor={tone === "dark" ? "#C7CBD6" : NAVY} />;
}
