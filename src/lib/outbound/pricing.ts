import type { Settings } from "@/lib/settings";

/**
 * Customer price for an outbound parcel. Every input amount comes from Terminal.
 * SEH's markup goes on the carrier charges (shipping + priority pickup) only.
 * Duties, insurance and documents are passed through at cost.
 */

export type PriceLine = { key: string; label: string; minor: number };

export const markup = (minor: number, s: Pick<Settings, "outboundMarkupPercent" | "outboundMarkupFixedMinor">) =>
  Math.round(minor * (1 + s.outboundMarkupPercent / 100)) + s.outboundMarkupFixedMinor;

export function buildPrice(
  input: {
    shippingMinor: number;
    dutyMinor?: number | null;
    insuranceMinor?: number;
    priorityPickupMinor?: number;
    documents?: { name: string; minor: number }[];
  },
  s: Pick<Settings, "outboundMarkupPercent" | "outboundMarkupFixedMinor">,
) {
  const lines: PriceLine[] = [{ key: "shipping", label: "Shipping", minor: markup(input.shippingMinor, s) }];
  if (input.priorityPickupMinor)
    lines.push({
      key: "priority",
      label: "Priority pickup",
      minor: Math.round(input.priorityPickupMinor * (1 + s.outboundMarkupPercent / 100)),
    });
  if (input.dutyMinor) lines.push({ key: "duty", label: "Import duties & taxes", minor: input.dutyMinor });
  if (input.insuranceMinor) lines.push({ key: "insurance", label: "Insurance", minor: input.insuranceMinor });
  for (const d of input.documents ?? []) lines.push({ key: `doc:${d.name}`, label: d.name, minor: d.minor });
  return { lines, totalMinor: lines.reduce((sum, l) => sum + l.minor, 0) };
}
