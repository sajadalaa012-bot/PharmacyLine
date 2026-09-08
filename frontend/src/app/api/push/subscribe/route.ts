import { NextRequest, NextResponse } from "next/server";
import { saveSubscription, type BrowserSubscription } from "@/lib/push";
import { isAdminRequest } from "@/lib/serverAuth";
import { trackOrder } from "@/lib/orders";
import { toLang, DEFAULT_LANG } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bad = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 });

/** Narrow whatever the browser posted to something worth storing. */
function readSubscription(value: unknown): BrowserSubscription | null {
  if (!value || typeof value !== "object") return null;
  const sub = value as Record<string, unknown>;
  const keys = sub.keys as Record<string, unknown> | undefined;
  if (
    typeof sub.endpoint !== "string" ||
    !/^https:\/\//.test(sub.endpoint) ||
    typeof keys?.p256dh !== "string" ||
    typeof keys?.auth !== "string"
  ) {
    return null;
  }
  return {
    endpoint: sub.endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
  };
}

/**
 * Register a device for notifications.
 *
 * Two kinds of caller, and each has to prove it may listen to what it asks
 * for. A shop device ('admin') needs an admin session. A customer's device
 * ('order') needs the order id and the secret track token they were given
 * when they placed it, which is the same proof the tracking page takes: it
 * buys a notification about that one order and nothing else.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const sub = readSubscription(body?.subscription);
    if (!sub) return bad("A valid push subscription is required.");

    const lang = toLang(String(body?.lang ?? "")) ?? DEFAULT_LANG;

    if (body?.topic === "order") {
      const id = Number(body.orderId);
      const token = typeof body.token === "string" ? body.token : "";
      if (!Number.isInteger(id) || id <= 0 || !token)
        return bad("An order id and its token are required.");
      if (!(await trackOrder(id, token)))
        return NextResponse.json({ error: "Order not found." }, { status: 404 });
      await saveSubscription(sub, "order", lang, { id, token });
      return NextResponse.json({ ok: true });
    }

    if (!isAdminRequest(req))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await saveSubscription(sub, "admin", lang);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Push subscribe failed:", err);
    return NextResponse.json(
      { error: "Could not turn notifications on." },
      { status: 500 },
    );
  }
}
