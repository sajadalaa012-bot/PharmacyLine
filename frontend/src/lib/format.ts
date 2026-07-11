export function money(n: number): string {
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} IQD`;
}

export function orderNo(id: number): string {
  return `Nº ${String(id).padStart(5, "0")}`;
}

export function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── WhatsApp order message (Arabic) ─────────────────────────────────── */

import type { Order } from "@/types";

const iqd = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} د.ع`;

export function orderToWhatsAppText(order: Order): string {
  const d = new Date(order.created_at);
  const lines: string[] = [
    "🧾 *فاتورة — Pharmacy Line*",
    `رقم الطلب: ${order.order_number}`,
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
  lines.push(`*المجموع الكلي: ${iqd(order.total)}*`);

  if (order.notes.trim()) {
    lines.push("", `📝 ملاحظات: ${order.notes.trim()}`);
  }

  return lines.join("\n");
}

export function whatsAppShareUrl(order: Order): string {
  return `https://wa.me/?text=${encodeURIComponent(orderToWhatsAppText(order))}`;
}
