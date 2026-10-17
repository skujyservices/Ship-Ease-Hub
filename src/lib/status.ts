// One status vocabulary for every shipment, grouped into the three-bar timeline.

export const STATUS = {
  // Outbound (Terminal)
  DRAFT: "DRAFT",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  PAID: "PAID",
  BOOKING_FAILED: "BOOKING_FAILED",
  BOOKED: "BOOKED",
  PICKUP_SCHEDULED: "PICKUP_SCHEDULED",
  IN_TRANSIT: "IN_TRANSIT",
  AWAITING_CLEARANCE: "AWAITING_CLEARANCE",
  PENDING_CANCELLATION: "PENDING_CANCELLATION",
  DELIVERED: "DELIVERED",
  RETURNED: "RETURNED",
  CANCELLED: "CANCELLED",
  // Inbound (partners)
  AT_WAREHOUSE: "AT_WAREHOUSE",
  SHIPPED: "SHIPPED",
  ARRIVED_NIGERIA: "ARRIVED_NIGERIA",
  READY_FOR_PICKUP: "READY_FOR_PICKUP",
  COLLECTED: "COLLECTED",
  DISPOSED: "DISPOSED",
} as const;

export type Status = (typeof STATUS)[keyof typeof STATUS];

const META: Record<Status, { label: string; phase: 1 | 2 | 3; tone: "neutral" | "info" | "good" | "warn" | "bad" }> = {
  DRAFT: { label: "Quote", phase: 1, tone: "neutral" },
  AWAITING_PAYMENT: { label: "Awaiting payment", phase: 1, tone: "warn" },
  PAID: { label: "Paid – booking", phase: 1, tone: "info" },
  BOOKING_FAILED: { label: "Booking issue", phase: 1, tone: "bad" },
  BOOKED: { label: "Booked", phase: 1, tone: "info" },
  PICKUP_SCHEDULED: { label: "Pickup scheduled", phase: 1, tone: "info" },
  IN_TRANSIT: { label: "In transit", phase: 2, tone: "info" },
  AWAITING_CLEARANCE: { label: "In customs", phase: 2, tone: "warn" },
  PENDING_CANCELLATION: { label: "Cancelling", phase: 1, tone: "warn" },
  DELIVERED: { label: "Delivered", phase: 3, tone: "good" },
  RETURNED: { label: "Returned to sender", phase: 3, tone: "bad" },
  CANCELLED: { label: "Cancelled", phase: 1, tone: "neutral" },
  AT_WAREHOUSE: { label: "At warehouse", phase: 1, tone: "info" },
  SHIPPED: { label: "Shipped", phase: 2, tone: "info" },
  ARRIVED_NIGERIA: { label: "Arrived Nigeria", phase: 2, tone: "info" },
  READY_FOR_PICKUP: { label: "Ready for pickup", phase: 3, tone: "warn" },
  COLLECTED: { label: "Collected", phase: 3, tone: "good" },
  DISPOSED: { label: "Disposed", phase: 3, tone: "bad" },
};

export const statusMeta = (s: string) => META[s as Status] ?? { label: s, phase: 1 as const, tone: "neutral" as const };

/** Terminal shipment status string -> our status. */
export function fromTerminalStatus(s: string | undefined): Status | null {
  switch ((s ?? "").toLowerCase()) {
    case "draft":
      return null; // never move a paid shipment back to draft
    case "confirmed":
      return STATUS.BOOKED;
    case "in-transit":
    case "in_transit":
      return STATUS.IN_TRANSIT;
    case "awaiting-clearance":
      return STATUS.AWAITING_CLEARANCE;
    case "pending-cancellation":
      return STATUS.PENDING_CANCELLATION;
    case "delivered":
      return STATUS.DELIVERED;
    case "returned":
      return STATUS.RETURNED;
    case "cancelled":
    case "canceled":
      return STATUS.CANCELLED;
    default:
      return null;
  }
}

/** Shipments list tabs (spec §2). */
export function listTab(s: string): "action" | "warehouse" | "onway" | "done" {
  if ([STATUS.AWAITING_PAYMENT, STATUS.BOOKING_FAILED, STATUS.READY_FOR_PICKUP, STATUS.DRAFT].includes(s as never)) return "action";
  if (s === STATUS.AT_WAREHOUSE) return "warehouse";
  if (statusMeta(s).phase === 3 || s === STATUS.CANCELLED) return "done";
  return "onway";
}
