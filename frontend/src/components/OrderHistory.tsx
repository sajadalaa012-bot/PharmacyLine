"use client";

import { useEffect, useState } from "react";
import { trackOrder, OrderTracking } from "@/lib/api";
import { getMyOrders, SavedOrder } from "@/lib/myOrders";
import { money, shortDate, shortTime } from "@/lib/format";
import { OrderStatusBadge, PaymentStatusBadge } from "./StatusBadge";
import { ClipboardList } from "lucide-react";

type Row = SavedOrder & { tracking?: OrderTracking | null };

/**
 * The customer's own orders (placed from this device), with live status
 * pulled from the server for each via the public track endpoint.
 */
export default function OrderHistory() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const saved = getMyOrders();
    if (saved.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(
      saved.map(async (o) => ({
        ...o,
        tracking: await trackOrder(o.order_number, o.email).catch(() => null),
      })),
    ).then((resolved) => {
      if (active) {
        setRows(resolved);
        setLoading(false);
      }
    });
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

  if (rows.length === 0) {
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
        {rows.map((row) => (
          <li
            key={row.order_number}
            className="rounded-lg border border-line bg-sunken/30 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-ink tabular-nums">
                {row.order_number}
              </span>
              {row.tracking ? (
                <OrderStatusBadge status={row.tracking.order_status} />
              ) : (
                <span className="label-caps text-ink-3">status unavailable</span>
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <span className="text-[11px] text-ink-3">
                {shortDate(row.created_at)} · {shortTime(row.created_at)}
              </span>
              <span className="text-[13px] font-bold text-ink tabular-nums">
                {money(row.total)}
              </span>
            </div>
            {row.tracking && (
              <div className="mt-2">
                <PaymentStatusBadge status={row.tracking.payment_status} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
