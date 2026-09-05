// Telegram notifications: every order placed on the storefront (or rung up at
// the counter) is pushed to the shop's Telegram chat the moment it lands.
//
// Two pieces of configuration:
//
//   • The bot token. Read from TELEGRAM_BOT_TOKEN, falling back to the
//     `telegram_bot_token` setting in the database for shops with no way to
//     set environment variables. The environment always wins — a token in the
//     environment is the one place it can't be read back out of the app.
//
//   • Where to send. A bot cannot start a conversation, so somebody has to
//     message it (or add it to a group) before it can reply. The chat ids that
//     come out of that live in the `telegram_chat_ids` setting and are managed
//     from /admin/telegram.
//
// Nothing here is allowed to break an order. Every failure is logged and
// swallowed: a shop whose Telegram is misconfigured still takes orders.

import { getSetting, getStringList, setStringList, setSetting } from "./settings";
import type { Order } from "@/types";
import { mapsLink } from "./format";

const API = "https://api.telegram.org";

/** Telegram is slow or unreachable far more often than it is broken. */
const TIMEOUT_MS = 8000;

/** Telegram's hard limit on a message. Over it, sendMessage fails outright. */
const MAX_MESSAGE = 4096;

export const TOKEN_SETTING = "telegram_bot_token";
export const CHATS_SETTING = "telegram_chat_ids";

// ── Configuration ───────────────────────────────────────────────────

/** The bot token: the environment first, the database second, else null. */
export async function getToken(): Promise<string | null> {
  const fromEnv = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  const stored = (await getSetting(TOKEN_SETTING))?.trim();
  return stored || null;
}

/** True when the token comes from the environment and can't be edited here. */
export function tokenIsFromEnv(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN?.trim();
}

export function getChatIds(): Promise<string[]> {
  return getStringList(CHATS_SETTING);
}

export function setChatIds(ids: string[]): Promise<void> {
  // De-duplicated and trimmed, so adding the same chat twice is harmless.
  return setStringList(CHATS_SETTING, [
    ...new Set(ids.map((id) => id.trim()).filter(Boolean)),
  ]);
}

export function setStoredToken(token: string | null): Promise<void> {
  return setSetting(TOKEN_SETTING, token && token.trim() ? token.trim() : null);
}

/** A token with only its tail visible — enough to tell two bots apart. */
export function maskToken(token: string): string {
  const tail = token.slice(-4);
  const id = token.split(":")[0];
  return `${id}:••••${tail}`;
}

// ── Telegram API ────────────────────────────────────────────────────

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

/**
 * One call to the Bot API. Always resolves — callers get `ok: false` and a
 * description rather than an exception, because every caller here is either
 * reporting status to an admin or running beside an order that must not fail.
 */
async function call<T>(
  token: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<TelegramResponse<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as TelegramResponse<T> | null;
    if (!json) return { ok: false, description: `HTTP ${res.status}` };
    return json;
  } catch (err) {
    const reason =
      err instanceof Error && err.name === "AbortError"
        ? "Telegram did not respond in time."
        : err instanceof Error
          ? err.message
          : String(err);
    return { ok: false, description: reason };
  } finally {
    clearTimeout(timer);
  }
}

export interface BotInfo {
  id: number;
  username?: string;
  first_name?: string;
}

/** Who the token belongs to — used to confirm a token actually works. */
export async function getBotInfo(
  token: string,
): Promise<{ ok: true; bot: BotInfo } | { ok: false; error: string }> {
  const res = await call<BotInfo>(token, "getMe");
  return res.ok && res.result
    ? { ok: true, bot: res.result }
    : { ok: false, error: res.description ?? "Telegram rejected the token." };
}

export interface DiscoveredChat {
  id: string;
  title: string;
  type: string;
}

/**
 * Chats that have spoken to the bot recently, so an admin can pick theirs
 * instead of hunting for a numeric id.
 *
 * Telegram only keeps undelivered updates for 24 hours, and this deliberately
 * does not acknowledge them (no `offset`), so calling it repeatedly keeps
 * returning the same chats rather than consuming them.
 */
export async function discoverChats(
  token: string,
): Promise<{ ok: true; chats: DiscoveredChat[] } | { ok: false; error: string }> {
  const res = await call<Array<Record<string, unknown>>>(token, "getUpdates", {
    limit: 100,
    allowed_updates: ["message", "channel_post", "my_chat_member"],
  });
  if (!res.ok || !res.result)
    return { ok: false, error: res.description ?? "Could not reach Telegram." };

  const byId = new Map<string, DiscoveredChat>();
  for (const update of res.result) {
    // Any of these shapes carries a chat; a plain message is the common one.
    const carrier = (update.message ??
      update.channel_post ??
      update.my_chat_member) as Record<string, unknown> | undefined;
    const chat = carrier?.chat as Record<string, unknown> | undefined;
    if (!chat || chat.id == null) continue;
    const id = String(chat.id);
    const title =
      (chat.title as string) ||
      [chat.first_name, chat.last_name].filter(Boolean).join(" ") ||
      (chat.username as string) ||
      id;
    byId.set(id, { id, title, type: String(chat.type ?? "chat") });
  }
  return { ok: true, chats: [...byId.values()] };
}

// ── Message formatting ──────────────────────────────────────────────

/** Telegram's HTML parse mode needs exactly these three escaped. */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const iqd = (n: number) =>
  `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} د.ع`;

