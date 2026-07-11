"use client";

import { useEffect, useState } from "react";
import { Order, OrderStatus } from "@/types";
import { fetchOrders } from "@/lib/api";
import { money, orderNo, shortDate, shortTime } from "@/lib/format";
import { ClipboardList } from "lucide-react";

/** Status pill — Pending = yellow/orange, Approved = green. */
function StatusBadge({ status }: { status: OrderStatus }) {
  const pending = status === "pending";
  return (
    <span
      className={`label-caps shrink-0 rounded-full border px-2 py-0.5 ${
        pending
          ? "border-amber-400/50 bg-amber-400/15 text-amber-700 dark:text-amber-300"
          : "border-green-500/50 bg-green-500/15 text-green-700 dark:text-green-300"
      }`}
    >
      {pending ? "Pending" : "Approved"}
    </span>
  );
}

/**
 * The customer's order history, shown in the cart drawer. Lists orders placed
 * from this device with their ID, date, and status. Re-fetches each time it
 * mounts (i.e. every time the "My Orders" tab is opened).
 */
export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchOrders()
      .then((o) => active && setOrders(o))
      .catch(() => active && setOrders([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-line-strong text-ink-3">
          <ClipboardList className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-ink-2">No orders yet</p>
        <p className="text-xs text-ink-3">Orders you place will show up here.</p>
      </div>
    );
  }

  return (
    <div className="scroll-thin h-full overflow-y-auto px-5 py-4">
      <ul className="space-y-3">
        {orders.map((order) => (
          <li
            key={order.id}
            className="rounded-lg border border-line bg-sunken/30 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-ink tabular-nums">
                {orderNo(order.id)}
              </span>
              <StatusBadge status={order.status} />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <span className="text-[11px] text-ink-3">
                {shortDate(order.created_at)} · {shortTime(order.created_at)}
              </span>
              <span className="text-[13px] font-bold text-ink tabular-nums">
                {money(order.grand_total)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
