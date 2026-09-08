// Browser push notifications: the shop hears about a new order on the phone
// in its pocket, and a customer hears when theirs has been approved.
//
// The moving part is the VAPID key pair, which is what a push service (Google,
// Apple, Mozilla) checks before it will deliver anything. Same arrangement as
// the Telegram token next door: read from the environment first, falling back
// to the app_settings table for a shop with no way to set environment
// variables. Keys can be generated from /admin/notifications, so nobody has to
// install a CLI to turn this on.
//
// Nothing here is allowed to break an order. Every send is best-effort and
// every failure is logged and swallowed.

import webpush, { type PushSubscription as WebPushSubscription } from "web-push";
import { ensureSchema, query } from "./db";
import { getSetting, setSetting } from "./settings";
import type { Lang } from "./i18n";

export const PUBLIC_KEY_SETTING = "vapid_public_key";
export const PRIVATE_KEY_SETTING = "vapid_private_key";

/** Who a subscription belongs to. See the table comment in lib/db.ts. */
export type PushTopic = "admin" | "order";

/** What the browser hands us when a device says yes. */
export interface BrowserSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface Keys {
  publicKey: string;
  privateKey: string;
}

/** A push service that answers with one of these has forgotten the device:
 *  the subscription is dead and the row should go. */
const GONE = new Set([404, 410]);

// ── Configuration ───────────────────────────────────────────────────

/** The key pair, environment first, database second, else null. */
export async function getKeys(): Promise<Keys | null> {
  const envPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const envPrivate = process.env.VAPID_PRIVATE_KEY?.trim();
  if (envPublic && envPrivate)
    return { publicKey: envPublic, privateKey: envPrivate };

  const [publicKey, privateKey] = await Promise.all([
    getSetting(PUBLIC_KEY_SETTING),
    getSetting(PRIVATE_KEY_SETTING),
  ]);
  if (publicKey?.trim() && privateKey?.trim())
    return { publicKey: publicKey.trim(), privateKey: privateKey.trim() };
  return null;
}

/** True when the pair comes from the environment and can't be edited here. */
export function keysAreFromEnv(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
    process.env.VAPID_PRIVATE_KEY?.trim()
  );
}

/** The half of the pair a browser needs to subscribe. Safe to hand out. */
export async function getPublicKey(): Promise<string | null> {
  return (await getKeys())?.publicKey ?? null;
}

/** A fresh pair, for a shop turning this on for the first time. */
export function generateKeys(): Keys {
  return webpush.generateVAPIDKeys();
}

export async function storeKeys(keys: Keys | null): Promise<void> {
  await setSetting(PUBLIC_KEY_SETTING, keys?.publicKey ?? null);
  await setSetting(PRIVATE_KEY_SETTING, keys?.privateKey ?? null);
}

/**
 * The contact address a push service can complain to. Not a secret and not
 * checked by anyone, but the spec requires one, so an unset VAPID_SUBJECT
 * falls back to a mailto that is at least the right shape.
 */
function subject(): string {
  const raw = process.env.VAPID_SUBJECT?.trim();
  if (!raw) return "mailto:shop@velinaiq.com";
  return /^(https?|mailto):/.test(raw) ? raw : `mailto:${raw}`;
}

// ── Subscriptions ───────────────────────────────────────────────────

/**
 * Remember a device. An endpoint the shop already knows is updated in place:
 * a browser hands out the same endpoint every time it re-subscribes, and a
 * customer who orders twice should end up watching the second order, not
 * holding two rows for the first.
 */
export async function saveSubscription(
  sub: BrowserSubscription,
  topic: PushTopic,
  lang: Lang,
  order?: { id: number; token: string },
): Promise<void> {
  await ensureSchema();
  await query(
    `INSERT INTO push_subscriptions
       (endpoint, p256dh, auth, topic, order_id, track_token, lang)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (endpoint) DO UPDATE SET
       p256dh      = EXCLUDED.p256dh,
       auth        = EXCLUDED.auth,
       topic       = EXCLUDED.topic,
       order_id    = EXCLUDED.order_id,
       track_token = EXCLUDED.track_token,
       lang        = EXCLUDED.lang,
       created_at  = now()`,
    [
      sub.endpoint,
      sub.keys.p256dh,
      sub.keys.auth,
      topic,
      order?.id ?? null,
      order?.token ?? null,
      lang,
    ],
  );
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await ensureSchema();
  await query("DELETE FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
}

/** How many shop devices are listening. Shown on the admin page. */
export async function countAdminDevices(): Promise<number> {
  await ensureSchema();
  const res = await query<{ n: string }>(
    "SELECT count(*) AS n FROM push_subscriptions WHERE topic = 'admin'",
  );
  return Number(res.rows[0]?.n ?? 0);
}

interface Row {
  endpoint: string;
  p256dh: string;
  auth: string;
  lang: string;
}

// ── Sending ─────────────────────────────────────────────────────────

/** What a service worker receives and turns into a notification. */
export interface PushPayload {
  title: string;
  body: string;
  /** Where a tap should land, relative to the site root. */
  url?: string;
  /** Replaces an earlier notification carrying the same tag. */
  tag?: string;
}

/**
 * Deliver one payload to one device. Returns false when the device is gone,
 * which is the caller's cue to forget it.
 */
async function deliver(
  row: Row,
  payload: PushPayload,
  keys: Keys,
): Promise<boolean> {
  const target: WebPushSubscription = {
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
  };
  try {
    await webpush.sendNotification(target, JSON.stringify(payload), {
      vapidDetails: {
        subject: subject(),
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
      },
      TTL: 60 * 60 * 24,
    });
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status && GONE.has(status)) return false;
    console.error("Push delivery failed:", status ?? err);
    return true;
  }
}

