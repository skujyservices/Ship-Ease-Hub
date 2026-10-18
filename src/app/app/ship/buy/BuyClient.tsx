"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client";

type Item = { url: string; variant: string; quantity: number; notes: string };
const empty = (): Item => ({ url: "", variant: "", quantity: 1, notes: "" });

export function BuyForm({ feePercent }: { feePercent: number }) {
  const router = useRouter();
  const [warehouse, setWarehouse] = useState<"US" | "GB" | "CN">("US");
  const [items, setItems] = useState<Item[]>([empty()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (i: number, patch: Partial<Item>) => setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  return (
    <form
      className="card space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const { id } = await postJson<{ id: string }>("/api/buy", { warehouse, items });
          router.push(`/app/ship/buy/${id}`);
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <div>
        <p className="text-lg font-medium text-navy">What should we buy?</p>
        <p className="text-sm text-navy/60">
          Paste product links. We&apos;ll send a quote in naira (items + store delivery + our {feePercent}% fee). Shipping to Lagos is paid separately when it reaches our warehouse.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="buy-wh">Store country</label>
        <select id="buy-wh" className="input" value={warehouse} onChange={(e) => setWarehouse(e.target.value as typeof warehouse)}>
          <option value="US">USA</option>
          <option value="GB">United Kingdom</option>
          <option value="CN">China</option>
        </select>
      </div>
      {items.map((it, i) => (
        <div key={i} className="grid gap-3 rounded-2xl bg-mist p-4 sm:grid-cols-6">
          <div className="sm:col-span-6">
            <label className="label" htmlFor={`b-url-${i}`}>Product link</label>
            <input id={`b-url-${i}`} className="input" type="url" placeholder="https://" value={it.url} onChange={(e) => set(i, { url: e.target.value })} required />
          </div>
          <div className="sm:col-span-3">
            <label className="label" htmlFor={`b-var-${i}`}>Size / colour / variant</label>
            <input id={`b-var-${i}`} className="input" value={it.variant} onChange={(e) => set(i, { variant: e.target.value })} />
          </div>
          <div className="sm:col-span-1">
            <label className="label" htmlFor={`b-q-${i}`}>Qty</label>
            <input id={`b-q-${i}`} className="input" type="number" min={1} max={50} value={it.quantity} onChange={(e) => set(i, { quantity: Math.max(1, Number(e.target.value)) })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor={`b-n-${i}`}>Notes</label>
            <input id={`b-n-${i}`} className="input" value={it.notes} onChange={(e) => set(i, { notes: e.target.value })} />
          </div>
          {items.length > 1 && (
            <button type="button" className="text-left text-sm font-semibold text-danger sm:col-span-6" onClick={() => setItems(items.filter((_, j) => j !== i))}>
              Remove item
            </button>
          )}
        </div>
      ))}
      <button type="button" className="btn-ghost" onClick={() => setItems([...items, empty()])}>+ Add another item</button>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Sending…" : "Request a quote"}</button>
    </form>
  );
}

export function BuyActions({ id, canPay, canCancel }: { id: string; canPay: boolean; canCancel: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };
  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {canPay && (
          <button
            className="btn-primary"
            disabled={Boolean(busy)}
            onClick={() =>
              run("pay", async () => {
                const { url } = await postJson<{ url: string }>(`/api/buy/${id}/pay`);
                window.location.href = url;
              })
            }
          >
            {busy === "pay" ? "Opening payment…" : "Approve and pay"}
          </button>
        )}
        {canCancel && (
          <button
            className="btn-ghost"
            disabled={Boolean(busy)}
            onClick={() =>
              confirm("Cancel this request?") &&
              run("cancel", async () => {
                await postJson(`/api/buy/${id}/cancel`);
                router.refresh();
                setBusy(null);
              })
            }
          >
            Cancel request
          </button>
        )}
      </div>
    </div>
  );
}
