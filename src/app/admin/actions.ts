"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import * as terminal from "@/lib/terminal/api";
import { processTerminalEvent } from "@/lib/terminal/events";
import { bookPaidShipment, cancelOnTerminal, refreshTracking } from "@/lib/outbound/service";
import { tryRefund } from "@/lib/checkout";
import { saveSettings, settingsSchema } from "@/lib/settings";
import { STATUS } from "@/lib/status";

export type ActionResult = { ok?: string; error?: string } | undefined;

async function attempt(fn: () => Promise<string>, path: string, adminOnly = false): Promise<ActionResult> {
  const user = await requireStaff();
  if (adminOnly && user.role !== "ADMIN") return { error: "Only admins can do this." };
  try {
    const ok = await fn();
    revalidatePath(path);
    return { ok };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

// ---- Shipments ----
export async function retryBooking(id: string): Promise<ActionResult> {
  return attempt(async () => {
    const s = await bookPaidShipment(id);
    if (s.status === STATUS.BOOKING_FAILED) throw new Error(s.bookingError ?? "Booking failed again");
    return "Booked on Terminal";
  }, `/admin/shipments/${id}`);
}

export async function adminRefresh(id: string): Promise<ActionResult> {
  return attempt(async () => {
    const s = await refreshTracking(id);
    return `Status: ${s.status}`;
  }, `/admin/shipments/${id}`);
}

export async function adminCancelAndRefund(id: string): Promise<ActionResult> {
  return attempt(async () => {
    const s = await db.shipment.findUniqueOrThrow({ where: { id } });
    if (s.status !== STATUS.BOOKING_FAILED && s.terminalShipmentId) await cancelOnTerminal(id);
    await db.shipment.update({ where: { id }, data: { status: STATUS.CANCELLED } });
    const payment = await db.payment.findFirst({ where: { shipmentId: id, purpose: "SHIPMENT", status: "SUCCESS" } });
    if (!payment) return "Cancelled";
    const refund = await tryRefund(payment);
    return refund.ok ? "Cancelled and refunded" : `Cancelled. Refund failed (${refund.error}). Refund ${payment.reference} manually in ${payment.provider === "PAYSTACK" ? "Paystack" : "Stripe"}.`;
  }, `/admin/shipments/${id}`);
}

export async function replayShipmentWebhook(id: string, event: string): Promise<ActionResult> {
  return attempt(async () => {
    const s = await db.shipment.findUniqueOrThrow({ where: { id } });
    await terminal.replayWebhook({ shipment_id: s.terminalShipmentId!, event });
    return "Replay queued by Terminal";
  }, `/admin/shipments/${id}`);
}

// ---- Carriers ----
export async function toggleCarrier(carrierId: string, scope: "domestic" | "regional" | "international", enable: boolean): Promise<ActionResult> {
  return attempt(async () => {
    await (enable ? terminal.enableCarrier : terminal.disableCarrier)(carrierId, { [scope]: true });
    return `${enable ? "Enabled" : "Disabled"} for ${scope}`;
  }, "/admin/carriers", true);
}

// ---- Webhooks ----
export async function registerWebhook(): Promise<ActionResult> {
  return attempt(async () => {
    const url = `${process.env.APP_URL}/api/webhooks/terminal`;
    const live = process.env.TERMINAL_ENV === "live";
    if (live && !url.startsWith("https://")) throw new Error("Live webhooks need an https APP_URL");
    const { webhooks } = await terminal.getWebhooks();
    if (webhooks.some((w) => w.url === url && w.live === live)) return "Already registered";
    await terminal.createWebhook({ name: "Ship Ease Hub", url, events: terminal.ALL_WEBHOOK_EVENTS, live, active: true });
    return `Registered ${url}`;
  }, "/admin/webhooks", true);
}

export async function setWebhookActive(webhookId: string, active: boolean): Promise<ActionResult> {
  return attempt(async () => {
    await (active ? terminal.enableWebhook : terminal.disableWebhook)(webhookId);
    return active ? "Enabled" : "Disabled";
  }, "/admin/webhooks", true);
}

export async function removeWebhook(webhookId: string): Promise<ActionResult> {
  return attempt(async () => {
    await terminal.deleteWebhook(webhookId);
    return "Deleted";
  }, "/admin/webhooks", true);
}

export async function retryInboxEvent(id: string): Promise<ActionResult> {
  return attempt(async () => {
    const ev = await db.webhookEvent.findUniqueOrThrow({ where: { id } });
    await processTerminalEvent(ev.payload as never);
    await db.webhookEvent.update({ where: { id }, data: { processedAt: new Date(), error: null } });
    return "Processed";
  }, "/admin/webhooks");
}

// ---- Settings ----
export async function updateSettings(_: ActionResult, form: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const n = (k: string) => Number(form.get(k));
    const naira = (k: string) => Math.round(n(k) * 100);
    const wh = (c: string) => ({
      line1: String(form.get(`${c}_line1`) ?? ""),
      line2: String(form.get(`${c}_line2`) ?? ""),
      city: String(form.get(`${c}_city`) ?? ""),
      state: String(form.get(`${c}_state`) ?? ""),
      zip: String(form.get(`${c}_zip`) ?? ""),
      phone: String(form.get(`${c}_phone`) ?? ""),
    });
    const value = settingsSchema.parse({
      warehouses: { US: wh("US"), GB: wh("GB"), CN: wh("CN") },
      outboundMarkupPercent: n("outboundMarkupPercent"),
      outboundMarkupFixedMinor: naira("outboundMarkupFixed"),
      dutyOnRateList: form.get("dutyOnRateList") === "on",
      terminalLowBalanceMinor: naira("terminalLowBalance"),
      inboundRates: {
        US: { perKgMinor: naira("rateUS"), etaDays: String(form.get("etaUS")) },
        GB: { perKgMinor: naira("rateGB"), etaDays: String(form.get("etaGB")) },
        CN: { perKgMinor: naira("rateCN"), etaDays: String(form.get("etaCN")) },
      },
      inboundMarkupPercent: n("inboundMarkupPercent"),
      volumetricDivisor: n("volumetricDivisor"),
      procurementFeePercent: n("procurementFeePercent"),
      storageFreeDays: n("storageFreeDays"),
      storageFeePerDayMinor: naira("storageFeePerDay"),
      storageMaxDays: n("storageMaxDays"),
      fxToNgn: { USD: n("fxUSD"), GBP: n("fxGBP"), CNY: n("fxCNY") },
    });
    await saveSettings(value);
    return "Settings saved";
  }, "/admin/settings", true);
}

// ---- Payments ----
export async function markRefunded(paymentId: string): Promise<ActionResult> {
  return attempt(async () => {
    await db.payment.update({ where: { id: paymentId }, data: { status: "REFUNDED", refundedAt: new Date() } });
    return "Marked as refunded";
  }, "/admin", true);
}
