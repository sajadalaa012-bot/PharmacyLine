import { NextRequest, NextResponse } from "next/server";
import {
  countAdminDevices,
  generateKeys,
  getKeys,
  keysAreFromEnv,
  sendTest,
  storeKeys,
} from "@/lib/push";
import { isAdminRequest } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// How the setup page reads the shop's notification state.
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();
  try {
    const keys = await getKeys();
    return NextResponse.json({
      configured: !!keys,
      fromEnv: keysAreFromEnv(),
      publicKey: keys?.publicKey ?? null,
      devices: keys ? await countAdminDevices() : 0,
    });
  } catch (err) {
    console.error("Reading push status failed:", err);
    return NextResponse.json(
      { error: "Could not read the notification setup." },
      { status: 500 },
    );
  }
}

/**
 * The three things the setup page can do:
 *
 *   generate  make a key pair and store it, so a shop can turn notifications
 *             on without a terminal
 *   clear     forget the stored pair, which turns notifications off
 *   test      send one notification to the device asking, to prove it works
 *
 * generate and clear are refused while the keys come from the environment:
 * those are the deployment's, and the app must not appear to change something
 * it cannot.
 */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();
  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const action = body?.action;

  try {
    if (action === "generate" || action === "clear") {
      if (keysAreFromEnv())
        return NextResponse.json(
          { error: "The keys are set in the environment and cannot be changed here." },
          { status: 409 },
        );
      await storeKeys(action === "generate" ? generateKeys() : null);
      return NextResponse.json({ ok: true });
    }

    if (action === "test") {
      const endpoint = body?.endpoint;
      if (typeof endpoint !== "string" || !endpoint)
        return NextResponse.json(
          { error: "This device is not subscribed yet." },
          { status: 400 },
        );
      const sent = await sendTest(endpoint);
      if (!sent)
        return NextResponse.json(
          { error: "The test could not be delivered." },
          { status: 502 },
        );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    console.error("Push admin action failed:", err);
    return NextResponse.json({ error: "The action failed." }, { status: 500 });
  }
}