/** Sends to every row, then drops the ones the push service has forgotten. */
async function sendToRows(
  rows: Row[],
  payload: (lang: Lang) => PushPayload,
): Promise<void> {
  if (rows.length === 0) return;
  const keys = await getKeys();
  if (!keys) return;

  const results = await Promise.all(
    rows.map((row) =>
      deliver(row, payload(row.lang === "en" ? "en" : "ar"), keys).then(
        (alive) => ({ endpoint: row.endpoint, alive }),
      ),
    ),
  );
  const dead = results.filter((r) => !r.alive).map((r) => r.endpoint);
  if (dead.length > 0) {
    await query("DELETE FROM push_subscriptions WHERE endpoint = ANY($1)", [
      dead,
    ]).catch((err) => console.error("Pruning dead subscriptions failed:", err));
  }
}

/** Wake every shop device. Used when an order lands. */
export async function pushToAdmins(
  payload: (lang: Lang) => PushPayload,
): Promise<void> {
  try {
    await ensureSchema();
    const res = await query<Row>(
      "SELECT endpoint, p256dh, auth, lang FROM push_subscriptions WHERE topic = 'admin'",
    );
    await sendToRows(res.rows, payload);
  } catch (err) {
    console.error("Admin push failed:", err);
  }
}

/** Wake the customer waiting on one order. */
export async function pushToOrder(
  orderId: number,
  payload: (lang: Lang) => PushPayload,
): Promise<void> {
  try {
    await ensureSchema();
    const res = await query<Row>(
      `SELECT endpoint, p256dh, auth, lang FROM push_subscriptions
       WHERE topic = 'order' AND order_id = $1`,
      [orderId],
    );
    await sendToRows(res.rows, payload);
  } catch (err) {
    console.error("Order push failed:", err);
  }
}

/** Sends one notification to one device, so a shop can check its setup. */
export async function sendTest(endpoint: string): Promise<boolean> {
  await ensureSchema();
  const keys = await getKeys();
  if (!keys) return false;
  const res = await query<Row>(
    "SELECT endpoint, p256dh, auth, lang FROM push_subscriptions WHERE endpoint = $1",
    [endpoint],
  );
  const row = res.rows[0];
  if (!row) return false;
  const ar = row.lang !== "en";
  return deliver(
    row,
    {
      title: ar ? "الإشعارات تعمل" : "Notifications are on",
      body: ar
        ? "سيصلك تنبيه على هذا الجهاز عند وصول طلب جديد."
        : "This device will be alerted when a new order arrives.",
      url: "/admin/orders",
      tag: "push-test",
    },
    keys,
  );
}

// ── The two things the shop actually notifies about ──────────────────

/** An order has just been placed. Wakes the shop's own devices. */
export function notifyOrderPlaced(order: {
  id: number;
  customer_name: string;
  grand_total: number;
}): Promise<void> {
  const total = Math.round(order.grand_total).toLocaleString("en-US");
  const name = order.customer_name.trim();
  return pushToAdmins((lang) =>
    lang === "ar"
      ? {
          title: `طلب جديد #${order.id}`,
          body: name ? `${name} · ${total} د.ع` : `${total} د.ع`,
          url: "/admin/orders",
          tag: `order-${order.id}`,
        }
      : {
          title: `New order #${order.id}`,
          body: name ? `${name} · ${total} IQD` : `${total} IQD`,
          url: "/admin/orders",
          tag: `order-${order.id}`,
        },
  );
}

/** An order has been approved. Wakes the customer who placed it. */
export function notifyOrderApproved(orderId: number): Promise<void> {
  return pushToOrder(orderId, (lang) =>
    lang === "ar"
      ? {
          title: "تمت الموافقة على طلبك",
          body: `طلبك رقم #${orderId} قيد التجهيز الآن.`,
          url: "/",
          tag: `order-${orderId}`,
        }
      : {
          title: "Your order is approved",
          body: `Order #${orderId} is being prepared now.`,
          url: "/",
          tag: `order-${orderId}`,
        },
  );
}
