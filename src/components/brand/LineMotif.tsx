/**
 * Decorative line motif from the guide (p.5, p.10): the logo's three bars drawn as thin
 * outlines with square nodes, stepping right. Purely decorative.
 */
export function LineMotif({ className = "", color = "#3C15C8" }: { className?: string; color?: string }) {
  // Each bar: parallelogram outline with the logo's cut on the left end
  const bars = [
    { x: 0, y: 0, w: 260 },
    { x: 70, y: 70, w: 230 },
    { x: 60, y: 140, w: 170 },
  ];
  const h = 44;
  const cut = 24;
  return (
    <svg viewBox="-10 -10 330 210" className={className} fill="none" aria-hidden>
      {bars.map((b, i) => (
        <g key={i} stroke={color} strokeWidth="1.2">
          <path d={`M${b.x} ${b.y}H${b.x + b.w}V${b.y + h}H${b.x + cut}Z`} />
          {/* hatching, as in the guide's construction drawings */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={b.x + cut * f} y1={b.y + h * f} x2={b.x + b.w} y2={b.y + h * f} strokeOpacity="0.45" />
          ))}
          <rect x={b.x - 3} y={b.y - 3} width="6" height="6" fill={color} stroke="none" />
          <rect x={b.x + cut - 3} y={b.y + h - 3} width="6" height="6" fill={color} stroke="none" />
        </g>
      ))}
    </svg>
  );
}
