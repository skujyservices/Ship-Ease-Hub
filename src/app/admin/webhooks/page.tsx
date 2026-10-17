import { db } from "@/lib/db";
import { getWebhooks } from "@/lib/terminal/api";
import { ActionButton } from "../ActionButton";
import { registerWebhook, removeWebhook, retryInboxEvent, setWebhookActive } from "../actions";
import { ErrorNote, PageTitle, Table, safe, td } from "../ui";

export default async function WebhooksPage() {
  const hooks = await safe(() => getWebhooks());
  const inbox = await db.webhookEvent.findMany({ where: { source: "terminal" }, orderBy: { createdAt: "desc" }, take: 50 });
  const ours = `${process.env.APP_URL}/api/webhooks/terminal`;

  return (
    <div className="space-y-8">
      <div>
        <PageTitle
          title="Webhooks"
          subtitle="Terminal sends every status change here. That's what drives customer notifications and the tracking timeline."
        />
        <ErrorNote error={hooks.error} />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <ActionButton className="btn-primary" action={registerWebhook}>Register this app with Terminal</ActionButton>
          <span className="font-mono text-xs text-navy/60">{ours}</span>
        </div>
        <Table head={["Name", "URL", "Mode", "Events", "Status", ""]}>
          {(hooks.data?.webhooks ?? []).map((w) => (
            <tr key={w.webhook_id}>
              <td className={td}>{w.name}</td>
              <td className={`${td} font-mono text-xs`}>{w.url}</td>
              <td className={td}>{w.live ? "Live" : "Test"}</td>
              <td className={td}>{(w.events ?? w.event ?? []).length}</td>
              <td className={td}>
                <ActionButton className={`chip ${w.active ? "bg-success/10 text-success" : "bg-mist text-navy"}`} action={setWebhookActive.bind(null, w.webhook_id, !w.active)}>
                  {w.active ? "Active · pause" : "Paused · resume"}
                </ActionButton>
              </td>
              <td className={td}>
                <ActionButton className="text-xs font-semibold text-danger" confirmText="Delete this webhook?" action={removeWebhook.bind(null, w.webhook_id)}>Delete</ActionButton>
              </td>
            </tr>
          ))}
        </Table>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-navy">Received events (latest 50)</h2>
        <Table head={["Received", "Event", "Result", ""]}>
          {inbox.map((e) => (
            <tr key={e.id}>
              <td className={td}>{e.createdAt.toLocaleString("en-GB")}</td>
              <td className={`${td} font-mono text-xs`}>{e.event}</td>
              <td className={td}>
                {e.processedAt ? <span className="text-success">Processed</span> : <span className="text-danger">{e.error ?? "Pending"}</span>}
              </td>
              <td className={td}>{!e.processedAt && <ActionButton action={retryInboxEvent.bind(null, e.id)}>Retry</ActionButton>}</td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
