import "server-only";
import crypto from "node:crypto";
import type { Prisma, Shipment } from "@prisma/client";
import { db } from "@/lib/db";
import * as terminal from "@/lib/terminal/api";
import type { Carrier, PickupOption, Rate, Shipment as TShipment } from "@/lib/terminal/types";
import { getSettings } from "@/lib/settings";
import { toMinor } from "@/lib/money";
import { STATUS, fromTerminalStatus, statusMeta } from "@/lib/status";
import { notifyUser } from "@/lib/notify";
import { buildPrice, markup } from "./pricing";
import type { QuoteInput, SelectInput } from "./schema";

/** One rate as stored on the shipment and shown to the customer. */
export type QuotedRate = {
  rateId: string;
  carrierId: string;
  carrierName: string;
  carrierSlug?: string;
  carrierLogo?: string;
  description?: string;
  deliveryTime?: string;
  pickupTime?: string;
  shippingMinor: number; // Terminal's amount
  dutyMinor: number | null; // null = not applicable or could not be estimated
  dutyStatus: "none" | "estimated" | "unavailable";
  insuranceIncluded: boolean;
  pickupOptions: PickupOption[];
  priorityPickupMinor?: number;
  customerFromMinor: number; // shipping (with markup) + duty
};

export type StoredQuote = {
  international: boolean;
  insurancePremiumMinor: number;
  rates: QuotedRate[];
  quotedAt: string;
};

export const newTrackingCode = () =>
  `SEH-${crypto.randomBytes(5).toString("base64url").replace(/[-_]/g, "X").toUpperCase().slice(0, 7)}`;

// ---- Carrier slug lookup (needed by the duty estimate) ----
let carrierCache: { at: number; carriers: Carrier[] } | null = null;
async function carriers() {
  if (!carrierCache || Date.now() - carrierCache.at > 6 * 3600_000) {
    const { carriers } = await terminal.getCarriers({ perPage: 200 });
    carrierCache = { at: Date.now(), carriers };
  }
  return carrierCache.carriers;
}
async function carrierSlug(rate: Rate): Promise<string | undefined> {
  if (rate.carrier_slug) return rate.carrier_slug;
  const list = await carriers().catch(() => []);
  const match = list.find(
    (c) => c.carrier_id === rate.carrier_id || c.id === rate.carrier_id || c.name.toLowerCase() === rate.carrier_name.toLowerCase(),
  );
  return match?.slug;
}

