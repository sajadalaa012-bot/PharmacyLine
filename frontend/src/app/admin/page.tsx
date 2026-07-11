"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Category, Order } from "@/types";
import { fetchProducts, fetchOrders } from "@/lib/api";
import { money, orderNo, shortDate, shortTime } from "@/lib/format";
import { ChevronRight } from "lucide-react";

export default function AdminOverviewPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [cats, ords] = await Promise.all([
        fetchProducts(),
        fetchOrders().catch(() => [] as Order[]),
      ]);
      setCategories(cats);
      setOrders(ords);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
      </div>
    );
  }

  const approved = orders.filter((o) => o.status === "approved");
  const pendingCount = orders.length - approved.length;
  const totalRevenue = approved.reduce((sum, o) => sum + o.grand_total, 0);
  const totalProducts = categories.reduce((sum, c) => sum + c.products.length, 0);

  // Top products by revenue, computed from order lines (excludes bonus items).
  const revenueByProduct = new Map<string, number>();
  for (const order of approved) {
    for (const item of order.items) {
      if (item.is_free) continue;
      revenueByProduct.set(
        item.product_name,
        (revenueByProduct.get(item.product_name) ?? 0) + item.subtotal
      );
    }
  }
  const topProducts = [...revenueByProduct.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);
  const maxRevenue = topProducts[0]?.[1] ?? 1;

  const stats = [
    { label: "Total sales", value: money(totalRevenue), context: "approved orders" },
    {
      label: "Orders",
      value: String(orders.length),
      context: pendingCount > 0 ? `${pendingCount} pending approval` : "all approved",
    },
    { label: "Products", value: String(totalProducts), context: "in catalog" },
    { label: "Categories", value: String(categories.length), context: "active" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-7">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Overview
        </h1>
        <p className="mt-1 text-xs text-ink-3">
          Catalog and sales at a glance
        </p>
      </div>

      {/* KPI band — one card, hairline-divided */}
      <div className="grid grid-cols-2 divide-line overflow-hidden rounded-lg border border-line bg-surface sm:grid-cols-4 sm:divide-x">
        {stats.map((s) => (
          <div key={s.label} className="px-5 py-4">
            <p className="label-caps text-ink-3">{s.label}</p>
            <p className="mt-2 font-display text-[22px] font-semibold leading-none tracking-tight text-ink tabular-nums">
              {s.value}
            </p>
            <p className="mt-1.5 text-[11px] text-ink-3">{s.context}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top products by revenue */}
        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="label-caps text-ink-2">Top products by revenue</h2>
          {topProducts.length === 0 ? (
            <p className="py-10 text-center text-xs text-ink-3">
              No sales recorded yet
            </p>
          ) : (
            <ul className="mt-4 space-y-3.5">
              {topProducts.map(([pname, revenue]) => (
                <li key={pname}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                    <span className="truncate font-medium text-ink">{pname}</span>
                    <span className="shrink-0 font-semibold text-ink-2 tabular-nums">
                      {money(revenue)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-sunken">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${Math.max(4, (revenue / maxRevenue) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent orders */}
        <section className="rounded-lg border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="label-caps text-ink-2">Recent orders</h2>
            <Link
              href="/admin/orders"
              className="label-caps flex items-center gap-1 text-brand transition hover:opacity-80"
            >
              View all
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {orders.length === 0 ? (
            <p className="py-10 text-center text-xs text-ink-3">
              No orders registered yet
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {orders.slice(0, 8).map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    <p className="text-xs font-semibold text-ink">
                      {orderNo(order.id)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-3">
                      {shortDate(order.created_at)} · {shortTime(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-ink tabular-nums">
                      {money(order.grand_total)}
                    </p>
                    {order.discount > 0 && (
                      <p className="mt-0.5 text-[10px] font-medium text-copper tabular-nums">
                        −{money(order.discount)} discount
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
