import { NextRequest, NextResponse } from "next/server";
import { trackOrder } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: a customer checks the live status of their own order using the
// order number + the email they used. Both must match.
export async function GET(req: NextRequest) {
  const number = req.nextUrl.searchParams.get("number")?.trim();
  const email = req.nextUrl.searchParams.get("email")?.trim();
  if (!number || !email) {
    return NextResponse.json(
      { error: "Order number and email are required." },
      { status: 400 },
    );
  }
  try {
    const tracking = await trackOrder(number, email);
    if (!tracking)
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    return NextResponse.json(tracking);
  } catch (err) {
    console.error("Track order failed:", err);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
}
