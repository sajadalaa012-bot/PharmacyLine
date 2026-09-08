import { NextResponse } from "next/server";
import { getPublicKey } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: the half of the VAPID pair a browser needs to subscribe. It is
// meant to be handed out - the private half never leaves the server. An
// unconfigured shop answers with a null key, which is how the client knows to
// keep its notification controls hidden rather than showing a broken one.
export async function GET() {
  try {
    return NextResponse.json({ key: await getPublicKey() });
  } catch (err) {
    console.error("Reading the push key failed:", err);
    return NextResponse.json({ key: null });
  }
}
