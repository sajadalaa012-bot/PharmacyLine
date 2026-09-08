import { NextRequest, NextResponse } from "next/server";
import { removeSubscription } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Forget a device. Open to anyone holding the endpoint, deliberately: the
// endpoint is the browser's own address, only that browser has it, and the
// worst anyone who guessed one could do is stop notifications they were
// never going to receive.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const endpoint = body?.endpoint;
    if (typeof endpoint !== "string" || !endpoint)
      return NextResponse.json(
        { error: "An endpoint is required." },
        { status: 400 },
      );
    await removeSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Push unsubscribe failed:", err);
    return NextResponse.json(
      { error: "Could not turn notifications off." },
      { status: 500 },
    );
  }
}
