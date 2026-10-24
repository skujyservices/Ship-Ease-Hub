import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { TerminalError } from "./terminal/client";
import { db } from "./db";
import { getCurrentUser, type CurrentUser } from "./auth";
import { reportError } from "./errors";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Wraps a route handler: turns thrown errors into JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid input", issues: e.issues }, { status: 422 });
      const req = args[0] instanceof Request ? args[0] : null;
      const where = { path: req ? new URL(req.url).pathname : "unknown", routeType: "route" };
      if (e instanceof TerminalError) {
        console.error("Terminal error", e.path, e.status, e.message);
        if (e.status >= 500 || e.status === 401) await reportError(e, where); // Terminal down or our key rejected
        // Missing/invalid API key is our problem, not the customer's: don't leak config details
        if (!e.path || e.status === 401)
          return NextResponse.json({ error: "Shipping prices are temporarily unavailable. Please try again shortly." }, { status: 503 });
        return NextResponse.json({ error: e.message }, { status: e.status >= 500 ? 502 : 400 });
      }
      console.error(e);
      await reportError(e, where);
      return NextResponse.json({ error: "Something went wrong on our side. We've been alerted." }, { status: 500 });
    }
  };
}

/**
 * Loads a shipment the caller may see: its owner, staff, or anyone holding the id
 * of an unclaimed guest quote.
 */
export async function shipmentForRequest(id: string, opts: { requireUser?: boolean } = {}) {
  const user = await getCurrentUser();
  if (opts.requireUser && !user) throw new HttpError(401, "Please sign in to continue");
  const shipment = await db.shipment.findUnique({ where: { id } });
  if (!shipment) throw new HttpError(404, "Shipment not found");
  const staff = user && user.role !== "CUSTOMER";
  if (shipment.userId && shipment.userId !== user?.id && !staff) throw new HttpError(404, "Shipment not found");
  return { shipment, user: user as CurrentUser | null };
}

/**
 * Fixed-window rate limit stored in the database, so it holds across all serverless
 * instances (an in-memory counter resets whenever Vercel starts a new one).
 * One atomic upsert per call: a new window starts once the old one has expired.
 */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const rows = await db.$queryRaw<{ count: number }[]>`
    insert into "RateLimit" ("key", "count", "resetAt")
    values (${key}, 1, now() + ${windowMs} * interval '1 millisecond')
    on conflict ("key") do update set
      "count"   = case when "RateLimit"."resetAt" < now() then 1 else "RateLimit"."count" + 1 end,
      "resetAt" = case when "RateLimit"."resetAt" < now() then now() + ${windowMs} * interval '1 millisecond' else "RateLimit"."resetAt" end
    returning "count"`;
  if ((rows[0]?.count ?? 0) > limit) throw new HttpError(429, "Too many requests. Please wait a few minutes and try again.");
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
