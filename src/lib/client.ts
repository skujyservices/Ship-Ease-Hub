// Browser-side JSON POST that turns API errors into thrown Errors (with .status).
export async function postJson<T = Record<string, unknown>>(url: string, body: unknown = {}): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error ?? "Something went wrong"), { status: res.status });
  return json as T;
}
