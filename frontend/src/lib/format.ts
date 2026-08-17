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
