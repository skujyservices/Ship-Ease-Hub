import "server-only";
import crypto from "node:crypto";
import type { Package, Shipment } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettings, WAREHOUSES, type Settings, type WarehouseCode } from "@/lib/settings";
import { STATUS } from "@/lib/status";
import { notifyUser } from "@/lib/notify";
import { addEvent, newTrackingCode } from "@/lib/outbound/service";
import { formatMoney } from "@/lib/money";
import { BRAND } from "@/lib/brand";
import type { PriceLine } from "@/lib/outbound/pricing";

/**
 * Shop & Ship (USA / UK / China → Lagos), run with SEH's consolidator partners.
 * Package (logged at a foreign warehouse) → customer pays → staff dispatch → arrives Lagos
 * → ready for pickup (storage clock starts) → collected, or disposed after the limit.
 */

export const DAY_MS = 24 * 3600_000;

/** Billable weight: the larger of actual and volumetric (L×W×H ÷ divisor). */
export function chargeableKg(p: Pick<Package, "weightKg" | "lengthCm" | "widthCm" | "heightCm">, divisor: number) {
  const actual = p.weightKg ?? 0;
  const volumetric = p.lengthCm && p.widthCm && p.heightCm ? (p.lengthCm * p.widthCm * p.heightCm) / divisor : 0;
  return Math.max(actual, volumetric);
}

export function inboundPrice(packages: Package[], warehouse: WarehouseCode, s: Settings) {
  const kg = Math.ceil(packages.reduce((sum, p) => sum + chargeableKg(p, s.volumetricDivisor), 0) * 2) / 2; // bill in 0.5 kg steps
  const perKg = Math.round(s.inboundRates[warehouse].perKgMinor * (1 + s.inboundMarkupPercent / 100));
  const lines: PriceLine[] = [{ key: "freight", label: `Air freight, ${kg} kg × ${formatMoney(perKg)}/kg (duties included)`, minor: Math.round(kg * perKg) }];
  return { kg, perKg, lines, totalMinor: lines[0].minor };
}

export async function createInboundShipment(userId: string, packageIds: string[], consolidate: boolean) {
  const s = await getSettings();
  const packages = await db.package.findMany({ where: { id: { in: packageIds }, userId, status: "RECEIVED", shipmentId: null } });
  if (packages.length !== packageIds.length || !packages.length) throw new Error("Some packages are no longer available to ship.");
  const warehouse = packages[0].warehouse as WarehouseCode;
  if (packages.some((p) => p.warehouse !== warehouse)) throw new Error("Choose packages from one warehouse at a time.");
  if (!s.inboundRates[warehouse].perKgMinor) throw new Error("Shipping from this warehouse isn't priced yet. Please contact us.");

  const price = inboundPrice(packages, warehouse, s);
  return db.$transaction(async (tx) => {
    const shipment = await tx.shipment.create({
      data: {
        code: newTrackingCode(),
        kind: "INBOUND",
        userId,
        status: STATUS.AWAITING_PAYMENT,
        warehouse,
        consolidate,
        chargeableKg: price.kg,
        pricing: price.lines,
        totalMinor: price.totalMinor,
        fromAddress: { city: WAREHOUSES[warehouse], country: warehouse },
        toAddress: { city: "Lagos", country: "NG" },
        carrierName: "Ship Ease Hub Air",
      },
    });
    await tx.package.updateMany({ where: { id: { in: packageIds } }, data: { shipmentId: shipment.id } });
    return shipment;
  });
}

/** Unpaid inbound shipment cancelled: release its packages. */
export async function cancelInbound(shipment: Shipment) {
  await db.package.updateMany({ where: { shipmentId: shipment.id }, data: { shipmentId: null } });
  await db.shipment.update({ where: { id: shipment.id }, data: { status: STATUS.CANCELLED } });
}

export async function markInboundPaid(shipmentId: string) {
  const s = await db.shipment.update({ where: { id: shipmentId }, data: { status: STATUS.AWAITING_DISPATCH } });
  await addEvent(s.id, STATUS.AWAITING_DISPATCH, `Paid. Packing at our ${WAREHOUSES[s.warehouse as WarehouseCode]} warehouse`, "system");
  if (s.userId)
    await notifyUser(s.userId, {
      title: `${s.code}: payment received`,
      body: `We're packing your parcel at our ${WAREHOUSES[s.warehouse as WarehouseCode]} warehouse. We'll tell you when it flies.`,
      url: `/app/shipments/${s.id}`,
    });
}

export async function dispatchInbound(shipmentIds: string[], airwayBill: string) {
  for (const id of shipmentIds) {
    const s = await db.shipment.update({ where: { id }, data: { status: STATUS.SHIPPED, airwayBill: airwayBill || null } });
    await db.package.updateMany({ where: { shipmentId: id }, data: { status: "SHIPPED" } });
    await addEvent(id, STATUS.SHIPPED, `Flown out of ${WAREHOUSES[s.warehouse as WarehouseCode]}`, "staff");
    if (s.userId)
      await notifyUser(s.userId, {
        title: `${s.code} is on its way to Lagos`,
        body: `Your parcel has left our ${WAREHOUSES[s.warehouse as WarehouseCode]} warehouse.`,
        url: `/app/shipments/${s.id}`,
      });
  }
}

async function newPickupCode() {
  for (;;) {
    const code = crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
    if (!(await db.shipment.findUnique({ where: { pickupCode: code } }))) return code;
  }
}

