import "server-only";

/**
 * Low-level HTTP client for the Terminal Africa Shipping API (TShip).
 * Docs: https://docs.terminal.africa/tship
 * The secret key never leaves the server.
 */

const BASE_URLS = {
  sandbox: "https://sandbox.terminal.africa/v1",
  live: "https://api.terminal.africa/v1",
} as const;

export class TerminalError extends Error {
  constructor(
    message: string,
    public status: number,
    public path: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "TerminalError";
  }
}

type Envelope<T> = { status: boolean; message: string; data: T };

type Query = Record<string, string | number | boolean | string[] | undefined | null>;

function baseUrl() {
  return process.env.TERMINAL_ENV === "live" ? BASE_URLS.live : BASE_URLS.sandbox;
}

function secretKey() {
  const key = process.env.TERMINAL_SECRET_KEY;
  if (!key) throw new TerminalError("TERMINAL_SECRET_KEY is not set", 500, "");
  return key;
}

function buildUrl(path: string, query?: Query) {
  const url = new URL(baseUrl() + path);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    // Arrays repeat the parameter (e.g. shipment_ids=a&shipment_ids=b)
    if (Array.isArray(v)) v.forEach((item) => url.searchParams.append(k, item));
    else url.searchParams.set(k, String(v));
  }
  return url;
}

export async function terminalRequest<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  opts: { query?: Query; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
  });

  let json: Envelope<T> | undefined;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    throw new TerminalError(`Terminal returned a non-JSON response (${res.status})`, res.status, path);
  }

  if (!res.ok || json.status === false) {
    throw new TerminalError(json?.message || `Terminal request failed (${res.status})`, res.status, path, json);
  }
  return json.data;
}

/** For endpoints that return a file (rate card PDFs / Excel). */
export async function terminalDownload(path: string): Promise<Response> {
  const res = await fetch(buildUrl(path), {
    headers: { Authorization: `Bearer ${secretKey()}` },
    cache: "no-store",
  });
  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try {
      message = ((await res.json()) as Envelope<unknown>).message || message;
    } catch {}
    throw new TerminalError(message, res.status, path);
  }
  return res;
}
