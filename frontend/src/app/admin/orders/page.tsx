"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Order } from "@/types";
import { fetchOrders, updateOrder, deleteOrder } from "@/lib/api";
import { money, orderNo, shortDate, shortTime, whatsAppShareUrl } from "@/lib/format";
import { ChevronRight, Plus, Edit3, Check, MessageCircle, Trash2, ReceiptText } from "lucide-react";
import Receipt from "@/components/Receipt";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "pending">("all");
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const load = useCallback(async () => {
    try {
      setOrders(await fetchOrders());
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = useCallback(
    async (order: Order) => {
      setApprovingId(order.id);
      setError(null);
      try {
        await updateOrder(order.id, {
          notes: order.notes,
          discount: order.discount,
          grand_total: order.grand_total,
          status: "approved",
          items: order.items.map(({ id: _id, ...item }) => item),
        });
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setApprovingId(null);
      }
    },
    [load]
  );

  const remove = useCallback(
    async (order: Order) => {
      setDeletingId(order.id);
      setError(null);
      try {
        await deleteOrder(order.id);
        setConfirmId(null);
        setOpenId(null);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setDeletingId(null);
      }
    },
    [load]
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
      </div>
    );
  }

  if (receiptOrder) {
    return (
      <Receipt
        order={receiptOrder}
        onBack={() => setReceiptOrder(null)}
        backLabel="Back to orders"
      />
    );
  }

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const totalRevenue = orders
    .filter((o) => o.status === "approved")
    .reduce((sum, o) => sum + o.grand_total, 0);
  const visible =
    filter === "pending" ? orders.filter((o) => o.status === "pending") : orders;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-6 py-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Orders
          </h1>
          <p className="mt-1 text-xs text-ink-3">
            {orders.length} orders · {money(totalRevenue)} approved sales
            {pendingCount > 0 && (
              <span className="ml-2 font-semibold text-copper">
                {pendingCount} awaiting approval
              </span>
            )}
          </p>
        </div>
        <Link
          href="/admin/sell"
          className="label-caps flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-on-brand transition hover:bg-brand-deep active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          New sale
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setFilter("all")}
          className={`label-caps rounded-md px-3.5 py-2 transition ${
            filter === "all"
              ? "bg-brand text-on-brand"
              : "border border-line text-ink-2 hover:bg-sunken"
          }`}
        >
          All ({orders.length})
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`label-caps rounded-md px-3.5 py-2 transition ${
            filter === "pending"
              ? "bg-copper text-white"
              : "border border-line text-ink-2 hover:bg-sunken"
          }`}
        >
          Pending ({pendingCount})
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-rose/30 bg-rose/10 p-3 text-xs text-rose">
          {error}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface py-16 text-center">
          <p className="text-sm font-medium text-ink-2">
            {filter === "pending" ? "No pending orders" : "No orders yet"}
          </p>
          <p className="mt-1 text-xs text-ink-3">
            Orders placed from the storefront appear here for review
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {visible.map((order) => {
            const open = openId === order.id;
            const pending = order.status === "pending";
            return (
              <li key={order.id}>
                <button
                  onClick={() => setOpenId(open ? null : order.id)}
                  className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-sunken/40"
                >
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200 ${
                      open ? "rotate-90" : ""
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                      {orderNo(order.id)}
                      <span
                        className={`label-caps rounded-sm border px-1.5 py-px ${
                          pending
                            ? "border-copper/40 bg-copper/10 text-copper"
                            : "border-brand/30 bg-brand/10 text-brand"
                        }`}
                      >
                        {pending ? "Pending" : "Approved"}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-3">
                      {shortDate(order.created_at)} · {shortTime(order.created_at)} ·{" "}
                      {order.items.length} {order.items.length === 1 ? "line" : "lines"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-ink tabular-nums">
                      {money(order.grand_total)}
                    </p>
                    {order.discount > 0 && (
                      <p className="mt-0.5 text-[10px] font-medium text-copper tabular-nums">
                        −{money(order.discount)} discount
                      </p>
                    )}
                  </div>
                </button>

                {open && (
                  <div className="fade-in border-t border-line bg-sunken/30 px-5 py-4 pl-12">
                    <ul className="divide-y divide-line/60">
                      {order.items.map((item) => (
                        <li key={item.id} className="py-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-medium leading-snug text-ink">
                                <span className="mr-1.5 font-mono text-[11px] font-bold text-brand">
                                  {item.product_code}
                                </span>
                                <bdi>{item.product_name}</bdi>
                                {item.is_free && (
                                  <span className="label-caps ml-1.5 rounded-sm border border-copper/35 bg-copper/[0.08] px-1 py-px text-copper">
                                    Bonus
                                  </span>
                                )}
                              </p>
                              <p className="mt-0.5 text-[11px] text-ink-3 tabular-nums" dir="ltr">
                                {item.quantity} × {money(item.unit_price)}
                              </p>
                            </div>
                            <span className="shrink-0 text-[13px] font-bold text-ink tabular-nums">
                              {money(item.subtotal)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {order.notes && (
                      <div className="mt-3 rounded-md border border-line bg-surface p-3">
                        <p className="label-caps mb-1 text-ink-3">Notes</p>
                        <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink-2">
                          {order.notes}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {pending ? (
                        <>
                          <Link
                            href={`/admin/sell?order=${order.id}`}
                            className="flex h-9 items-center gap-2 rounded-md bg-brand px-3.5 text-[13px] font-semibold text-on-brand transition hover:bg-brand-deep active:scale-[0.98]"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Review & Edit
                          </Link>
                          <button
                            onClick={() => approve(order)}
                            disabled={approvingId === order.id}
                            className="flex h-9 items-center gap-2 rounded-md border border-brand/40 bg-brand/10 px-3.5 text-[13px] font-semibold text-brand transition hover:bg-brand/20 active:scale-[0.98] disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" />
                            {approvingId === order.id ? "Approving…" : "Approve As-Is"}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setReceiptOrder(order)}
                            className="flex h-9 items-center gap-2 rounded-md bg-brand px-3.5 text-[13px] font-semibold text-on-brand transition hover:bg-brand-deep active:scale-[0.98]"
                          >
                            <ReceiptText className="h-3.5 w-3.5" />
                            Receipt
                          </button>
                          <a
                            href={whatsAppShareUrl(order)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-9 items-center gap-2 rounded-md bg-[#25d366] px-3.5 text-[13px] font-semibold text-[#08301b] transition hover:brightness-95 active:scale-[0.98]"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Send via WhatsApp
                          </a>
                        </>
                      )}

                      {confirmId === order.id ? (
                        <div className="ml-auto flex items-center gap-2">
                          <span className="text-[13px] font-medium text-ink-2">
                            Delete permanently?
                          </span>
                          <button
                            onClick={() => remove(order)}
                            disabled={deletingId === order.id}
                            className="flex h-9 items-center gap-2 rounded-md bg-rose px-3.5 text-[13px] font-semibold text-white transition hover:brightness-95 active:scale-[0.98] disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deletingId === order.id ? "Deleting…" : "Yes, delete"}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="flex h-9 items-center rounded-md border border-line px-3.5 text-[13px] font-semibold text-ink-2 transition hover:bg-sunken"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(order.id)}
                          className="ml-auto flex h-9 items-center gap-2 rounded-md border border-rose/35 px-3.5 text-[13px] font-semibold text-rose transition hover:bg-rose/10 active:scale-[0.98]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
