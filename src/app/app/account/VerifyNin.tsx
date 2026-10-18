"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client";

export function VerifyNin({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [first, ...rest] = defaultName.split(" ");
  const [f, setF] = useState({ first_name: first ?? "", last_name: rest.join(" "), nin: "", line1: "", city: "", state: "Lagos", zip: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  if (!open)
    return (
      <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
        Verify my identity (NIN)
      </button>
    );

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await postJson("/api/account/verify-nin", f);
          router.refresh();
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <p className="text-sm text-navy/65">Your name must match your NIN exactly. We don&apos;t store your NIN.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="First name" value={f.first_name} onChange={set("first_name")} aria-label="First name" required />
        <input className="input" placeholder="Last name" value={f.last_name} onChange={set("last_name")} aria-label="Last name" required />
        <input className="input sm:col-span-2" placeholder="NIN (11 digits)" inputMode="numeric" maxLength={11} value={f.nin} onChange={set("nin")} aria-label="NIN" required />
        <input className="input sm:col-span-2" placeholder="Home address in Nigeria" value={f.line1} onChange={set("line1")} aria-label="Street address" required />
        <input className="input" placeholder="City" value={f.city} onChange={set("city")} aria-label="City" required />
        <input className="input" placeholder="State" value={f.state} onChange={set("state")} aria-label="State" required />
        <input className="input" placeholder="Postcode" value={f.zip} onChange={set("zip")} aria-label="Postcode" required />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy}>{busy ? "Checking…" : "Verify"}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
