import { z } from "zod";
import { addressSchema } from "./schema";

/** One spreadsheet row = one receiver + one item. Shared by the bulk upload screen and API. */
export const BULK_COLUMNS = [
  "first_name", "last_name", "email", "phone", "line1", "line2", "city", "state", "country", "zip",
  "item_name", "item_description", "item_value_ngn", "quantity", "weight_kg", "hs_code",
] as const;

export const bulkRowSchema = z.object({
  to: addressSchema,
  item: z.object({
    name: z.string().trim().min(1, "item_name is required"),
    description: z.string().trim().min(1, "item_description is required"),
    value: z.number().positive("item_value_ngn must be more than 0"),
    quantity: z.number().int().positive("quantity must be a whole number"),
    weight: z.number().positive("weight_kg must be more than 0"),
    hs_code: z.string().trim().optional(),
  }),
});
export type BulkRow = z.infer<typeof bulkRowSchema>;

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

/** CSV text → validated rows (with per-row errors). */
export function rowsFromCsv(text: string) {
  const [header, ...body] = parseCsv(text.replace(/^﻿/, ""));
  if (!header) return { error: "The file is empty.", rows: [] as { line: number; row?: BulkRow; error?: string }[] };
  const idx = Object.fromEntries(header.map((h, i) => [h.trim().toLowerCase(), i]));
  const missing = BULK_COLUMNS.filter((c) => c !== "line2" && c !== "hs_code" && idx[c] === undefined);
  if (missing.length) return { error: `Missing columns: ${missing.join(", ")}. Use the template.`, rows: [] };
  const get = (r: string[], c: string) => (idx[c] === undefined ? "" : (r[idx[c]] ?? "").trim());

  const rows = body.slice(0, 100).map((r, n) => {
    const parsed = bulkRowSchema.safeParse({
      to: {
        first_name: get(r, "first_name"), last_name: get(r, "last_name"), email: get(r, "email"), phone: get(r, "phone"),
        line1: get(r, "line1"), line2: get(r, "line2"), city: get(r, "city"), state: get(r, "state"),
        country: get(r, "country").toUpperCase(), zip: get(r, "zip"),
      },
      item: {
        name: get(r, "item_name"), description: get(r, "item_description"),
        value: Number(get(r, "item_value_ngn").replace(/,/g, "")), quantity: Number(get(r, "quantity") || 1),
        weight: Number(get(r, "weight_kg")), hs_code: get(r, "hs_code") || undefined,
      },
    });
    return parsed.success ? { line: n + 2, row: parsed.data } : { line: n + 2, error: parsed.error.issues[0].message };
  });
  return { error: body.length > 100 ? "Only the first 100 rows are used. Split bigger files." : null, rows };
}
