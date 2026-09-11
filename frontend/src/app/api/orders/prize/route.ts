import { NextRequest, NextResponse, after } from "next/server";
import { spinOrder, wheelFor } from "@/lib/prizeWheel";
import { notifyPrizeWon } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The order and its secret token, from wherever this request carries them.
 *  The same pair the tracking page uses: knowing an order number is not
 *  enough to spin its wheel. */
function credentials(id: unknown, token: unknown): [number, string] | null {
  const orderId =
    typeof id === "string" ? parseInt(id, 10) : Math.floor(Number(id));
  if (!Number.isInteger(orderId) || typeof token !== "string" || !token)
    return null;
  return [orderId, token];
}

// Public: what this order is playing for, and what it has already won. Called
// when the confirmation screen opens, so a reload shows the prize again rather
// than a fresh wheel.
export async function GET(req: NextRequest) {
  const creds = credentials(
    req.nextUrl.searchParams.get("id"),
    req.nextUrl.searchParams.get("token"),
  );
  if (!creds)
    return NextResponse.json(
      { error: "id and token are required." },
      { status: 400 },
    );
  try {
    const offer = await wheelFor(...creds);
    if (!offer)
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    return NextResponse.json(offer);
  } catch (err) {
    // The wheel is a flourish on top of an order that is already placed, so a
    // failure here answers "no wheel" rather than an error the confirmation
    // screen would have to explain.
    console.error("Load order wheel failed:", err);
    return NextResponse.json({ prizes: [], prize: null });
  }
}

// Public: spin it. Idempotent by construction - the prize is written once and
// every later call is answered with what was written. See spinOrder.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const creds = credentials(body?.id, body?.token);
  if (!creds)
    return NextResponse.json(
      { error: "id and token are required." },
      { status: 400 },
    );
  try {
    const result = await spinOrder(...creds);
    if (!result)
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    // Tell the shop what it owes, the way a new order is announced: after the
    // response, and only for a spin that actually happened. Whoever packs the
    // order needs to know a prize is going in it.
    if (result.fresh && result.prize) {
      const prize = result.prize;
      after(() => notifyPrizeWon(creds[0], prize));
    }
    return NextResponse.json({ prize: result.prize });
  } catch (err) {
    console.error("Spin order wheel failed:", err);
    return NextResponse.json(
      { error: "The wheel could not be spun." },
      { status: 500 },
    );
  }
}
