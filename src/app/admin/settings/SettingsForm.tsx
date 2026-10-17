"use client";

import { useActionState } from "react";
import type { Settings } from "@/lib/settings";
import { updateSettings, type ActionResult } from "../actions";

const naira = (minor: number) => minor / 100;

export function SettingsForm({ s }: { s: Settings }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(updateSettings, undefined);

  return (
    <form action={action} className="space-y-6">
      <Group title="Send a parcel (Terminal)" note="Your margin goes on the carrier charge only. Duties, insurance and documents are passed on at cost.">
        <Num name="outboundMarkupPercent" label="Markup %" value={s.outboundMarkupPercent} step={0.5} />
        <Num name="outboundMarkupFixed" label="Plus fixed fee (₦)" value={naira(s.outboundMarkupFixedMinor)} />
        <Num name="terminalLowBalance" label="Warn when Terminal wallet below (₦)" value={naira(s.terminalLowBalanceMinor)} />
        <label className="flex items-center gap-2 text-sm text-navy sm:col-span-3">
          <input type="checkbox" name="dutyOnRateList" defaultChecked={s.dutyOnRateList} />
          Show duties on every carrier in the rate list (about $0.04 per carrier per quote)
        </label>
      </Group>

      <Group title="Shop & Ship: partner air rates (per kg, ₦)" note="What partners charge you, duties included. Customers pay this plus the inbound markup.">
        {(["US", "GB", "CN"] as const).map((c) => (
          <div key={c} className="grid gap-2">
            <Num name={`rate${c}`} label={`${c === "GB" ? "UK" : c === "CN" ? "China" : "USA"} ₦/kg`} value={naira(s.inboundRates[c].perKgMinor)} />
            <Text name={`eta${c}`} label="Delivery time" value={s.inboundRates[c].etaDays} />
          </div>
        ))}
        <Num name="inboundMarkupPercent" label="Inbound markup %" value={s.inboundMarkupPercent} step={0.5} />
        <Num name="volumetricDivisor" label="Volumetric divisor (L×W×H ÷)" value={s.volumetricDivisor} />
      </Group>

      <Group title="Buy for me and storage">
        <Num name="procurementFeePercent" label="Buy-for-me fee %" value={s.procurementFeePercent} step={0.5} />
        <Num name="storageFreeDays" label="Free days at Yaba" value={s.storageFreeDays} />
        <Num name="storageFeePerDay" label="Storage fee per day (₦)" value={naira(s.storageFeePerDayMinor)} />
        <Num name="storageMaxDays" label="Dispose after (days)" value={s.storageMaxDays} />
      </Group>

      <Group title="Exchange rates (₦ per unit)">
        <Num name="fxUSD" label="USD" value={s.fxToNgn.USD} />
        <Num name="fxGBP" label="GBP" value={s.fxToNgn.GBP} />
        <Num name="fxCNY" label="CNY" value={s.fxToNgn.CNY} step={0.1} />
      </Group>

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
        {state?.ok && <span className="text-sm text-success">{state.ok}</span>}
        {state?.error && <span className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <fieldset className="card">
      <legend className="px-1 font-bold text-navy">{title}</legend>
      {note && <p className="mb-4 text-sm text-navy/60">{note}</p>}
      <div className="grid gap-4 sm:grid-cols-3">{children}</div>
    </fieldset>
  );
}

function Num({ name, label, value, step = 1 }: { name: string; label: string; value: number; step?: number }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} className="input" type="number" min={0} step={step} defaultValue={value} required />
    </div>
  );
}

function Text({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} className="input" defaultValue={value} />
    </div>
  );
}
