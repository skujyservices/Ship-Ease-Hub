"use client";

import { useEffect, useRef, useState } from "react";

export type Item = {
  name: string;
  description: string;
  type: "parcel" | "document";
  value: number;
  quantity: number;
  weight: number;
  hs_code?: string;
};
export type ParcelDraft = { packaging: string; items: Item[] };
export type PackagingOption = { id: string; name: string; type: string; dims: string; weight: number; isDefault: boolean };

export const emptyItem = (): Item => ({ name: "", description: "", type: "parcel", value: 0, quantity: 1, weight: 0.5 });

export function ParcelEditor({
  parcels,
  onChange,
  packaging,
  international,
}: {
  parcels: ParcelDraft[];
  onChange: (p: ParcelDraft[]) => void;
  packaging: PackagingOption[];
  international: boolean;
}) {
  const update = (i: number, p: ParcelDraft) => onChange(parcels.map((x, j) => (j === i ? p : x)));

  return (
    <div className="space-y-6">
      {parcels.map((parcel, pi) => (
        <div key={pi} className="rounded-2xl border border-silver/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-navy">Box {pi + 1}</h3>
            {parcels.length > 1 && (
              <button type="button" className="text-sm font-semibold text-danger" onClick={() => onChange(parcels.filter((_, j) => j !== pi))}>
                Remove box
              </button>
            )}
          </div>

          <label className="label" htmlFor={`pk-${pi}`}>Packaging</label>
          <select id={`pk-${pi}`} className="input mb-4" value={parcel.packaging} onChange={(e) => update(pi, { ...parcel, packaging: e.target.value })}>
            {packaging.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.type}, {p.dims})
              </option>
            ))}
          </select>

          <div className="space-y-4">
            {parcel.items.map((item, ii) => (
              <ItemRow
                key={ii}
                idp={`p${pi}i${ii}`}
                item={item}
                international={international}
                onChange={(it) => update(pi, { ...parcel, items: parcel.items.map((x, j) => (j === ii ? it : x)) })}
                onRemove={parcel.items.length > 1 ? () => update(pi, { ...parcel, items: parcel.items.filter((_, j) => j !== ii) }) : undefined}
              />
            ))}
          </div>
          <button type="button" className="btn-ghost mt-4" onClick={() => update(pi, { ...parcel, items: [...parcel.items, emptyItem()] })}>
            + Add another item
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn-ghost w-full"
        onClick={() => onChange([...parcels, { packaging: packaging[0]?.id ?? "", items: [emptyItem()] }])}
      >
        + Add another box
      </button>
    </div>
  );
}

function ItemRow({
  idp,
  item,
  international,
  onChange,
  onRemove,
}: {
  idp: string;
  item: Item;
  international: boolean;
  onChange: (i: Item) => void;
  onRemove?: () => void;
}) {
  const set = (patch: Partial<Item>) => onChange({ ...item, ...patch });
  return (
    <div className="grid gap-3 rounded-xl bg-mist p-3 sm:grid-cols-6">
      <div className="sm:col-span-3">
        <label className="label" htmlFor={`${idp}-n`}>Item</label>
        <input id={`${idp}-n`} className="input" placeholder="e.g. Ankara fabric" value={item.name} onChange={(e) => set({ name: e.target.value })} />
      </div>
      <div className="sm:col-span-3">
        <label className="label" htmlFor={`${idp}-t`}>Type</label>
        <select id={`${idp}-t`} className="input" value={item.type} onChange={(e) => set({ type: e.target.value as Item["type"] })}>
          <option value="parcel">Goods</option>
          <option value="document">Documents</option>
        </select>
      </div>
      <div className="sm:col-span-6">
        <label className="label" htmlFor={`${idp}-d`}>Description (for customs)</label>
        <input id={`${idp}-d`} className="input" placeholder="What it is and what it's made of" value={item.description} onChange={(e) => set({ description: e.target.value })} />
      </div>
      {international && item.type === "parcel" && (
        <div className="sm:col-span-6">
          <HsCodePicker idp={idp} value={item.hs_code} onPick={(hs_code) => set({ hs_code })} seed={item.name} />
        </div>
      )}
      <NumberField id={`${idp}-v`} label="Value (₦, total)" value={item.value} step={100} onChange={(value) => set({ value })} />
      <NumberField id={`${idp}-q`} label="Quantity" value={item.quantity} step={1} onChange={(quantity) => set({ quantity: Math.max(1, Math.round(quantity)) })} />
      <NumberField id={`${idp}-w`} label="Weight (kg, total)" value={item.weight} step={0.1} onChange={(weight) => set({ weight })} />
      {onRemove && (
        <div className="flex items-end sm:col-span-6">
          <button type="button" className="text-sm font-semibold text-danger" onClick={onRemove}>Remove item</button>
        </div>
      )}
    </div>
  );
}

function NumberField(props: { id: string; label: string; value: number; step: number; onChange: (n: number) => void }) {
  return (
    <div className="sm:col-span-2">
      <label className="label" htmlFor={props.id}>{props.label}</label>
      <input
        id={props.id}
        className="input"
        type="number"
        inputMode="decimal"
        min={0}
        step={props.step}
        value={Number.isFinite(props.value) ? props.value : ""}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  );
}

/** Searches Terminal's simplified HS codes so customs can classify the item. */
function HsCodePicker({ idp, value, onPick, seed }: { idp: string; value?: string; onPick: (code: string) => void; seed: string }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ code: string; label: string }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 3) return;
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/terminal/hs-codes?q=${encodeURIComponent(q)}`);
      setHits(res.ok ? await res.json() : []);
    }, 350);
  }, [q]);

  return (
    <div>
      <label className="label" htmlFor={`${idp}-hs`}>Customs category (HS code){value ? `: ${value}` : ""}</label>
      <input
        id={`${idp}-hs`}
        className="input"
        placeholder={seed ? `Search, e.g. "${seed}"` : "Search, e.g. shoes, phone case, shea butter"}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {hits.length > 0 && (
        <ul className="mt-1 max-h-48 overflow-auto rounded-xl border border-silver bg-white text-sm">
          {hits.map((h) => (
            <li key={h.code + h.label}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-mist"
                onClick={() => {
                  onPick(h.code);
                  setQ(h.label);
                  setHits([]);
                }}
              >
                <span className="font-mono text-xs text-purple">{h.code}</span> {h.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
