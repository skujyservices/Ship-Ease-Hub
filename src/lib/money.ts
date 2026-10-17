// Money helpers. Amounts are kept in minor units (kobo, pence, cents) everywhere
// except at the edges (Terminal returns major-unit floats).

export const toMinor = (major: number) => Math.round(major * 100);
export const toMajor = (minor: number) => minor / 100;

export function formatMoney(minor: number, currency = "NGN") {
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(toMajor(minor));
}
