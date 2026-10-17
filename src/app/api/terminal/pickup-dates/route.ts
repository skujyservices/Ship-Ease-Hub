import { NextResponse, type NextRequest } from "next/server";
import { getPickupDates } from "@/lib/terminal/api";
import { HttpError, handle, shipmentForRequest } from "@/lib/http";

// Available collection dates for a quoted shipment and carrier
export const GET = handle(async (req: NextRequest) => {
  const id = req.nextUrl.searchParams.get("shipment");
  const carrierId = req.nextUrl.searchParams.get("carrier");
  if (!id || !carrierId) throw new HttpError(400, "shipment and carrier are required");
  const { shipment } = await shipmentForRequest(id);
  const dates = await getPickupDates({
    address_id: shipment.terminalFromAddressId!,
    carrier_id: carrierId,
    shipment_ids: shipment.terminalShipmentId ? [shipment.terminalShipmentId] : undefined,
    count: 10,
  });
  return NextResponse.json(dates);
});
