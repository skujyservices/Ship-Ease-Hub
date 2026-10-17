type Ev = { id: string; description: string; location: string | null; occurredAt: Date };

export function EventList({ events }: { events: Ev[] }) {
  if (!events.length) return <p className="text-sm text-navy/60">No updates yet.</p>;
  return (
    <ol className="relative space-y-5 border-l-2 border-silver/60 pl-5">
      {events.map((e, i) => (
        <li key={e.id} className="relative">
          <span className={`bar-cut absolute -left-[29px] top-1.5 h-2 w-4 ${i === 0 ? "bg-cyan" : "bg-purple/60"}`} />
          <p className="text-sm font-semibold text-navy">{e.description}</p>
          <p className="text-xs text-navy/60">
            {e.occurredAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            {e.location ? ` · ${e.location}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
