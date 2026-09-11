import { NextRequest, NextResponse } from "next/server";
import { WheelError, getWheel, saveWheel } from "@/lib/prizeWheel";
import { isAdminRequest } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin only: the whole configuration, prizes, ranges and odds alike. The
// storefront never reads this - a customer is told what their own order is
// playing for, through /api/orders/prize, and nothing more.
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getWheel());
  } catch (err) {
    console.error("Load prize wheel failed:", err);
    return NextResponse.json(
      { error: "Could not load the prize wheel." },
      { status: 500 },
    );
  }
}

// Admin only: replace it. The editor always sends the whole wheel, and
// saveWheel validates every field, so there is nothing to merge.
export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    return NextResponse.json(await saveWheel(body));
  } catch (err) {
    if (err instanceof WheelError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Save prize wheel failed:", err);
    return NextResponse.json(
      { error: "Could not save the prize wheel." },
      { status: 500 },
    );
  }
}