/** Landed in Lagos and ready to collect: issue the pickup code and start the storage clock. */
export async function markReadyForPickup(shipmentId: string) {
  const settings = await getSettings();
  const now = new Date();
  const s = await db.shipment.update({
    where: { id: shipmentId },
    data: { status: STATUS.READY_FOR_PICKUP, arrivedNigeriaAt: now, readyAt: now, pickupCode: await newPickupCode() },
  });
  await addEvent(s.id, STATUS.READY_FOR_PICKUP, `Arrived in Lagos. Ready for pickup at ${BRAND.lagosPickup}`, "staff");
  if (s.userId)
    await notifyUser(s.userId, {
      title: `${s.code} is ready for pickup`,
      body: `Collect it at ${BRAND.lagosPickup} with pickup code ${s.pickupCode}. Free for ${settings.storageFreeDays} days, then ${formatMoney(settings.storageFeePerDayMinor)}/day. Uncollected items are disposed of after day ${settings.storageMaxDays}.`,
      url: `/app/shipments/${s.id}`,
      cta: "Show my pickup code",
    });
}

/** Day number since ready (day 1 = the day it became ready) and the fee owed so far. */
export function storageState(s: Pick<Shipment, "readyAt" | "storageFeePaidMinor">, settings: Settings, now = new Date()) {
  if (!s.readyAt) return { day: 0, dueMinor: 0, outstandingMinor: 0, daysLeft: settings.storageMaxDays };
  const day = Math.floor((now.getTime() - s.readyAt.getTime()) / DAY_MS) + 1;
  const feeDays = Math.max(0, Math.min(day, settings.storageMaxDays) - settings.storageFreeDays);
  const dueMinor = feeDays * settings.storageFeePerDayMinor;
  return { day, dueMinor, outstandingMinor: Math.max(0, dueMinor - s.storageFeePaidMinor), daysLeft: Math.max(0, settings.storageMaxDays - day + 1) };
}

export async function collect(pickupCode: string, opts: { waiveFee: boolean; staffName: string }) {
  const settings = await getSettings();
  const s = await db.shipment.findUnique({ where: { pickupCode: pickupCode.trim().toUpperCase() } });
  if (!s || s.status !== STATUS.READY_FOR_PICKUP) throw new Error("No package waiting with that pickup code.");
  const st = storageState(s, settings);
  if (st.outstandingMinor > 0 && !opts.waiveFee) throw new Error(`Storage fee of ${formatMoney(st.outstandingMinor)} must be paid first.`);
  await db.shipment.update({ where: { id: s.id }, data: { status: STATUS.COLLECTED, collectedAt: new Date() } });
  await addEvent(s.id, STATUS.COLLECTED, `Collected in Lagos${st.outstandingMinor > 0 ? ` (fee waived by ${opts.staffName})` : ""}`, "staff");
  if (s.userId) await notifyUser(s.userId, { title: `${s.code} collected`, body: "Thanks for shipping with Ship Ease Hub!", url: `/app/shipments/${s.id}` });
  return s;
}

const REMINDER_DAYS = [2, 3, 5, 6, 7];

/** Daily: update storage fees, send reminders, dispose after the limit. Safe to run more than once a day. */
export async function runStorageJob(now = new Date()) {
  const settings = await getSettings();
  const waiting = await db.shipment.findMany({ where: { status: STATUS.READY_FOR_PICKUP, readyAt: { not: null } } });
  const summary = { checked: waiting.length, reminders: 0, disposed: 0 };

  for (const s of waiting) {
    const st = storageState(s, settings, now);
    if (st.day > settings.storageMaxDays) {
      await db.shipment.update({ where: { id: s.id }, data: { status: STATUS.DISPOSED, disposedAt: now, storageFeeMinor: st.dueMinor } });
      await addEvent(s.id, STATUS.DISPOSED, `Not collected within ${settings.storageMaxDays} days`, "system");
      if (s.userId)
        await notifyUser(s.userId, {
          title: `${s.code} was not collected`,
          body: `Your package wasn't collected within ${settings.storageMaxDays} days and has been disposed of, as set out in our terms.`,
          url: `/app/shipments/${s.id}`,
        });
      summary.disposed++;
      continue;
    }
    if (st.dueMinor !== s.storageFeeMinor) await db.shipment.update({ where: { id: s.id }, data: { storageFeeMinor: st.dueMinor } });

    const remind = REMINDER_DAYS.filter((d) => d <= st.day && d <= settings.storageMaxDays).at(-1);
    if (remind) {
      const status = `REMINDER_D${remind}`;
      const already = await db.shipmentEvent.findFirst({ where: { shipmentId: s.id, status } });
      if (!already && s.userId) {
        const lastDay = remind === settings.storageMaxDays;
        await addEvent(s.id, status, `Pickup reminder (day ${remind})`, "system");
        await notifyUser(s.userId, {
          title: lastDay ? `Last day to collect ${s.code}` : `Reminder: collect ${s.code}`,
          body: lastDay
            ? `Today is the last day to collect your package (code ${s.pickupCode}). Uncollected items are disposed of tomorrow.`
            : remind <= settings.storageFreeDays
              ? `Free storage ends today. From tomorrow it's ${formatMoney(settings.storageFeePerDayMinor)}/day. Pickup code ${s.pickupCode}.`
              : `Storage so far: ${formatMoney(st.dueMinor)}. Please collect soon with code ${s.pickupCode}. ${st.daysLeft} day(s) left.`,
          url: `/app/shipments/${s.id}`,
        });
        summary.reminders++;
      }
    }
  }
  return summary;
}
