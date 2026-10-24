import "server-only";
import { db } from "./db";
import { rateLimit } from "./http";
import { sendEmail } from "./notify";

/**
 * Records a server error (Admin → Overview) and emails ADMIN_EMAIL, at most once an hour
 * per distinct error. Used by instrumentation.ts (uncaught errors) and by API routes'
 * handle() wrapper (errors they catch to return a tidy message). Never throws.
 */
export async function reportError(err: unknown, where: { path: string; routeType?: string; digest?: string | null }) {
  try {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 1000);
    const path = where.path.split("?")[0].slice(0, 300); // no query strings (may hold tokens)
    await db.errorLog.create({ data: { message, digest: where.digest ?? null, path, routeType: where.routeType } });

    const to = process.env.ADMIN_EMAIL;
    if (!to || !process.env.RESEND_API_KEY) return;
    try {
      await rateLimit(`alert:${where.digest ?? message.slice(0, 80)}`, 1, 3600_000);
    } catch {
      return; // already alerted about this one in the last hour
    }
    await sendEmail(to, {
      title: `Error on Ship Ease Hub: ${path}`,
      body: `${message} (${where.routeType ?? "server"}${where.digest ? `, digest ${where.digest}` : ""}). Recent errors are listed in Admin → Overview.`,
      url: "/admin",
      cta: "Open admin",
    });
  } catch (e) {
    console.error("error reporting failed", e);
  }
}
