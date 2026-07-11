"use client";

import { useEffect, useState } from "react";
import { trackOrder, OrderTracking } from "@/lib/api";
import { getMyOrders, SavedOrder } from "@/lib/myOrders";
import { money, orderNo, shortDate, shortTime } from "@/lib/format";
import { ClipboardList } from "lucide-react";

function StatusBadge({ status }: { status: "pending" | "approved" }) {
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

type Row = SavedOrder & { tracking?: OrderTracking | null };

/** The customer's own orders (placed from this device) with live status. */
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
        tracking: await trackOrder(o.id, o.token).catch(() => null),
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
            key={row.id}
            className="rounded-lg border border-line bg-sunken/30 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-ink tabular-nums">
                {orderNo(row.id)}
              </span>
              {row.tracking ? (
                <StatusBadge status={row.tracking.status} />
              ) : (
                <span className="label-caps text-ink-3">status unavailable</span>
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <span className="text-[11px] text-ink-3">
                {shortDate(row.created_at)} · {shortTime(row.created_at)}
              </span>
              <span className="text-[13px] font-bold text-ink tabular-nums">
                {money(row.tracking?.grand_total ?? row.grand_total)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
