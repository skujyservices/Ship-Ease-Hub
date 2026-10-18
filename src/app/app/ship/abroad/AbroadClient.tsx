"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client";
import { formatMoney } from "@/lib/money";

type Wh = "US" | "GB" | "CN";
const WH_NAME: Record<Wh, string> = { US: "USA", GB: "United Kingdom", CN: "China" };

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="chip bg-mist text-navy hover:bg-silver/60"
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => undefined);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

export function PreAlertForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ warehouse: "US" as Wh, store: "", storeTracking: "", description: "", declaredValue: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open)
    return (
      <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
        + Tell us a package is coming
      </button>
    );

  return (
    <form
      className="card space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await postJson("/api/inbound/prealert", { ...f, declaredValue: f.declaredValue ? Number(f.declaredValue) : undefined });
          setOpen(false);
          setF({ ...f, store: "", storeTracking: "", description: "", declaredValue: "" });
          router.refresh();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="font-semibold text-navy">Pre-alert a package</p>
      <p className="text-sm text-navy/60">Helps the warehouse match it to you faster.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pa-wh">Warehouse</label>
          <select id="pa-wh" className="input" value={f.warehouse} onChange={(e) => setF({ ...f, warehouse: e.target.value as Wh })}>
            {(Object.keys(WH_NAME) as Wh[]).map((w) => <option key={w} value={w}>{WH_NAME[w]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pa-store">Store</label>
          <input id="pa-store" className="input" placeholder="e.g. Amazon, ASOS, Shein" value={f.store} onChange={(e) => setF({ ...f, store: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="pa-trk">Store tracking number (optional)</label>
          <input id="pa-trk" className="input" value={f.storeTracking} onChange={(e) => setF({ ...f, storeTracking: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="pa-val">Value (store currency, optional)</label>
          <input id="pa-val" className="input" type="number" min="0" step="0.01" value={f.declaredValue} onChange={(e) => setF({ ...f, declaredValue: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="pa-desc">What&apos;s inside</label>
          <input id="pa-desc" className="input" placeholder="e.g. 2 pairs of trainers" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save pre-alert"}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

export type PackageRow = {
  id: string;
  warehouse: Wh;
  status: "EXPECTED" | "RECEIVED";
  store: string | null;
  description: string;
  chargeableKg: number | null;
  receivedAt: string | null;
};

export function PackagePicker({ packages, perKg }: { packages: PackageRow[]; perKg: Record<Wh, number> }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [consolidate, setConsolidate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = packages.filter((p) => selected.includes(p.id));
  const wh = chosen[0]?.warehouse;
  const estimate = useMemo(() => {
    if (!wh) return null;
    const kg = Math.ceil(chosen.reduce((s, p) => s + (p.chargeableKg ?? 0), 0) * 2) / 2;
    return { kg, minor: Math.round(kg * perKg[wh]) };
  }, [chosen, wh, perKg]);

  const toggle = (p: PackageRow) => {
    setError(null);
    if (selected.includes(p.id)) return setSelected(selected.filter((x) => x !== p.id));
    if (wh && p.warehouse !== wh) return setError("Choose packages from one warehouse at a time.");
    setSelected([...selected, p.id]);
  };

  if (!packages.length)
    return <p className="card text-sm text-navy/60">No packages yet. Once something arrives at one of your addresses, it shows up here.</p>;

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {packages.map((p) => (
          <li key={p.id}>
            <label className={`card flex items-center gap-4 ${p.status === "RECEIVED" ? "cursor-pointer" : "opacity-70"} ${selected.includes(p.id) ? "border-purple" : ""}`}>
              <input type="checkbox" disabled={p.status !== "RECEIVED"} checked={selected.includes(p.id)} onChange={() => toggle(p)} />
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy font-display text-xs font-semibold text-white">
                {p.warehouse === "GB" ? "UK" : p.warehouse}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-navy">{p.description}</span>
                <span className="text-xs text-navy/60">
                  {p.store ?? "Package"} · {p.status === "RECEIVED" ? `${p.chargeableKg?.toFixed(1)} kg · arrived ${p.receivedAt}` : "Expected"}
                </span>
              </span>
              <span className={`chip ${p.status === "RECEIVED" ? "bg-success/10 text-success" : "bg-mist text-navy"}`}>
                {p.status === "RECEIVED" ? "At warehouse" : "Expected"}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {chosen.length > 0 && estimate && (
        <div className="card sticky bottom-24 space-y-3 border-purple sm:bottom-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-navy/70">
              {chosen.length} package{chosen.length > 1 ? "s" : ""} from {WH_NAME[wh!]} · {estimate.kg} kg
            </p>
            <p className="font-display text-xl font-medium text-navy">{perKg[wh!] ? formatMoney(estimate.minor) : "Price on request"}</p>
          </div>
          {chosen.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-navy/80">
              <input type="checkbox" checked={consolidate} onChange={(e) => setConsolidate(e.target.checked)} /> Combine into one box (fewer boxes, easier pickup)
            </label>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="button"
            className="btn-primary w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const { id } = await postJson<{ id: string }>("/api/inbound/ship", { packageIds: selected, consolidate });
                router.push(`/app/shipments/${id}`);
              } catch (e) {
                setError((e as Error).message);
                setBusy(false);
              }
            }}
          >
            {busy ? "Preparing…" : "Ship to Lagos"}
          </button>
        </div>
      )}
      {error && !chosen.length && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