// ---------------------------------------------------------------------------
// 1. Quote: addresses → parcels → draft shipment → rates → duties → insurance
// ---------------------------------------------------------------------------
export async function createQuote(input: QuoteInput, userId: string | null, batchId?: string) {
  const settings = await getSettings();
  const international = input.to.country !== "NG";
  const currency = "NGN" as const;

  const [from, to] = await Promise.all([
    terminal.createAddress({ ...input.from, is_residential: true }),
    terminal.createAddress({ ...input.to, is_residential: true }),
  ]);

  const parcels = await Promise.all(
    input.parcels.map((p) =>
      terminal.createParcel({
        packaging: p.packaging,
        weight_unit: "kg",
        description: p.description || p.items.map((i) => i.name).join(", "),
        items: p.items.map((i) => ({ ...i, currency, hs_code: i.hs_code || undefined })),
      }),
    ),
  );
  const parcelIds = parcels.map((p) => p.parcel_id);

  const tShipment = await terminal.createShipment({
    address_from: from.address_id,
    address_to: to.address_id,
    ...(parcelIds.length === 1 ? { parcel: parcelIds[0] } : { parcels: parcelIds }),
    shipment_purpose: input.purpose,
  });

  const rawRates =
    parcelIds.length === 1
      ? await terminal.getRatesForShipment({ shipment_id: tShipment.shipment_id, currency })
      : await terminal.getRatesForMultiParcel({ shipment_id: tShipment.shipment_id, currency });

  // Duty: one estimate per carrier (international only)
  const dutyBySlug = new Map<string, number | null>();
  if (international && settings.dutyOnRateList) {
    const slugs = [...new Set((await Promise.all(rawRates.map(carrierSlug))).filter(Boolean) as string[])];
    await Promise.all(
      slugs.map(async (slug) => {
        try {
          const duty = await terminal.estimateDuty({ shipment_id: tShipment.shipment_id, carrier: slug, currency });
          dutyBySlug.set(slug, toMinor(duty.amount));
        } catch (e) {
          console.error("duty estimate failed", slug, e);
          dutyBySlug.set(slug, null);
        }
      }),
    );
  }

  // Insurance premium on the declared value (summed over parcels)
  let insurancePremiumMinor = 0;
  try {
    const premiums = await Promise.all(
      parcelIds.map((id) => terminal.getInsurancePremium(id, international ? "export" : "local", currency)),
    );
    insurancePremiumMinor = premiums.reduce((s, p) => s + toMinor(p.premium), 0);
  } catch (e) {
    console.error("insurance premium failed", e);
  }

  const rates: QuotedRate[] = [];
  for (const r of rawRates) {
    const slug = await carrierSlug(r);
    const dutyMinor = international ? (slug ? (dutyBySlug.get(slug) ?? null) : null) : null;
    const shippingMinor = toMinor(r.amount);
    const priority = r.pickup_options?.find((o) => o.type === "priority_pickup");
    rates.push({
      rateId: r.rate_id,
      carrierId: r.carrier_id,
      carrierName: r.carrier_name,
      carrierSlug: slug,
      carrierLogo: r.carrier_logo,
      description: r.carrier_rate_description,
      deliveryTime: r.delivery_time,
      pickupTime: r.pickup_time,
      shippingMinor,
      dutyMinor,
      dutyStatus: !international ? "none" : dutyMinor === null ? "unavailable" : "estimated",
      insuranceIncluded: Boolean(r.includes_insurance),
      pickupOptions: r.pickup_options?.length ? r.pickup_options : [{ type: "pickup" }],
      priorityPickupMinor: priority?.amount ? toMinor(priority.amount) : r.priority_pickup_fee ? toMinor(r.priority_pickup_fee) : undefined,
      customerFromMinor: markup(shippingMinor, settings) + (dutyMinor ?? 0),
    });
  }
  rates.sort((a, b) => a.customerFromMinor - b.customerFromMinor);

  const quote: StoredQuote = { international, insurancePremiumMinor, rates, quotedAt: new Date().toISOString() };

  return db.shipment.create({
    data: {
      code: newTrackingCode(),
      kind: "OUTBOUND",
      userId,
      batchId,
      status: STATUS.DRAFT,
      fromAddress: input.from,
      toAddress: input.to,
      parcels: input.parcels,
      purpose: input.purpose,
      terminalShipmentId: tShipment.shipment_id,
      terminalFromAddressId: from.address_id,
      terminalToAddressId: to.address_id,
      terminalParcelIds: parcelIds,
      rates: quote as unknown as Prisma.InputJsonValue,
    },
  });
}

