"use client";

import { useState } from "react";
import { postJson } from "@/lib/client";
import { formatMoney } from "@/lib/money";

/** Pay for a Shop & Ship shipment in NGN, GBP or USD (accepting the Lagos pickup rules). */
export function InboundPay({ id, totalMinor, fx, rules }: { id: string; totalMinor: number; fx: { GBP: number; USD: number }; rules: string }) {
  const [currency, setCurrency] = useState<"NGN" | "GBP" | "USD">("NGN");
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = currency === "NGN" ? totalMinor : Math.ceil(totalMinor / fx[currency]);

  return (
    <div className="space-y-3 rounded-2xl bg-mist p-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pay in">
        {(["NGN", "GBP", "USD"] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={currency === c}
            onClick={() => setCurrency(c)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${currency === c ? "bg-navy text-white" : "bg-white text-navy"}`}
          >
            Pay in {c === "NGN" ? "₦" : c === "GBP" ? "£" : "$"}
          </button>
        ))}
      </div>
      <label className="flex items-start gap-3 text-sm text-navy/80">
        <input type="checkbox" className="mt-1" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
        <span>{rules}</span>
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="button"
        className="btn-primary w-full"
        disabled={!accept || busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const { url } = await postJson<{ url: string }>(`/api/inbound/${id}/pay`, { currency, acceptTerms: accept });
            window.location.href = url;
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        {busy ? "Opening payment…" : `Pay ${formatMoney(amount, currency)}`}
      </button>
    </div>
  );
}

export function PayStorageFee({ id, label }: { id: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        className="btn-primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const { url } = await postJson<{ url: string }>(`/api/inbound/${id}/storage-fee`);
            window.location.href = url;
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        {busy ? "Opening payment…" : label}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
