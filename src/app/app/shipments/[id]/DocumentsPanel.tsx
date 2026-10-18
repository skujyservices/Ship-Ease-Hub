"use client";

import { useState } from "react";
import { postJson } from "@/lib/client";
import { formatMoney } from "@/lib/money";

type Doc = { type: string; name: string; minor: number; free: boolean };

/** After booking: documents the destination may require, which the customer can pay for. */
export function DocumentsPanel({ id, docs }: { id: string; docs: Doc[] }) {
  const [chosen, setChosen] = useState<string[]>(docs.filter((d) => !d.free).map((d) => d.type));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = docs.filter((d) => chosen.includes(d.type)).reduce((s, d) => s + d.minor, 0);

  return (
    <div className="card space-y-3">
      <h2 className="text-lg font-medium text-navy">Customs documents</h2>
      <p className="text-sm text-navy/65">The destination may require these for your goods. We&apos;ll prepare them and attach them to your shipment.</p>
      {docs.map((d) => (
        <label key={d.type} className="flex items-center justify-between rounded-2xl border border-silver p-3 text-sm">
          <span className="flex items-center gap-3">
            <input type="checkbox" checked={chosen.includes(d.type)} disabled={d.free} onChange={(e) => setChosen(e.target.checked ? [...chosen, d.type] : chosen.filter((t) => t !== d.type))} />
            {d.name}
          </span>
          <span className="text-navy/70">{d.free ? "Free" : formatMoney(d.minor)}</span>
        </label>
      ))}
      {error && <p className="text-sm text-danger">{error}</p>}
      {total > 0 && (
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const { url } = await postJson<{ url: string }>(`/api/parcel/${id}/documents`, { types: chosen });
              window.location.href = url;
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
        >
          {busy ? "Opening payment…" : `Get documents · ${formatMoney(total)}`}
        </button>
      )}
    </div>
  );
}
