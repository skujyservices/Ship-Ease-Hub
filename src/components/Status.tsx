import { statusMeta } from "@/lib/status";

const TONES = {
  neutral: "bg-mist text-navy",
  info: "bg-purple/10 text-purple",
  good: "bg-success/10 text-success",
  warn: "bg-gold/20 text-navy",
  bad: "bg-danger/10 text-danger",
};

export function StatusChip({ status }: { status: string }) {
  const m = statusMeta(status);
  return <span className={`chip ${TONES[m.tone]}`}>{m.label}</span>;
}

/** The three slanted bars as a progress indicator: Origin → In transit → Delivery. */
export function PhaseBars({ status }: { status: string }) {
  const { phase, tone } = statusMeta(status);
  const labels = ["Origin", "In transit", "Delivery"];
  const failed = tone === "bad";
  return (
    <div className="flex items-end gap-1.5" aria-label={`Step ${phase} of 3: ${labels[phase - 1]}`}>
      {labels.map((label, i) => (
        <div key={label} className="flex flex-col items-start gap-1">
          <div
            className={`bar-cut h-2.5 w-14 ${
              i < phase ? (failed && i === phase - 1 ? "bg-danger" : i === phase - 1 ? "bg-cyan" : "bg-purple") : "bg-silver/60"
            }`}
          />
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${i < phase ? "text-navy" : "text-navy/40"}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