// ---------------------------------------------------------------------------
// 2. Regulatory documents (international): which documents the goods may need
// ---------------------------------------------------------------------------
export async function analyzeDocuments(shipment: Shipment) {
  if (!shipment.terminalShipmentId) return null;
  const settings = await getSettings();
  try {
    const req = await terminal.analyzeRegulatoryDocuments(shipment.terminalShipmentId);
    const toNgnMinor = (amount: number, currency: string) =>
      currency === "NGN" ? toMinor(amount) : toMinor(amount * (settings.fxToNgn[currency as "USD"] ?? 0));
    const available = req.available_documents.map((d) => ({
      type: d.type,
      name: d.name,
      free: Boolean(d.free),
      minor: d.free ? 0 : toNgnMinor(d.amount, d.currency),
    }));
    await db.shipment.update({
      where: { id: shipment.id },
      data: { regulatoryRequestId: req.request_id, regulatoryDocs: { available, selected: [], purchased: [] } },
    });
    return available;
  } catch (e) {
    console.error("regulatory analyze failed", e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// 3. Customer picks a rate + extras → final price
// ---------------------------------------------------------------------------
export async function selectRate(shipment: Shipment, input: SelectInput) {
  const settings = await getSettings();
  const quote = shipment.rates as unknown as StoredQuote;
  const rate = quote.rates.find((r) => r.rateId === input.rateId);
  if (!rate) throw new Error("That rate has expired. Please get a new quote.");

  const option = input.pickupOption ?? "pickup";
  if (!rate.pickupOptions.some((o) => o.type === option)) throw new Error("That pickup option isn't offered for this carrier.");
  if (option === "dropoff" && !input.dropoffId) throw new Error("Choose a drop-off location.");
  if (option === "scheduled_pickup" && !input.pickupDate) throw new Error("Choose a pickup date.");

  const docs = (shipment.regulatoryDocs as { available?: { type: string; name: string; minor: number }[] } | null)?.available ?? [];
  const chosenDocs = docs.filter((d) => input.documents.includes(d.type));

  const price = buildPrice(
    {
      shippingMinor: rate.shippingMinor,
      dutyMinor: rate.dutyMinor,
      insuranceMinor: input.insurance && !rate.insuranceIncluded ? quote.insurancePremiumMinor : 0,
      priorityPickupMinor: option === "priority_pickup" ? rate.priorityPickupMinor : 0,
      documents: chosenDocs.map((d) => ({ name: d.name, minor: d.minor })),
    },
    settings,
  );

  return db.shipment.update({
    where: { id: shipment.id },
    data: {
      selectedRate: rate as unknown as Prisma.InputJsonValue,
      pickupOption: option,
      dropoffId: option === "dropoff" ? input.dropoffId : null,
      pickupDate: option === "scheduled_pickup" ? input.pickupDate : null,
      withInsurance: input.insurance && !rate.insuranceIncluded,
      regulatoryDocs: shipment.regulatoryDocs
        ? { ...(shipment.regulatoryDocs as object), selected: chosenDocs.map((d) => d.type) }
        : undefined,
      pricing: price.lines,
      totalMinor: price.totalMinor,
      carrierName: rate.carrierName,
      carrierId: rate.carrierId,
      status: STATUS.AWAITING_PAYMENT,
    },
  });
}

// ---------------------------------------------------------------------------
// 4. After payment: book on Terminal (charges SEH's Terminal wallet)
// ---------------------------------------------------------------------------
export async function bookPaidShipment(shipmentId: string) {
  // Claim the shipment atomically so two callers (redirect + webhook) can't both book it
  const claimed = await db.shipment.updateMany({
    where: { id: shipmentId, status: { in: [STATUS.AWAITING_PAYMENT, STATUS.BOOKING_FAILED] } },
    data: { status: STATUS.PAID, bookingError: null },
  });
  if (claimed.count === 0) return db.shipment.findUniqueOrThrow({ where: { id: shipmentId } });

  const shipment = await db.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
  const rate = shipment.selectedRate as unknown as QuotedRate;

  try {
    const booked = await terminal.arrangePickupAndDelivery({
      rate_id: rate.rateId,
      shipment_id: shipment.terminalShipmentId!,
      pickup_option: shipment.pickupOption as PickupOption["type"],
      dropoff_id: shipment.dropoffId ?? undefined,
      // We collected the estimated duty from the customer, so we (the account holder) pay it
      duty_payer: rate.dutyMinor ? "account_holder" : "receiver",
      purchase_insurance: shipment.withInsurance,
    });

    await applyTerminalShipment(shipment.id, booked, "terminal");
    await addEvent(shipment.id, STATUS.BOOKED, `Booked with ${rate.carrierName}`, "system");

    const warning = (booked.metadata as { priority_pickup_error?: string } | undefined)?.priority_pickup_error;
    if (warning) await addEvent(shipment.id, STATUS.BOOKED, `Priority pickup unavailable: ${warning}`, "terminal");

    if (shipment.pickupOption === "scheduled_pickup" && shipment.pickupDate) {
      await schedulePickupFor(shipment.id).catch((e) => console.error("schedule pickup failed", e));
    }
    await purchaseSelectedDocuments(shipment.id).catch((e) => console.error("documents purchase failed", e));

    if (shipment.userId)
      await notifyUser(shipment.userId, {
        title: `Shipment ${shipment.code} booked`,
        body: `Your parcel is booked with ${rate.carrierName}. Download your label from your shipments page.`,
        url: `/app/shipments/${shipment.id}`,
      });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Booking failed";
    await db.shipment.update({ where: { id: shipment.id }, data: { status: STATUS.BOOKING_FAILED, bookingError: message } });
    await addEvent(shipment.id, STATUS.BOOKING_FAILED, `Booking failed: ${message}`, "system");
  }
  return db.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
}

async function purchaseSelectedDocuments(shipmentId: string) {
  const s = await db.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
  const docs = s.regulatoryDocs as { selected?: string[] } | null;
  if (!s.regulatoryRequestId || !docs?.selected?.length) return;
  const res = await terminal.purchaseRegulatoryDocuments(s.regulatoryRequestId, docs.selected, s.terminalShipmentId!);
  await db.shipment.update({
    where: { id: shipmentId },
    data: { regulatoryDocs: { ...(docs as object), purchased: res.purchased_documents ?? [] } as Prisma.InputJsonValue },
  });
}

export async function schedulePickupFor(shipmentId: string, date?: string) {
  const s = await db.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
  const rate = s.selectedRate as unknown as QuotedRate;
  const pickup = await terminal.schedulePickup({
    shipment_ids: [s.terminalShipmentId!],
    pickup_date: date ?? s.pickupDate!,
    address_id: s.terminalFromAddressId!,
    carrier_id: rate.carrierId,
  });
  await db.shipment.update({
    where: { id: shipmentId },
    data: { pickupId: pickup.pickup_id, pickupDate: date ?? s.pickupDate, status: STATUS.PICKUP_SCHEDULED },
  });
  await addEvent(shipmentId, STATUS.PICKUP_SCHEDULED, `Pickup scheduled for ${date ?? s.pickupDate}`, "system");
}

// ---------------------------------------------------------------------------
// 5. Tracking: apply a Terminal shipment snapshot (from booking, webhook or poll)
// ---------------------------------------------------------------------------
export async function applyTerminalShipment(shipmentId: string, t: Partial<TShipment>, source: "terminal" | "system") {
  const current = await db.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
  const extras = t.extras ?? {};
  const next = fromTerminalStatus(t.status);
  // Don't let an older "confirmed" overwrite a scheduled pickup
  const keep = next === STATUS.BOOKED && current.status === STATUS.PICKUP_SCHEDULED;

  await db.shipment.update({
    where: { id: shipmentId },
    data: {
      ...(next && !keep ? { status: next } : {}),
      trackingNumber: extras.tracking_number ?? (t.tracking_number as string | undefined) ?? current.trackingNumber,
      trackingUrl: extras.tracking_url ?? current.trackingUrl,
      carrierTrackingUrl: extras.carrier_tracking_url ?? current.carrierTrackingUrl,
      labelUrl: extras.shipping_label_url ?? current.labelUrl,
      invoiceUrl: extras.commercial_invoice_url ?? current.invoiceUrl,
      podUrl: extras.proof_of_delivery?.url ?? current.podUrl,
    },
  });

  for (const ev of t.events ?? []) {
    const status = fromTerminalStatus(ev.status) ?? ev.status.toUpperCase();
    await db.shipmentEvent.upsert({
      where: { shipmentId_status_occurredAt: { shipmentId, status, occurredAt: new Date(ev.created_at) } },
      create: { shipmentId, status, description: ev.description, location: ev.location, occurredAt: new Date(ev.created_at), source },
      update: {},
    });
  }

  if (next && next !== current.status && !keep && current.userId && source === "terminal") {
    await notifyUser(current.userId, {
      title: `${current.code}: ${statusMeta(next).label}`,
      body: t.events?.at(-1)?.description ?? `Your shipment is now ${statusMeta(next).label.toLowerCase()}.`,
      url: `/app/shipments/${current.id}`,
    });
  }
}

/** Pulls the latest tracking from Terminal. With `ifOlderThanMs`, only when the record has gone quiet that long. */
export async function refreshTracking(shipmentId: string, ifOlderThanMs?: number) {
  const s = await db.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
  if (!s.terminalShipmentId || [STATUS.DRAFT, STATUS.AWAITING_PAYMENT].includes(s.status as never)) return s;
  if (ifOlderThanMs && Date.now() - s.updatedAt.getTime() < ifOlderThanMs) return s;
  const t = await terminal.trackShipment(s.terminalShipmentId);
  await applyTerminalShipment(s.id, t, "system");
  return db.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
}

// ---------------------------------------------------------------------------
// 6. Cancel before pickup (refund handled by the caller)
// ---------------------------------------------------------------------------
export async function cancelOnTerminal(shipmentId: string) {
  const s = await db.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
  if (s.pickupId) await terminal.cancelPickup(s.pickupId).catch(() => undefined);
  const t = await terminal.cancelShipment(s.terminalShipmentId!);
  await applyTerminalShipment(s.id, t, "system");
  await addEvent(s.id, STATUS.CANCELLED, "Shipment cancelled", "system");
}

export async function addEvent(shipmentId: string, status: string, description: string, source: string, location?: string) {
  await db.shipmentEvent.create({
    data: { shipmentId, status, description, source, location, occurredAt: new Date() },
  });
}
