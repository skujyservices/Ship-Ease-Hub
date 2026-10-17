import { NextResponse, type NextRequest } from "next/server";
import { confirmPayment } from "@/lib/checkout";

// Paystack / Stripe send the customer back here after paying
export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference") ?? req.nextUrl.searchParams.get("trxref");
  const next = req.nextUrl.searchParams.get("next") ?? "/app/shipments";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/app/shipments";
  let state = "pending";
  if (reference) {
    try {
      const payment = await confirmPayment(reference);
      state = payment?.status === "SUCCESS" ? "paid" : payment?.status === "FAILED" ? "failed" : "pending";
    } catch (e) {
      console.error("payment confirm failed", e);
    }
  }
  return NextResponse.redirect(new URL(`${safeNext}?payment=${state}`, req.url));
}
