import { NextResponse } from "next/server";
import { shipmentForRequest } from "@/lib/http";

// Streams the carrier label from Terminal. Waybills can appear a while after booking
// ("Waybill data not available"), so a not-ready label sends the customer back with a note.
export async function GET(req: Request, ctx: RouteContext<"/api/parcel/[id]/label">) {
  const { id } = await ctx.params;
  const back = new URL(`/app/shipments/${id}?label=pending`, req.url);
  let shipment;
  try {
    ({ shipment } = await shipmentForRequest(id, { requireUser: true }));
  } catch {
    return NextResponse.redirect(new URL(`/login?next=/app/shipments/${id}`, req.url));
  }
  if (!shipment.labelUrl) return NextResponse.redirect(back);
  const res = await fetch(shipment.labelUrl, { headers: { Authorization: `Bearer ${process.env.TERMINAL_SECRET_KEY}` }, cache: "no-store" });
  if (!res.ok || !res.headers.get("content-type")?.includes("pdf")) return NextResponse.redirect(back);
  return new Response(res.body, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${shipment.code}-label.pdf"` },
  });
}
