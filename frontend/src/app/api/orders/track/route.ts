import { NextRequest, NextResponse } from "next/server";
import { trackOrder } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: a customer checks the live status of their own order using the
// order id + the secret token they received when placing it.
export async function GET(req: NextRequest) {
  const idRaw = req.nextUrl.searchParams.get("id");
  const token = req.nextUrl.searchParams.get("token");
  const id = idRaw ? parseInt(idRaw, 10) : NaN;
  if (!Number.isInteger(id) || !token) {
    return NextResponse.json({ error: "id and token are required." }, { status: 400 });
  }
  try {
    const tracking = await trackOrder(id, token);
    if (!tracking)
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    return NextResponse.json(tracking);
  } catch (err) {
    console.error("Track order failed:", err);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
}