/**
 * The order as a Telegram message. Arabic, like the WhatsApp invoice in
 * lib/format.ts and for the same reason: whoever reads it in the shop reads
 * Arabic, whatever language the admin happens to be browsing in.
 */
export function orderToTelegramHtml(order: Order): string {
  const d = new Date(order.created_at);
  const lines: string[] = [
    `🧾 <b>طلب جديد — ${esc("velina")}</b>`,
    `رقم الطلب: <code>${String(order.id).padStart(5, "0")}</code>`,
    `التاريخ: ${d.toLocaleDateString("en-GB")} — ${d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    "",
    "<b>المنتجات:</b>",
  ];
  /** Where the item lines get spliced in. */
  const headEnd = lines.length;

  // Item lines are kept separate from the rest so a very long order can lose
  // some of them without losing the totals or the delivery address — see the
  // trim below.
  const itemLines: string[] = [];
  for (const it of order.items) {
    const bonus = it.is_free ? " 🎁 (مجاني)" : "";
    // The option — a size or flavour — belongs on the line: it is what the
    // person picking the order off the shelf actually needs.
    const option = it.variant_name ? ` — ${esc(it.variant_name)}` : "";
    itemLines.push(
      `▪️ [${esc(it.product_code)}] ${esc(it.product_name)}${option}${bonus}`,
    );
    itemLines.push(
      `   الكمية: ${it.quantity} × ${iqd(it.unit_price)} = ${iqd(it.subtotal)}`,
    );
  }

  if (order.customer_name || order.customer_phone || order.customer_location) {
    lines.push("", "<b>التوصيل:</b>");
    if (order.customer_name) lines.push(`👤 ${esc(order.customer_name)}`);
    if (order.customer_phone)
      // Tappable: a driver should be able to ring the customer from here.
      lines.push(
        `📞 <a href="tel:${encodeURIComponent(order.customer_phone)}">${esc(order.customer_phone)}</a>`,
      );
    if (order.customer_location) {
      lines.push(`📍 ${esc(order.customer_location)}`);
      lines.push(`🗺️ <a href="${esc(mapsLink(order.customer_location))}">فتح الخريطة</a>`);
    }
  }

  lines.push("");
  const subtotal = order.items.reduce((sum, it) => sum + it.subtotal, 0);
  if (order.discount > 0) {
    lines.push(`المجموع: ${iqd(subtotal)}`);
    lines.push(`الخصم: −${iqd(order.discount)}`);
  }
  lines.push(`<b>المجموع الكلي: ${iqd(order.grand_total)}</b>`);

  if (order.notes.trim()) lines.push("", `📝 ملاحظات: ${esc(order.notes.trim())}`);
  lines.push("", order.status === "approved" ? "✅ مؤكد" : "🕒 بانتظار التأكيد");

  // An order long enough to blow the message limit would otherwise be sent as
  // nothing at all. Drop item lines — in pairs, so a product never appears
  // without its quantity — until it fits, and say how many were left out. The
  // totals and the delivery details always survive.
  const head = lines.slice(0, headEnd);
  const tail = lines.slice(headEnd);
  const fixed = [...head, ...tail].join("\n").length + 1;
  let shown = itemLines.length;
  const budget = () =>
    fixed + itemLines.slice(0, shown).join("\n").length + 60;
  while (shown > 2 && budget() > MAX_MESSAGE) shown -= 2;

  const omitted = (itemLines.length - shown) / 2;
  const body = itemLines.slice(0, shown);
  if (omitted > 0) body.push(`… و${omitted} منتجاً آخر (راجع الطلب في اللوحة)`);

  return [...head, ...body, ...tail].join("\n");
}

// ── Sending ─────────────────────────────────────────────────────────

export interface SendOutcome {
  chatId: string;
  ok: boolean;
  error?: string;
}

/** Sends one HTML message to every configured chat. Never throws. */
export async function sendToAll(html: string): Promise<SendOutcome[]> {
  const token = await getToken();
  if (!token) return [];
  const chatIds = await getChatIds();
  if (chatIds.length === 0) return [];
  return sendTo(token, chatIds, html);
}

/** Sends to an explicit set of chats — used by the "send a test" button. */
export async function sendTo(
  token: string,
  chatIds: string[],
  html: string,
): Promise<SendOutcome[]> {
  const overLong = html.length > MAX_MESSAGE;
  const text = overLong
    ? `${html.replace(/<[^>]*>/g, "").slice(0, MAX_MESSAGE - 1)}…`
    : html;
  return Promise.all(
    chatIds.map(async (chatId) => {
      const res = await call(token, "sendMessage", {
        chat_id: chatId,
        text,
        parse_mode: overLong ? undefined : "HTML",
        // The map and phone links are the point; a link preview on top of
        // them would just push the order off the screen.
        link_preview_options: { is_disabled: true },
      });
      return res.ok
        ? { chatId, ok: true }
        : { chatId, ok: false, error: res.description ?? "Unknown error" };
    }),
  );
}

/**
 * Announce a new order. Safe to call and forget: it resolves even when
 * Telegram is down or nothing is configured, and it never rejects, so an
 * order is never lost to a notification problem.
 */
export async function notifyNewOrder(order: Order): Promise<void> {
  try {
    const outcomes = await sendToAll(orderToTelegramHtml(order));
    for (const o of outcomes) {
      if (!o.ok)
        console.error(`Telegram: order ${order.id} → chat ${o.chatId}: ${o.error}`);
    }
  } catch (err) {
    console.error("Telegram notify failed:", err);
  }
}
