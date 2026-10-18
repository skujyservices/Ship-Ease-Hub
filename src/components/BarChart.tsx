/**
 * Single-series column chart (no JS): Royal Purple columns, ≤24px wide, 4px rounded tops,
 * square at the baseline, a 2px+ gap between columns, recessive grid, hover/focus tooltip
 * on every column, the peak value direct-labelled, and a table view for screen readers / print.
 */
export function BarChart({
  data,
  format,
  label,
  height = 160,
}: {
  data: { key: string; label: string; value: number }[];
  format: (v: number) => string;
  label: string; // what the values are, e.g. "Spend per month"
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const peak = data.findIndex((d) => d.value === max && max > 0);
  const nice = max || 1;

  return (
    <figure className="m-0">
      <div className="relative" style={{ height }} role="img" aria-label={`${label}. Highest ${max ? format(max) : "none"}.`}>
        {/* recessive gridlines: 0, 50%, 100% */}
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-silver/50" style={{ bottom: `${f * 100}%` }} aria-hidden />
        ))}
        <div className="absolute inset-0 flex items-end gap-1 px-1">
          {data.map((d, i) => (
            <div key={d.key} className="group relative flex h-full flex-1 items-end justify-center" tabIndex={0} aria-label={`${d.label}: ${format(d.value)}`}>
              {/* hit target is the full column slot; the mark is capped at 24px */}
              <div
                className="w-full max-w-6 rounded-t-[4px] bg-purple transition group-hover:bg-purple-600 group-focus:bg-purple-600"
                style={{ height: `${(d.value / nice) * 100}%`, minHeight: d.value ? 2 : 0 }}
              />
              {i === peak && (
                <span className="pointer-events-none absolute -translate-y-1 text-[10px] font-semibold text-navy" style={{ bottom: `${(d.value / nice) * 100}%` }}>
                  {format(d.value)}
                </span>
              )}
              <span className="pointer-events-none absolute bottom-full z-10 mb-2 hidden whitespace-nowrap rounded-lg bg-navy px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block group-focus:block">
                <span className="block text-silver">{d.label}</span>
                <span className="font-semibold">{format(d.value)}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-1 px-1 text-[10px] text-navy/55" aria-hidden>
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 truncate text-center">
            {data.length > 12 && i % Math.ceil(data.length / 8) !== 0 ? "" : d.label}
          </span>
        ))}
      </div>
      <details className="mt-3 text-xs text-navy/60 print:hidden">
        <summary className="cursor-pointer">View as table</summary>
        <table className="mt-2 w-full">
          <tbody>
            {data.map((d) => (
              <tr key={d.key} className="border-t border-silver/40"><td className="py-1">{d.label}</td><td className="py-1 text-right text-navy">{format(d.value)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
