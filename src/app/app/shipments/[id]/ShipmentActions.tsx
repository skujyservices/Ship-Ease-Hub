"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function post(url: string, body: unknown = {}) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong");
  return json;
}

export function ShipmentActions({
  id,
  canCancel,
  canClaim,
  canRefresh,
  adjustmentDue,
  canShipAgain,
  unpaid = false,
}: {
  id: string;
  canCancel: boolean;
  canClaim: boolean;
  canRefresh: boolean;
  adjustmentDue: string | null;
  canShipAgain: boolean;
  unpaid?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claim, setClaim] = useState({ reason: "lost-in-transit", description: "" });

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!canCancel && !canClaim && !canRefresh && !adjustmentDue && !canShipAgain) return null;

  return (
    <div className="card space-y-3">
      {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}

      {adjustmentDue && (
        <div className="rounded-xl bg-gold/15 p-4">
          <p className="text-sm font-semibold text-navy">The carrier weighed your parcel and it was heavier than declared.</p>
          <button
            className="btn-primary mt-3"
            disabled={Boolean(busy)}
            onClick={() =>
              run("pay", async () => {
                const { url } = await post(`/api/parcel/${id}/pay-adjustment`);
                window.location.href = url;
              })
            }
          >
            Pay the difference ({adjustmentDue})
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canShipAgain && (
          <button
            className="btn-primary"
            disabled={Boolean(busy)}
            onClick={() =>
              run("again", async () => {
                const { id: next } = await post(`/api/parcel/${id}/again`);
                router.push(`/app/ship/parcel?q=${next}`);
              })
            }
          >
            {busy === "again" ? "Getting fresh prices…" : "Ship again"}
          </button>
        )}
        {canRefresh && (
          <button className="btn-ghost" disabled={Boolean(busy)} onClick={() => run("refresh", () => post(`/api/parcel/${id}/track`))}>
            {busy === "refresh" ? "Checking…" : "Refresh tracking"}
          </button>
        )}
        {canClaim && (
          <button className="btn-ghost" onClick={() => setClaimOpen((o) => !o)}>
            Report lost or damaged
          </button>
        )}
        {canCancel && (
          <button
            className="btn-danger"
            disabled={Boolean(busy)}
            onClick={() => confirm(unpaid ? "Cancel this shipment?" : "Cancel this shipment? You'll get a full refund.") && run("cancel", () => post(`/api/parcel/${id}/cancel`))}
          >
            {busy === "cancel" ? "Cancelling…" : unpaid ? "Cancel" : "Cancel and refund"}
          </button>
        )}
      </div>

      {claimOpen && (
        <form
          className="space-y-3 border-t border-silver pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            run("claim", async () => {
              await post(`/api/parcel/${id}/claim`, claim);
              setClaimOpen(false);
            });
          }}
        >
          <div>
            <label className="label" htmlFor="reason">What happened?</label>
            <select id="reason" className="input" value={claim.reason} onChange={(e) => setClaim({ ...claim, reason: e.target.value })}>
              <option value="lost-in-transit">Lost in transit</option>
              <option value="damage">Arrived damaged</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="desc">Details</label>
            <textarea id="desc" className="input min-h-28" value={claim.description} onChange={(e) => setClaim({ ...claim, description: e.target.value })} />
          </div>
          <button className="btn-primary" disabled={Boolean(busy)}>{busy === "claim" ? "Filing…" : "File insurance claim"}</button>
        </form>
      )}
    </div>
  );
}
