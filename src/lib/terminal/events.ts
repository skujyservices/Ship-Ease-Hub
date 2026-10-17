import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toMinor } from "@/lib/money";
import { addEvent, applyTerminalShipment } from "@/lib/outbound/service";
import { notifyUser } from "@/lib/notify";
import type { ReconciliationRecord, Shipment } from "./types";

type Payload = { event: string; event_id?: string; data: Record<string, unknown> };

/** Handles one stored Terminal webhook event. Throws to leave it unprocessed for a retry. */
export async function processTerminalEvent(payload: Payload) {
  const { event, data } = payload;
  const [resource] = event.split(".");

  const byTerminalId = async (id: unknown) =>
    typeof id === "string" ? db.shipment.findUnique({ where: { terminalShipmentId: id } }) : null;

  switch (resource) {
    case "shipment": {
      const s = await byTerminalId(data.shipment_id);
      if (!s || event === "shipment.created") return;
      await applyTerminalShipment(s.id, data as unknown as Shipment, "terminal");
      if (event === "shipment.customs_event")
        await addEvent(s.id, "CUSTOMS", `Customs update: ${String(data.status ?? "")}`, "terminal");
      return;
    }

    case "pickup": {
      const ids = (data.shipments as string[] | undefined) ?? [];
      for (const id of ids) {
        const s = await byTerminalId(id);
        if (!s) continue;
        await db.shipment.update({ where: { id: s.id }, data: { pickupId: String(data.pickup_id ?? s.pickupId) } });
        const nextAction = data.next_action ? ` Next step: ${String(data.next_action)}.` : "";
        await addEvent(s.id, `PICKUP_${event.split(".")[1].toUpperCase()}`, `Pickup ${event.split(".")[1]}.${nextAction}`, "terminal");
        if ((event === "pickup.failed" || event === "pickup.cancelled") && s.userId)
          await notifyUser(s.userId, {
            title: `${s.code}: pickup ${event === "pickup.failed" ? "problem" : "cancelled"}`,
            body:
              data.next_action === "dropoff"
                ? "The courier couldn't collect your parcel. Please drop it off at the carrier's hub."
                : data.next_action === "wait"
                  ? "The courier missed the pickup. A new rider is being arranged."
                  : "There was a problem with your pickup. We'll be in touch.",
            url: `/app/shipments/${s.id}`,
          });
      }
      return;
    }

    case "insurance": {
      const s = await byTerminalId(data.shipment);
      if (s && event === "insurance.success")
        await db.shipment.update({ where: { id: s.id }, data: { insuranceId: String(data.insurance_id) } });
      return;
    }

    case "claim": {
      if (typeof data.claim_id === "string")
        await db.claim.updateMany({ where: { terminalId: data.claim_id }, data: { status: event.split(".")[1] } });
      return;
    }

    case "reconciliation": {
      const r = data as unknown as ReconciliationRecord;
      const s = await byTerminalId(r.shipment_id);
      if (!s) return;
      await db.reconciliation.upsert({
        where: { terminalId: r.reconcilliation_id },
        create: {
          terminalId: r.reconcilliation_id,
          shipmentId: s.id,
          chargeType: r.charge_type,
          oldCostMinor: toMinor(r.total_old_shipment_cost),
          newCostMinor: toMinor(r.total_new_shipment_cost),
          extraChargeMinor: toMinor(r.total_exception_charge),
          isCharged: r.is_charged,
          voided: r.voided || event === "reconciliation.corrected",
          raw: data as Prisma.InputJsonValue,
        },
        update: {
          extraChargeMinor: toMinor(r.total_exception_charge),
          newCostMinor: toMinor(r.total_new_shipment_cost),
          isCharged: r.is_charged,
          voided: r.voided,
          raw: data as Prisma.InputJsonValue,
        },
      });
      await addEvent(s.id, "WEIGHT_CHECK", `Carrier weight check (${event.split(".")[1]})`, "terminal");
      return;
    }

    case "regulatory_document": {
      const s = await byTerminalId(data.shipment_id);
      if (s) await addEvent(s.id, "DOCUMENTS", `Customs documents ${event.split(".")[1]}`, "terminal");
      return;
    }

    default:
      // address.*, packaging.*, transaction.* are kept in the inbox for the audit log only
      return;
  }
}
