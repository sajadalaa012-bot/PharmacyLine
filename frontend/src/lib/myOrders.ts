// Remembers, on this device, which orders this customer placed — so the
// storefront "My Orders" view can show them and look up their live status
// (via /api/orders/track) without exposing anyone else's orders.

import { Order } from "@/types";

const KEY = "pl_my_orders";

export interface SavedOrder {
  id: number;
  order_number: string;
  email: string;
  created_at: string;
  total: number;
}

export function getMyOrders(): SavedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedOrder[]) : [];
  } catch {
    return [];
  }
}

export function saveMyOrder(order: Order): void {
  if (typeof window === "undefined") return;
  const list = getMyOrders();
  if (list.some((o) => o.order_number === order.order_number)) return;
  list.unshift({
    id: order.id,
    order_number: order.order_number,
    email: order.customer_email,
    created_at: order.created_at,
    total: order.total,
  });
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
}
