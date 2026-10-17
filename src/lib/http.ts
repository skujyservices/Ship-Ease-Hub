import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { TerminalError } from "./terminal/client";
import { db } from "./db";
import { getCurrentUser, type CurrentUser } from "./auth";

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
      if (e instanceof TerminalError) {
        console.error("Terminal error", e.path, e.status, e.message);
        // Missing/invalid API key is our problem, not the customer's: don't leak config details
        if (!e.path || e.status === 401)
          return NextResponse.json({ error: "Shipping prices are temporarily unavailable. Please try again shortly." }, { status: 503 });
        return NextResponse.json({ error: e.message }, { status: e.status >= 500 ? 502 : 400 });
      }
      console.error(e);
      return NextResponse.json({ error: e instanceof Error ? e.message : "Something went wrong" }, { status: 500 });
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

// Very small fixed-window limiter (per server instance) for endpoints that cost money upstream.
const hits = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  if (++entry.count > limit) throw new HttpError(429, "Too many requests. Please wait a few minutes and try again.");
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
