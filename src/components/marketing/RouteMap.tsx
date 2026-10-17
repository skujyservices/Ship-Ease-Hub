import { LogoMark } from "@/components/Logo";

/*
 * Animated route network for the home hero.
 * Purple routes: parcels sent from Lagos. Cyan routes: Shop & Ship parcels flying into Lagos.
 * Each parcel (a dot) travels its route, then its destination pulses and shows a ✓ "delivered".
 * Uses SVG SMIL animation (no JS). Hidden for people who prefer reduced motion (see globals.css).
 */

type Pt = { x: number; y: number };
const HUB: Pt = { x: 300, y: 318 };

const CITIES: (Pt & { name: string; inbound?: boolean; dx?: number })[] = [
  { name: "London", x: 268, y: 92, inbound: true },
  { name: "New York", x: 66, y: 232, inbound: true },
  { name: "Shanghai", x: 572, y: 118, inbound: true, dx: -6 },
  { name: "Dubai", x: 468, y: 196 },
  { name: "Accra", x: 168, y: 356 },
  { name: "Johannesburg", x: 436, y: 470 },
];

const PURPLE = "#3C15C8";
const CYAN = "#16C7D9";
const NAVY = "#00002E";

// One animation cycle per route: travel for ~half the cycle, deliver, rest.
const CYCLE = 6.5;
const TRAVEL_END = 0.5; // fraction of the cycle when the parcel arrives

// Outbound arcs bow one way, inbound arcs the other, so both directions stay visible
function arc(from: Pt, to: Pt, bend: number) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const k = len * bend;
  return `M${from.x} ${from.y} Q${(mx - (dy / len) * k).toFixed(1)} ${(my + (dx / len) * k).toFixed(1)} ${to.x} ${to.y}`;
}

type Route = { id: string; d: string; color: string; to: Pt; begin: number; badge: boolean };

const ROUTES: Route[] = [
  ...CITIES.map((c, i) => ({ id: `seh-out-${i}`, d: arc(HUB, c, 0.22), color: PURPLE, to: c as Pt, begin: i * 1.05, badge: true })),
  ...CITIES.filter((c) => c.inbound).map((c, i) => ({
    id: `seh-in-${i}`,
    d: arc(c, HUB, 0.22),
    color: CYAN,
    to: HUB,
    begin: 0.55 + i * 2.1,
    badge: false,
  })),
];

const t = (n: number) => n.toFixed(3);

function Parcel({ r }: { r: Route }) {
  const common = { dur: `${CYCLE}s`, begin: `${r.begin}s`, repeatCount: "indefinite" } as const;
  return (
    <g className="route-anim">
      {/* the travelling parcel */}
      <g opacity="0">
        <animate attributeName="opacity" values="0;1;1;0;0" keyTimes={`0;0.04;${t(TRAVEL_END - 0.02)};${t(TRAVEL_END + 0.02)};1`} {...common} />
        <animateMotion keyPoints="0;1;1" keyTimes={`0;${t(TRAVEL_END)};1`} calcMode="linear" {...common}>
          <mpath href={`#${r.id}`} />
        </animateMotion>
        <circle r="10" fill={r.color} opacity=".22" />
        <circle r="5" fill={r.color} stroke="#fff" strokeWidth="2" />
      </g>

      {/* delivery pulse at the destination */}
      <circle cx={r.to.x} cy={r.to.y} r="6" fill="none" stroke={r.color} strokeWidth="2.5" opacity="0">
        <animate attributeName="r" values="6;6;30;30" keyTimes={`0;${t(TRAVEL_END)};${t(TRAVEL_END + 0.2)};1`} {...common} />
        <animate attributeName="opacity" values="0;0;0.9;0;0" keyTimes={`0;${t(TRAVEL_END - 0.001)};${t(TRAVEL_END)};${t(TRAVEL_END + 0.2)};1`} {...common} />
      </circle>

      {/* ✓ delivered badge (outbound only) */}
      {r.badge && (
        <g transform={`translate(${r.to.x + 11} ${r.to.y - 6})`} opacity="0">
          <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={`0;${t(TRAVEL_END)};${t(TRAVEL_END + 0.04)};${t(TRAVEL_END + 0.3)};${t(TRAVEL_END + 0.36)};1`} {...common} />
          <circle r="8" fill="#13795B" />
          <path d="M-3.5 0.2 L-1 2.7 L3.6 -2.4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
}

export function RouteMap() {
  return (
    <div className="bg-grid relative overflow-hidden rounded-[2.5rem] border border-silver/60 px-2 pb-4 pt-6">
      {/* faint logo bars in the corner */}
      <svg viewBox="0 0 300 200" className="absolute -right-10 -top-6 w-64 opacity-[0.08]" aria-hidden>
        <path d="M40 0H300V52H64Z" fill={PURPLE} />
        <path d="M110 74H300V126H134Z" fill={PURPLE} />
        <path d="M100 148H260V200H124Z" fill={PURPLE} />
      </svg>

      <svg
        viewBox="0 0 640 520"
        className="relative w-full"
        role="img"
        aria-label="Parcels travelling from Lagos to London, New York, Shanghai, Dubai, Accra and Johannesburg, and Shop & Ship parcels flying from the USA, UK and China into Lagos"
      >
        {ROUTES.map((r) => (
          <path key={r.id} id={r.id} d={r.d} fill="none" stroke={r.color} strokeWidth={r.badge ? 2 : 2.5} strokeDasharray="5 11" strokeLinecap="round" opacity=".55" />
        ))}

        {CITIES.map((c) => (
          <g key={c.name}>
            <circle cx={c.x} cy={c.y} r="6" fill="#fff" stroke={NAVY} strokeWidth="2.5" />
            <text x={c.x + (c.dx ?? 0)} y={c.y - 18} textAnchor="middle" fill={NAVY} fontSize="15" fontWeight="600" fontFamily="var(--font-display)">
              {c.name}
            </text>
          </g>
        ))}

        {ROUTES.map((r) => (
          <Parcel key={r.id} r={r} />
        ))}

        {/* Lagos hub */}
        <circle cx={HUB.x} cy={HUB.y} r="30" fill={PURPLE} opacity=".12" className="animate-ping-soft" />
        <circle cx={HUB.x} cy={HUB.y} r="16" fill={NAVY} />
        <circle cx={HUB.x} cy={HUB.y} r="6" fill="#D4AF37" />
      </svg>

      <div className="absolute left-1/2 top-[61%] flex -translate-x-1/2 translate-y-3 items-center gap-2 rounded-full bg-navy py-1.5 pl-2.5 pr-3.5 text-xs font-semibold text-white shadow-lg">
        <LogoMark className="h-2.5 w-auto" color="#FFFFFF" />
        Lagos hub
      </div>

      <div className="mx-4 mt-1 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-navy/70">
        <span className="flex items-center gap-2"><span className="bar-cut h-1.5 w-6 bg-purple" /> Send a parcel</span>
        <span className="flex items-center gap-2"><span className="bar-cut h-1.5 w-6 bg-cyan" /> Shop &amp; Ship to Lagos</span>
        <span className="flex items-center gap-2">
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success text-[8px] text-white">✓</span> Delivered
        </span>
      </div>
    </div>
  );
}
