import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings, WAREHOUSES, type WarehouseCode } from "@/lib/settings";
import { STATUS } from "@/lib/status";
import { formatMoney } from "@/lib/money";
import { storageState } from "@/lib/inbound/service";
import { ActionForm } from "../ActionForm";
import { PageTitle, Table, td } from "../ui";
import { arriveSelected, collectAtDesk, dispatchSelected, logPackage } from "./actions";
import { PhotoInput } from "./PhotoInput";
import { storageReady } from "@/lib/storage";

const TABS = [
  ["intake", "Package intake"],
  ["dispatch", "Dispatch"],
  ["arrivals", "Lagos arrivals"],
  ["desk", "Pickup desk"],
] as const;

export default async function InboundOps({ searchParams }: PageProps<"/admin/inbound">) {
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "intake";

  return (
    <div>
      <PageTitle title="Shop & Ship operations" subtitle="Log packages from partner confirmations, send them to Lagos and hand them over." />
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`/admin/inbound?tab=${key}`} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${tab === key ? "bg-navy text-white" : "bg-white text-navy/70"}`}>
            {label}
          </Link>
        ))}
      </div>
      {tab === "intake" && <Intake suite={typeof sp.suite === "string" ? sp.suite.toUpperCase() : ""} />}
      {tab === "dispatch" && <Dispatch />}
      {tab === "arrivals" && <Arrivals />}
      {tab === "desk" && <Desk code={typeof sp.code === "string" ? sp.code.toUpperCase() : ""} />}
    </div>
  );
}

async function Intake({ suite }: { suite: string }) {
  const customer = suite ? await db.user.findUnique({ where: { suiteId: suite } }) : null;
  const expected = customer ? await db.package.findMany({ where: { userId: customer.id, status: "EXPECTED" }, orderBy: { createdAt: "desc" } }) : [];
  const recent = await db.package.findMany({ where: { status: "RECEIVED" }, include: { user: true }, orderBy: { receivedAt: "desc" }, take: 15 });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="card space-y-4">
        <form className="flex gap-2">
          <input type="hidden" name="tab" value="intake" />
          <input name="suite" defaultValue={suite} className="input" placeholder="Customer suite ID, e.g. SEH-10482" />
          <button className="btn-ghost">Find</button>
        </form>
        {suite && !customer && <p className="text-sm text-danger">No customer with suite ID {suite}.</p>}
        {customer && (
          <p className="rounded-2xl bg-mist px-4 py-3 text-sm">
            <b>{customer.name}</b> · {customer.email} · {customer.phone}
          </p>
        )}
        <ActionForm action={logPackage} submit="Log package as received">
          {suite ? <input type="hidden" name="suiteId" value={suite} /> : <input name="suiteId" className="input" placeholder="Suite ID, e.g. SEH-10482" required />}
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="warehouse" className="input" defaultValue="US" aria-label="Warehouse">
              {(Object.keys(WAREHOUSES) as WarehouseCode[]).map((w) => <option key={w} value={w}>{WAREHOUSES[w]}</option>)}
            </select>
            <select name="matchId" className="input" defaultValue="" aria-label="Match a pre-alert">
              <option value="">No pre-alert / new package</option>
              {expected.map((p) => <option key={p.id} value={p.id}>{WAREHOUSES[p.warehouse as WarehouseCode]}: {p.store} · {p.description}</option>)}
            </select>
            <input name="description" className="input sm:col-span-2" placeholder="What's inside" required />
            <input name="store" className="input" placeholder="Store" />
            <input name="storeTracking" className="input" placeholder="Store tracking no." />
            <input name="weightKg" type="number" step="0.01" min="0" className="input" placeholder="Weight (kg)" required />
            <div className="grid grid-cols-3 gap-2">
              <input name="lengthCm" type="number" step="0.1" min="0" className="input" placeholder="L cm" />
              <input name="widthCm" type="number" step="0.1" min="0" className="input" placeholder="W cm" />
              <input name="heightCm" type="number" step="0.1" min="0" className="input" placeholder="H cm" />
            </div>
            <PhotoInput enabled={storageReady()} />
            <textarea name="photos" className="input sm:col-span-2" rows={2} placeholder="Photo links from the partner (one per line, optional)" aria-label="Photo links" />
            <input name="notes" className="input sm:col-span-2" placeholder="Notes (damage, extra items…)" />
          </div>
        </ActionForm>
      </div>

      <div>
        <h2 className="mb-3 font-medium text-navy">Recently received</h2>
        <Table head={["Customer", "Package", "Warehouse", "Kg"]}>
          {recent.map((p) => (
            <tr key={p.id}>
              <td className={td}>{p.user.name}<span className="block font-mono text-xs text-navy/60">{p.user.suiteId}</span></td>
              <td className={td}>{p.description}</td>
              <td className={td}>{WAREHOUSES[p.warehouse as WarehouseCode]}</td>
              <td className={td}>{p.weightKg}</td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}

async function Dispatch() {
  const ready = await db.shipment.findMany({
    where: { kind: "INBOUND", status: STATUS.AWAITING_DISPATCH },
    include: { user: true, packages: true },
    orderBy: { updatedAt: "asc" },
  });
  if (!ready.length) return <p className="card text-sm text-navy/60">Nothing waiting to be dispatched.</p>;
  return (
    <ActionForm action={dispatchSelected} submit="Mark ticked as shipped">
      <Table head={["", "Code", "Customer", "From", "Packages", "Kg", "Combine"]}>
        {ready.map((s) => (
          <tr key={s.id}>
            <td className={td}><input type="checkbox" name="ids" value={s.id} aria-label={`Select ${s.code}`} /></td>
            <td className={`${td} font-mono`}><Link className="text-purple" href={`/admin/shipments/${s.id}`}>{s.code}</Link></td>
            <td className={td}>{s.user?.name}<span className="block font-mono text-xs text-navy/60">{s.user?.suiteId}</span></td>
            <td className={td}>{WAREHOUSES[s.warehouse as WarehouseCode]}</td>
            <td className={td}>{s.packages.map((p) => p.description).join("; ")}</td>
            <td className={td}>{s.chargeableKg}</td>
            <td className={td}>{s.consolidate && s.packages.length > 1 ? "Yes" : "No"}</td>
          </tr>
        ))}
      </Table>
      <input name="airwayBill" className="input max-w-sm" placeholder="Partner airway bill / flight reference (optional)" />
    </ActionForm>
  );
}

async function Arrivals() {
  const inTransit = await db.shipment.findMany({ where: { kind: "INBOUND", status: STATUS.SHIPPED }, include: { user: true }, orderBy: { updatedAt: "asc" } });
  if (!inTransit.length) return <p className="card text-sm text-navy/60">No shipments on the way to Lagos.</p>;
  return (
    <ActionForm action={arriveSelected} submit="Arrived in Lagos: notify customers to collect">
      <Table head={["", "Code", "Customer", "From", "Airway bill"]}>
        {inTransit.map((s) => (
          <tr key={s.id}>
            <td className={td}><input type="checkbox" name="ids" value={s.id} aria-label={`Select ${s.code}`} /></td>
            <td className={`${td} font-mono`}>{s.code}</td>
            <td className={td}>{s.user?.name} · {s.user?.phone}</td>
            <td className={td}>{WAREHOUSES[s.warehouse as WarehouseCode]}</td>
            <td className={td}>{s.airwayBill ?? "–"}</td>
          </tr>
        ))}
      </Table>
    </ActionForm>
  );
}

async function Desk({ code }: { code: string }) {
  const settings = await getSettings();
  const s = code ? await db.shipment.findUnique({ where: { pickupCode: code }, include: { user: true, packages: true } }) : null;
  const waiting = await db.shipment.findMany({ where: { status: STATUS.READY_FOR_PICKUP }, include: { user: true }, orderBy: { readyAt: "asc" } });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card space-y-4">
        <form className="flex gap-2">
          <input type="hidden" name="tab" value="desk" />
          <input name="code" defaultValue={code} className="input font-mono uppercase tracking-widest" placeholder="Pickup code" autoFocus />
          <button className="btn-ghost">Look up</button>
        </form>
        {code && !s && <p className="text-sm text-danger">No package with pickup code {code}.</p>}
        {s && (() => {
          const st = storageState(s, settings);
          return (
            <div className="space-y-3">
              <div className="rounded-2xl bg-mist p-4 text-sm">
                <p className="text-lg font-medium text-navy">{s.user?.name}</p>
                <p className="text-navy/70">{s.user?.phone} · {s.code} · {s.status === STATUS.READY_FOR_PICKUP ? `day ${st.day}` : s.status}</p>
                <ul className="mt-2 list-disc pl-5">{s.packages.map((p) => <li key={p.id}>{p.description}</li>)}</ul>
              </div>
              <p className={`text-sm font-semibold ${st.outstandingMinor ? "text-danger" : "text-success"}`}>
                {st.outstandingMinor ? `Storage fee owed: ${formatMoney(st.outstandingMinor)}. Ask the customer to pay in the app first.` : "Nothing owed."}
              </p>
              {s.status === STATUS.READY_FOR_PICKUP && (
                <ActionForm action={collectAtDesk} submit="Hand over · mark collected">
                  <input type="hidden" name="code" value={s.pickupCode ?? ""} />
                  {st.outstandingMinor > 0 && (
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="waive" /> Waive the fee (admin only)</label>
                  )}
                </ActionForm>
              )}
            </div>
          );
        })()}
      </div>
      <div>
        <h2 className="mb-3 font-medium text-navy">Waiting for collection</h2>
        <Table head={["Code", "Customer", "Day", "Owed"]}>
          {waiting.map((w) => {
            const st = storageState(w, settings);
            return (
              <tr key={w.id}>
                <td className={`${td} font-mono`}><Link className="text-purple" href={`/admin/inbound?tab=desk&code=${w.pickupCode}`}>{w.pickupCode}</Link></td>
                <td className={td}>{w.user?.name}<span className="block text-xs text-navy/60">{w.user?.phone}</span></td>
                <td className={`${td} ${st.day >= settings.storageMaxDays ? "font-semibold text-danger" : ""}`}>{st.day} / {settings.storageMaxDays}</td>
                <td className={td}>{st.outstandingMinor ? formatMoney(st.outstandingMinor) : "–"}</td>
              </tr>
            );
          })}
        </Table>
      </div>
    </div>
  );
}
