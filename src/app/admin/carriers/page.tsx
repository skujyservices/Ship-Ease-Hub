import { getCarriers, getUser, getWalletBalance } from "@/lib/terminal/api";
import { ActionButton } from "../ActionButton";
import { toggleCarrier } from "../actions";
import { ErrorNote, PageTitle, Table, safe, td } from "../ui";

type Scope = "domestic" | "regional" | "international";

export default async function CarriersPage() {
  const all = await safe(() => getCarriers({ perPage: 200 }));
  // Which carriers are switched on for SEH's account, per scope
  const enabled = await safe(async () => {
    const wallet = await getWalletBalance();
    const user = await getUser(String(wallet.user));
    // The API returns plain carrier IDs per scope (the docs show { id, name } objects); accept both
    return user.carriers as Record<Scope, (string | { id: string })[]> | undefined;
  });
  const isOn = (id: string, scope: Scope) => enabled.data?.[scope]?.some((c) => (typeof c === "string" ? c : c.id) === id);

  return (
    <div>
      <PageTitle title="Carriers" subtitle="Choose which couriers customers see. Changes apply to new quotes." />
      <ErrorNote error={all.error} />
      <Table head={["Carrier", "Countries", "Domestic", "Regional", "International"]}>
        {(all.data?.carriers ?? []).map((c) => (
          <tr key={c.carrier_id}>
            <td className={td}>
              <span className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.logo && <img src={c.logo} alt="" className="h-8 w-8 rounded object-contain" />}
                <span>
                  <b>{c.name}</b>
                  <span className="block font-mono text-xs text-navy/60">{c.slug}</span>
                </span>
              </span>
            </td>
            <td className={`${td} max-w-[200px] text-xs text-navy/70`}>{c.available_countries?.join(", ")}</td>
            {(["domestic", "regional", "international"] as Scope[]).map((scope) => (
              <td key={scope} className={td}>
                {!c[scope] ? (
                  <span className="text-xs text-navy/40">n/a</span>
                ) : enabled.data ? (
                  isOn(c.carrier_id, scope) ? (
                    <ActionButton className="chip bg-success/10 text-success" action={toggleCarrier.bind(null, c.carrier_id, scope, false)}>On · turn off</ActionButton>
                  ) : (
                    <ActionButton className="chip bg-mist text-navy" action={toggleCarrier.bind(null, c.carrier_id, scope, true)}>Off · turn on</ActionButton>
                  )
                ) : (
                  <span className="flex gap-1">
                    <ActionButton className="chip bg-mist text-navy" action={toggleCarrier.bind(null, c.carrier_id, scope, true)}>Enable</ActionButton>
                    <ActionButton className="chip bg-mist text-navy" action={toggleCarrier.bind(null, c.carrier_id, scope, false)}>Disable</ActionButton>
                  </span>
                )}
              </td>
            ))}
          </tr>
        ))}
      </Table>
    </div>
  );
}
