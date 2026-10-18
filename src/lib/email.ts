import "server-only";
import { BRAND } from "./brand";

/**
 * Branded HTML email (inline styles only; email clients ignore stylesheets).
 * Navy header with the logo, white card, purple button, purple-to-gold stripe, contact footer.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function brandedEmail(input: { title: string; body: string; url?: string; cta?: string; lines?: [string, string][] }) {
  const app = process.env.APP_URL ?? "https://www.shipeasehub.com";
  const href = input.url ? (input.url.startsWith("http") ? input.url : `${app}${input.url}`) : null;
  const rows = (input.lines ?? [])
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#5a5a7a;font-size:14px">${esc(k)}</td><td style="padding:8px 0;color:#00002E;font-size:14px;font-weight:600;text-align:right">${esc(v)}</td></tr>`,
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#F4F5F8;font-family:Inter,Segoe UI,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F8;padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
  <tr><td style="background:#00002E;padding:22px 28px"><img src="${app}/brand/logo-email.png" height="28" alt="${BRAND.name}" style="display:block;height:28px"></td></tr>
  <tr><td style="height:4px;background:linear-gradient(90deg,#3C15C8 0%,#3C15C8 35%,#D4AF37 100%);background-color:#3C15C8"></td></tr>
  <tr><td style="padding:32px 28px 8px">
    <h1 style="margin:0 0 12px;font-size:24px;font-weight:400;color:#00002E;line-height:1.25">${esc(input.title)}</h1>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#3a3a5a">${esc(input.body)}</p>
    ${rows ? `<table role="presentation" width="100%" style="margin-top:20px;border-top:1px solid #E3E5EC;border-bottom:1px solid #E3E5EC">${rows}</table>` : ""}
    ${href ? `<p style="margin:28px 0 8px"><a href="${href}" style="display:inline-block;background:#3C15C8;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:13px 26px;border-radius:999px">${esc(input.cta ?? "View in Ship Ease Hub")}</a></p>` : ""}
  </td></tr>
  <tr><td style="padding:24px 28px 28px;color:#8a8aa3;font-size:12px;line-height:1.6">
    ${BRAND.tagline}<br>
    Lagos: ${BRAND.phonesNg.join(" · ")} · USA: ${BRAND.phoneUsa}<br>
    ${BRAND.website} · @${BRAND.instagram}
  </td></tr>
</table>
</td></tr></table></body></html>`;
}
