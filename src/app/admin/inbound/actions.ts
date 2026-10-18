"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/notify";
import { WAREHOUSES, type WarehouseCode } from "@/lib/settings";
import { collect, dispatchInbound, markReadyForPickup } from "@/lib/inbound/service";
import { markPurchased, quoteInputSchema, quoteRequest } from "@/lib/inbound/procurement";
import { refundPayment } from "@/lib/checkout";
import type { ActionResult } from "../actions";

const fail = (e: unknown): ActionResult => ({ error: e instanceof z.ZodError ? e.issues[0].message : e instanceof Error ? e.message : String(e) });
const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? undefined : Number(v));

const intakeSchema = z.object({
  suiteId: z.string().trim().toUpperCase().regex(/^SEH-\d{5}$/, "Suite ID looks like SEH-12345"),
  warehouse: z.enum(["US", "GB", "CN"]),
  matchId: z.string().optional(),
  description: z.string().trim().min(2, "Describe the package"),
  store: z.string().trim().optional(),
  storeTracking: z.string().trim().optional(),
  weightKg: z.number().positive("Weight is required"),
  lengthCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  notes: z.string().trim().optional(),
  photos: z.array(z.url()).default([]),
});

/** Log a package that a partner confirmed has arrived at their warehouse. */
export async function logPackage(_: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  try {
    const input = intakeSchema.parse({
      suiteId: form.get("suiteId"),
      warehouse: form.get("warehouse"),
      matchId: form.get("matchId") || undefined,
      description: form.get("description"),
      store: form.get("store") || undefined,
      storeTracking: form.get("storeTracking") || undefined,
      weightKg: num(form.get("weightKg")),
      lengthCm: num(form.get("lengthCm")),
      widthCm: num(form.get("widthCm")),
      heightCm: num(form.get("heightCm")),
      notes: form.get("notes") || undefined,
      photos: String(form.get("photos") ?? "").split(/\s+/).filter(Boolean),
    });
    const user = await db.user.findUnique({ where: { suiteId: input.suiteId } });
    if (!user) throw new Error(`No customer with suite ID ${input.suiteId}`);

    const data = {
      warehouse: input.warehouse,
      status: "RECEIVED",
      description: input.description,
      store: input.store,
      storeTracking: input.storeTracking,
      weightKg: input.weightKg,
      lengthCm: input.lengthCm,
      widthCm: input.widthCm,
      heightCm: input.heightCm,
      notes: input.notes,
      photos: input.photos,
      receivedAt: new Date(),
    };
    const match = input.matchId ? await db.package.findFirst({ where: { id: input.matchId, userId: user.id, status: "EXPECTED" } }) : null;
    if (match) await db.package.update({ where: { id: match.id }, data });
    else await db.package.create({ data: { ...data, userId: user.id } });

    await notifyUser(user.id, {
      title: `Your package arrived in ${WAREHOUSES[input.warehouse]}`,
      body: `${input.description} (${input.weightKg} kg) is at our ${WAREHOUSES[input.warehouse]} warehouse. Ship it to Lagos whenever you're ready.`,
      url: "/app/ship/abroad",
      cta: "Ship it to Lagos",
    });
    revalidatePath("/admin/inbound");
    return { ok: `Logged for ${user.name} (${input.suiteId})` };
  } catch (e) {
    return fail(e);
  }
}

export async function dispatchSelected(_: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  try {
    const ids = form.getAll("ids").map(String);
    if (!ids.length) throw new Error("Tick the shipments that left the warehouse");
    await dispatchInbound(ids, String(form.get("airwayBill") ?? "").trim());
    revalidatePath("/admin/inbound");
    return { ok: `${ids.length} shipment(s) marked as shipped` };
  } catch (e) {
    return fail(e);
  }
}

export async function arriveSelected(_: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  try {
    const ids = form.getAll("ids").map(String);
    if (!ids.length) throw new Error("Tick the shipments that arrived in Lagos");
    for (const id of ids) await markReadyForPickup(id);
    revalidatePath("/admin/inbound");
    return { ok: `${ids.length} shipment(s) ready for pickup. Customers notified with their codes.` };
  } catch (e) {
    return fail(e);
  }
}

export async function collectAtDesk(_: ActionResult, form: FormData): Promise<ActionResult> {
  const staff = await requireStaff();
  try {
    const waive = form.get("waive") === "on";
    if (waive && staff.role !== "ADMIN") throw new Error("Only an admin can waive storage fees");
    const s = await collect(String(form.get("code") ?? ""), { waiveFee: waive, staffName: staff.name });
    revalidatePath("/admin/inbound");
    return { ok: `${s.code} collected` };
  } catch (e) {
    return fail(e);
  }
}

// ---- Buy for me ----

export async function sendQuote(id: string, _: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  try {
    const labels = form.getAll("label").map(String);
    const prices = form.getAll("unitPrice").map(Number);
    const input = quoteInputSchema.parse({
      items: labels.map((label, i) => ({ label, unitPrice: prices[i] })),
      storeShipping: Number(form.get("storeShipping") || 0),
    });
    await quoteRequest(id, input);
    revalidatePath(`/admin/procurement/${id}`);
    return { ok: "Quote sent to the customer" };
  } catch (e) {
    return fail(e);
  }
}

export async function markBought(id: string, _: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  try {
    const ref = String(form.get("storeOrderRef") ?? "").trim();
    if (!ref) throw new Error("Enter the store's order number");
    await markPurchased(id, ref);
    revalidatePath(`/admin/procurement/${id}`);
    return { ok: "Marked as bought. The package is now expected at the warehouse." };
  } catch (e) {
    return fail(e);
  }
}

export async function cancelProcurement(id: string): Promise<ActionResult> {
  await requireStaff();
  const paid = await db.payment.findFirst({ where: { procurementId: id, status: "SUCCESS" } });
  if (paid) {
    try {
      await refundPayment(paid);
    } catch (e) {
      return fail(e);
    }
  }
  const r = await db.procurementRequest.update({ where: { id }, data: { status: "CANCELLED" } });
  await notifyUser(r.userId, {
    title: "Your Buy for me request was cancelled",
    body: `We couldn't complete your request from ${WAREHOUSES[r.warehouse as WarehouseCode]}. If you paid, a refund is on its way.`,
    url: `/app/ship/buy/${id}`,
  });
  revalidatePath(`/admin/procurement/${id}`);
  return { ok: "Cancelled" };
}
