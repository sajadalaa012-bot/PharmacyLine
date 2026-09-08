// The browser half of push notifications: asking permission, handing the
// resulting subscription to the server, and taking it back again.
//
// Everything here is best-effort. A browser with no support, a person who says
// no, a shop with no keys set up: all of them are ordinary outcomes, reported
// as a state rather than thrown as an error, because none of them should stop
// somebody buying anything.

import { getActiveLang } from "./i18n";

/** Where a subscription came from, and so what it may be woken for. */
export type PushTopic = "admin" | "order";

export type PushOutcome =
  | "subscribed"
  /** The person said no, or had already said no in browser settings. */
  | "blocked"
  /** No keys configured on the server, so there is nothing to subscribe to. */
  | "unconfigured"
  | "unsupported"
  | "failed";

/** True when this browser can do push at all. iOS only after installing. */
export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** True when notifications are switched off for this site in the browser. */
export function pushBlocked(): boolean {
  return pushSupported() && Notification.permission === "denied";
}

/** The subscription this browser already holds, if any. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** The VAPID public key, base64url as the server stores it. */
async function fetchKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/key", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { key: string | null };
    return data.key;
  } catch {
    return null;
  }
}

/** PushManager wants the key as bytes, not as the base64url string.
 *  Built on an explicit ArrayBuffer, which is what BufferSource asks for. */
function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Ask this browser to start listening, and tell the server about it.
 *
 * `order` is what a customer's device is subscribing for: the order id and
 * the secret token they were handed when they placed it, which is the proof
 * the server checks before it will register anything.
 */
export async function subscribe(
  topic: PushTopic,
  order?: { id: number; token: string },
): Promise<PushOutcome> {
  if (!pushSupported()) return "unsupported";

  const key = await fetchKey();
  if (!key) return "unconfigured";

  try {
    // Asked before subscribing so a refusal costs nothing else.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "blocked";

    const reg = await navigator.serviceWorker.ready;
    // A browser that is already subscribed with a different key has to be
    // released first, or subscribe() rejects rather than re-keying.
    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe().catch(() => {});

    const sub = await reg.pushManager.subscribe({
      // Required by every browser: a push may not arrive silently.
      userVisibleOnly: true,
      applicationServerKey: keyBytes(key),
    });

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        topic,
        lang: getActiveLang(),
        orderId: order?.id,
        token: order?.token,
      }),
    });
    if (!res.ok) {
      // Nothing on the server is listening for this device, so it should not
      // be left holding a subscription that will never be used.
      await sub.unsubscribe().catch(() => {});
      return "failed";
    }
    return "subscribed";
  } catch (err) {
    console.error("Push subscribe failed:", err);
    return "failed";
  }
}

/** Stop listening, on the browser's side and the server's. */
export async function unsubscribe(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  const { endpoint } = sub;
  await sub.unsubscribe().catch(() => {});
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  }).catch(() => {
    /* The browser has already stopped listening, which is what matters. */
  });
}
