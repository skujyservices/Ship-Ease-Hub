// Buy for me request statuses as shown to customers and staff
export const PROCUREMENT_LABEL: Record<string, { label: string; cls: string }> = {
  REQUESTED: { label: "Waiting for quote", cls: "bg-mist text-navy" },
  QUOTED: { label: "Quote ready", cls: "bg-gold/20 text-navy" },
  PAID: { label: "Paid · buying", cls: "bg-purple/10 text-purple" },
  PURCHASED: { label: "Bought", cls: "bg-success/10 text-success" },
  CANCELLED: { label: "Cancelled", cls: "bg-mist text-navy/60" },
};
