import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handle } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { createInboundShipment } from "@/lib/inbound/service";

const schema = z.object({ packageIds: z.array(z.string()).min(1, "Choose at least one package"), consolidate: z.boolean() });

// Customer picks packages at one warehouse to fly to Lagos → an inbound shipment awaiting payment
export const POST = handle(async (req: Request) => {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Please sign in");
  const { packageIds, consolidate } = schema.parse(await req.json());
  const shipment = await createInboundShipment(user.id, packageIds, consolidate).catch((e: Error) => {
    throw new HttpError(400, e.message);
  });
  return NextResponse.json({ id: shipment.id });
});
