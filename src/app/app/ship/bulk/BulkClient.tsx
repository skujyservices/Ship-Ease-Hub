"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { postJson } from "@/lib/client";
import { formatMoney } from "@/lib/money";
import { rowsFromCsv, type BulkRow } from "@/lib/outbound/bulk";
import type { AddressForm } from "@/lib/outbound/schema";
import { AddressFields, emptyAddress, useCountries, type SavedAddress } from "@/components/parcel/AddressFields";
import type { PackagingOption } from "@/components/parcel/ParcelEditor";

type Line = { line: number; row?: BulkRow; error?: string };
type Priced = { shipmentId: string; code: string; carrier: string; eta?: string; totalMinor: number; dropoffAddress?: string } | { error: string };

export function BulkClient({ saved }: { saved: SavedAddress[] }) {
  const countries = useCountries();
  const [from, setFrom] = useState<AddressForm>(emptyAddress("NG"));
  const [packaging, setPackaging] = useState<PackagingOption[]>([]);
  const [pack, setPack] = useState("");
  const [purpose, setPurpose] = useState<"commercial" | "personal" | "sample">("commercial");
  const [strategy, setStrategy] = useState<"cheapest" | "fastest">("cheapest");
  const [fileName, setFileName] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [priced, setPriced] = useState<Record<number, Priced>>({});
  const [running, setRunning] = useState(false);
  const [accept, setAccept] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/terminal/packaging")
      .then((r) => (r.ok ? r.json() : []))
      .then((p: PackagingOption[]) => {
        setPackaging(p);
        setPack(p[0]?.id ?? "");
      })
      .catch(() => undefined);
  }, []);

  const valid = lines.filter((l) => l.row);
  const done = Object.values(priced);
  const ok = done.filter((p): p is Exclude<Priced, { error: string }> => !("error" in p));
  const total = ok.reduce((s, p) => s + p.totalMinor, 0);

  async function onFile(f: File) {
    setFileName(f.name);
    setPriced({});
    setBatchId(null);
    const { error, rows } = rowsFromCsv(await f.text());
    setFileError(error);
    setLines(rows);
  }

  async function priceAll() {
    setRunning(true);
    try {
      const { id } = await postJson<{ id: string }>("/api/bulk", { name: fileName || "Bulk upload" });
      setBatchId(id);
      for (const l of valid) {
        try {
          const res = await postJson<Priced>(`/api/bulk/${id}/row`, { from, packaging: pack, purpose, strategy, row: l.row });
          setPriced((p) => ({ ...p, [l.line]: res }));
        } catch (e) {
          setPriced((p) => ({ ...p, [l.line]: { error: (e as Error).message } }));
        }
      }
    } catch (e) {
      setFileError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  const fromOk = from.first_name && from.line1 && from.city && from.state && from.phone && from.email && from.zip;

  return (
    <div className="space-y-6">
      <section className="card space-y-4">
        <h2 className="text-lg font-medium text-navy">1. Sender (pickup address)</h2>
        <AddressFields idPrefix="bulk-from" value={from} onChange={setFrom} countries={countries} lockCountry saved={saved} />
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-medium text-navy">2. How to ship</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="bulk-pack">Packaging</label>
            <select id="bulk-pack" className="input" value={pack} onChange={(e) => setPack(e.target.value)}>
              {packaging.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.dims})</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="bulk-purpose">Reason</label>
            <select id="bulk-purpose" className="input" value={purpose} onChange={(e) => setPurpose(e.target.value as typeof purpose)}>
              <option value="commercial">Sale to a customer</option>
              <option value="personal">Personal / gift</option>
              <option value="sample">Sample</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="bulk-strategy">Pick the carrier that is</label>
            <select id="bulk-strategy" className="input" value={strategy} onChange={(e) => setStrategy(e.target.value as typeof strategy)}>
              <option value="cheapest">Cheapest</option>
              <option value="fastest">Fastest</option>
            </select>
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-navy">3. Upload your orders</h2>
          <a href="/templates/bulk-shipments.csv" download className="text-sm font-semibold text-purple">Download the template (CSV)</a>
        </div>
        <p className="text-sm text-navy/60">One row per parcel, up to 100. In Excel or Google Sheets, use File → Save as / Download → CSV.</p>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-silver bg-mist px-6 py-10 text-center hover:border-purple">
          <span className="font-medium text-navy">{fileName || "Choose a CSV file"}</span>
          <span className="text-xs text-navy/55">Click to browse</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        {fileError && <p className="text-sm text-danger">{fileError}</p>}

        {lines.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-silver/60">
            <table className="w-full text-left text-sm">
              <thead className="bg-mist text-xs uppercase tracking-wide text-navy/55">
                <tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Receiver</th><th className="px-3 py-2">Item</th><th className="px-3 py-2">Carrier</th><th className="px-3 py-2 text-right">Price</th></tr>
              </thead>
              <tbody className="divide-y divide-silver/50">
                {lines.map((l) => {
                  const p = priced[l.line];
                  return (
                    <tr key={l.line} className={l.error ? "bg-danger/5" : ""}>
                      <td className="px-3 py-2 text-navy/50">{l.line}</td>
                      <td className="px-3 py-2">{l.row ? `${l.row.to.first_name} ${l.row.to.last_name}, ${l.row.to.city} ${l.row.to.country}` : <span className="text-danger">{l.error}</span>}</td>
                      <td className="px-3 py-2">{l.row ? `${l.row.item.quantity} × ${l.row.item.name}, ${l.row.item.weight} kg` : ""}</td>
                      <td className="px-3 py-2">
                        {!p ? (running && l.row ? <span className="text-navy/40">…</span> : "") : "error" in p ? <span className="text-danger">{p.error}</span> : (
                          <>
                            <Link href={`/app/ship/parcel?q=${p.shipmentId}`} className="text-purple" title="Open to change carrier or add insurance">{p.carrier}</Link>
                            {p.dropoffAddress && <span className="block text-xs text-navy/55">Drop off: {p.dropoffAddress}</span>}
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{p && !("error" in p) ? formatMoney(p.totalMinor) : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {valid.length > 0 && !batchId && (
          <button type="button" className="btn-primary" disabled={!fromOk || !pack || running} onClick={priceAll}>
            Get prices for {valid.length} parcel{valid.length > 1 ? "s" : ""}
          </button>
        )}
        {!fromOk && valid.length > 0 && <p className="text-sm text-navy/60">Fill in the sender address first.</p>}
        {running && <p className="text-sm text-navy/60">Pricing {done.length} of {valid.length}… duties and live rates take a few seconds per parcel.</p>}
      </section>

      {batchId && !running && ok.length > 0 && (
        <section className="card space-y-3 border-purple">
          <div className="flex items-center justify-between">
            <p className="text-navy/70">{ok.length} parcel{ok.length > 1 ? "s" : ""} ready{done.length > ok.length ? ` · ${done.length - ok.length} need attention` : ""}</p>
            <p className="font-display text-2xl font-medium text-navy">{formatMoney(total)}</p>
          </div>
          <label className="flex items-start gap-3 text-sm text-navy/80">
            <input type="checkbox" className="mt-1" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
            <span>Contents match each description, nothing prohibited, and I accept the <a href="/terms" target="_blank" className="font-semibold text-purple">terms</a>.</span>
          </label>
          {payError && <p className="text-sm text-danger">{payError}</p>}
          <button
            type="button"
            className="btn-primary w-full"
            disabled={!accept}
            onClick={async () => {
              try {
                const { url } = await postJson<{ url: string }>(`/api/bulk/${batchId}/pay`, { acceptTerms: accept });
                window.location.href = url;
              } catch (e) {
                setPayError((e as Error).message);
              }
            }}
          >
            Pay {formatMoney(total)} and book all
          </button>
        </section>
      )}
    </div>
  );
}
