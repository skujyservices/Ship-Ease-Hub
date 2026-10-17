// Small server-side helpers shared by the admin pages.

export async function safe<T>(fn: () => Promise<T>): Promise<{ data?: T; error?: string }> {
  try {
    return { data: await fn() };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-navy">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-navy/60">{subtitle}</p>}
    </div>
  );
}

export function ErrorNote({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="mb-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
      Terminal API: {error}. Check TERMINAL_SECRET_KEY and TERMINAL_ENV in your environment.
    </p>
  );
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-silver/70 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-mist text-xs uppercase tracking-wide text-navy/60">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-silver/50">{children}</tbody>
      </table>
    </div>
  );
}

export const td = "px-4 py-3 align-top";
