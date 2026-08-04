"use client";

import { useEffect, useState } from "react";
import { Order } from "@/types";
import { trackOrder } from "@/lib/api";
import { getMyOrders } from "@/lib/myOrders";
import { money, orderNo, shortDate, shortTime } from "@/lib/format";
import { ClipboardList, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";

function StatusBadge({ status }: { status: "pending" | "approved" }) {
  const { t } = useI18n();
  const pending = status === "pending";
  return (
    <span
      className={`label-caps shrink-0 rounded-full border px-2 py-0.5 ${
        pending
          ? "border-amber-400/50 bg-amber-400/15 text-amber-700 dark:text-amber-300"
          : "border-green-500/50 bg-green-500/15 text-green-700 dark:text-green-300"
      }`}
    >
      {pending ? t("common.pending") : t("common.approved")}
    </span>
  );
}

/** The customer's own orders (placed from this device), each expandable to
 *  review its full details, with live status from the shared database. */
export default function OrderHistory() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const saved = getMyOrders();
    if (saved.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(saved.map((o) => trackOrder(o.id, o.token).catch(() => null)))
      .then((results) => {
        if (!active) return;
        setOrders(results.filter((o): o is Order => o !== null));
        setLoading(false);
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

  if (orders.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-line-strong text-ink-3">
          <ClipboardList className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-ink-2">{t("history.empty")}</p>
        <p className="text-xs text-ink-3">{t("history.emptyHint")}</p>
      </div>
    );
  }

  const itemsSubtotal = (order: Order) =>
    order.items.reduce((s, it) => s + it.subtotal, 0);

  return (
    <div className="scroll-thin h-full overflow-y-auto px-5 py-4">
      <ul className="space-y-3">
        {orders.map((order) => {
          const open = openId === order.id;
          return (
            <li
              key={order.id}
              className="overflow-hidden rounded-lg border border-line bg-sunken/30"
            >
              <button
                onClick={() => setOpenId(open ? null : order.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-sunken/60"
              >
                <ChevronRight
                  className={`h-4 w-4 shrink-0 text-ink-3 transition-transform flip-rtl ${open ? "rotate-90" : ""}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-semibold text-ink tabular-nums"
                      dir="ltr"
                    >
                      {orderNo(order.id)}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-ink-3">
                    {shortDate(order.created_at)} · {shortTime(order.created_at)}
                  </p>
                </div>
                <span className="shrink-0 text-[13px] font-bold text-ink tabular-nums">
                  {money(order.grand_total)}
                </span>
              </button>

              {open && (
                <div className="fade-in border-t border-line px-4 py-3">
                  <ul className="divide-y divide-line/60">
                    {order.items.map((item) => (
                      <li key={item.id} className="py-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 flex-1 text-[13px] text-ink">
                            <span className="me-1.5 font-mono text-[11px] font-bold text-brand">
                              {item.product_code}
                            </span>
                            <bdi>{item.product_name}</bdi>
                            {item.is_free && (
                              <span className="label-caps ms-1.5 rounded-sm border border-copper/35 bg-copper/[0.08] px-1 py-px text-copper">
                                {t("common.bonus")}
                              </span>
                            )}
                            <span className="ms-1.5 text-[11px] text-ink-3 tabular-nums" dir="ltr">
                              {item.quantity} × {money(item.unit_price)}
                            </span>
                          </p>
                          <span className="shrink-0 text-[13px] font-semibold text-ink tabular-nums">
                            {money(item.subtotal)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-2 space-y-1 border-t border-line pt-2 text-[12px]">
                    {order.discount > 0 && (
                      <>
                        <div className="flex justify-between text-ink-3">
                          <span>{t("common.subtotal")}</span>
                          <span className="tabular-nums">
                            {money(itemsSubtotal(order))}
                          </span>
                        </div>
                        <div className="flex justify-between text-brand">
                          <span>{t("common.discount")}</span>
                          <span className="tabular-nums">
                            −{money(order.discount)}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between font-semibold text-ink">
                      <span>{t("common.total")}</span>
                      <span className="tabular-nums">{money(order.grand_total)}</span>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="mt-3 rounded-md border border-line bg-surface p-2.5">
                      <p className="label-caps mb-1 text-ink-3">{t("common.notes")}</p>
                      <p className="whitespace-pre-wrap text-xs text-ink-2">
                        {order.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
