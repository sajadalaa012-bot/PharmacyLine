import { getActiveLang, tt } from "./i18n";

/** Western digits in both languages — Iraqi price lists are written this way,
 *  and it keeps `tabular-nums` alignment working across a mixed-language UI. */
export function num(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** The currency label for the reader's language: IQD / د.ع */
export function currency(): string {
  return tt("common.currency");
}

export function money(n: number): string {
  return `${num(n)} ${currency()}`;
}

export function orderNo(id: number): string {
  return `Nº ${String(id).padStart(5, "0")}`;
}

/** Gregorian dates with Arabic month names when reading Arabic. */
function dateLocale(): string {
  return getActiveLang() === "ar" ? "ar" : "en-US";
}

export function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(dateLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
    numberingSystem: "latn",
  });
}

export function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(dateLocale(), {
    hour: "2-digit",
    minute: "2-digit",
    numberingSystem: "latn",
  });
}

/* ── WhatsApp order message (Arabic) ─────────────────────────────────── */
// Deliberately Arabic whatever the UI language: it is sent to Iraqi customers
// and pharmacies, not read back inside the app.

import type { Order } from "@/types";

const iqd = (n: number) => `${num(n)} د.ع`;

/** Coordinates anywhere in a delivery location, as the cart's "use my
 *  location" button writes them. */
const PIN = /(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/;
/** The same pin where that button puts it — at the end, after the address. */
const PIN_AT_END = /(\s*·)?\s*-?\d{1,2}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}\s*$/;

/**
 * A Google Maps link for a delivery location: the exact pin when the text
 * carries coordinates, otherwise a search for the address as written.
 * Raw coordinates are something to copy and paste; a link is something to
 * tap, which is what a phone is for.
 */
export function mapsLink(location: string): string {
  const pin = location.match(PIN);
  return pin
    ? `https://www.google.com/maps?q=${pin[1]},${pin[2]}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        location.trim(),
      )}`;
}

export function orderToWhatsAppText(order: Order): string {
  const d = new Date(order.created_at);
  const lines: string[] = [
    "🧾 *فاتورة — AL-MASA*",
    `رقم الطلب: ${String(order.id).padStart(5, "0")}`,
    `التاريخ: ${d.toLocaleDateString("en-GB")} — ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
    "",
    "*المنتجات:*",
  ];

  for (const it of order.items) {
    const bonus = it.is_free ? " 🎁 (مجاني)" : "";
    lines.push(`▪️ [${it.product_code}] ${it.product_name}${bonus}`);
    lines.push(`   الكمية: ${it.quantity} × ${iqd(it.unit_price)} = ${iqd(it.subtotal)}`);
  }

  // Delivery block — the driver reads this message, so it goes near the top
  // of the totals rather than buried under the notes.
  if (order.customer_name || order.customer_phone || order.customer_location) {
    lines.push("", "*التوصيل:*");
    if (order.customer_name) lines.push(`👤 ${order.customer_name}`);
    if (order.customer_phone) lines.push(`📞 ${order.customer_phone}`);
    if (order.customer_location) {
      // The address in words, then a tappable map — never the bare numbers,
      // which are no use to whoever is driving.
      const address = order.customer_location.replace(PIN_AT_END, "").trim();
      if (address) lines.push(`📍 ${address}`);
      lines.push(`🗺️ ${mapsLink(order.customer_location)}`);
    }
  }

  lines.push("");
  const subtotal = order.items.reduce((sum, it) => sum + it.subtotal, 0);
  if (order.discount > 0) {
    lines.push(`المجموع: ${iqd(subtotal)}`);
    lines.push(`الخصم: −${iqd(order.discount)}`);
  }
  lines.push(`*المجموع الكلي: ${iqd(order.grand_total)}*`);

  if (order.notes.trim()) {
    lines.push("", `📝 ملاحظات: ${order.notes.trim()}`);
  }

  return lines.join("\n");
}

export function whatsAppShareUrl(order: Order): string {
  return `https://wa.me/?text=${encodeURIComponent(orderToWhatsAppText(order))}`;
}
