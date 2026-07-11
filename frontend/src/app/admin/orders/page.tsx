"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Order,
  OrderStatus,
  PaymentStatus,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
} from "@/types";
import {
  fetchOrdersPage,
  updateOrderStatus,
  deleteOrder,
  UnauthorizedError,
} from "@/lib/api";
import { money, shortDate, shortTime } from "@/lib/format";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import {
  ChevronRight,
  ChevronLeft,
  Search,
  Trash2,
  X,
} from "lucide-react";

const PAGE_SIZE = 20;

const METHOD_LABEL: Record<string, string> = {
  cash_on_delivery: "Cash on delivery",
  card: "Card",
  bank_transfer: "Bank transfer",
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const onAuthError = (err: unknown) => {
  if (err instanceof UnauthorizedError) window.location.reload();
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [openId, setOpenId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOrdersPage({
        search: search || undefined,
        order_status: orderStatus || undefined,
        payment_status: paymentStatus || undefined,
        dateFrom: dateFrom ? `${dateFrom}T00:00:00` : undefined,
        dateTo: dateTo ? `${dateTo}T23:59:59` : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setOrders(res.orders);
      setTotal(res.total);
    } catch (err) {
      onAuthError(err);
      setError(err instanceof Error ? err.message : String(err));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [search, orderStatus, paymentStatus, dateFrom, dateTo, page]);

  // Debounced reload whenever filters/page change.
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // Any filter change resets to page 1.
  const resetPage = () => setPage(1);

  const changeOrderStatus = async (order: Order, status: OrderStatus) => {
    setBusyId(order.id);
    setError(null);
    try {
      await updateOrderStatus(order.id, { order_status: status });
      await load();
    } catch (err) {
      onAuthError(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const changePaymentStatus = async (order: Order, status: PaymentStatus) => {
    setBusyId(order.id);
    setError(null);
    try {
      await updateOrderStatus(order.id, { payment_status: status });
      await load();
    } catch (err) {
      onAuthError(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (order: Order) => {
    setBusyId(order.id);
    setError(null);
    try {
      await deleteOrder(order.id);
      setConfirmId(null);
      setOpenId(null);
      await load();
    } catch (err) {
      onAuthError(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectCls =
    "rounded-md border border-line bg-surface px-2.5 py-2 text-[13px] text-ink outline-none focus:border-brand/50";

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-6 py-7">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Orders
        </h1>
        <p className="mt-1 text-xs text-ink-3">{total} orders total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            placeholder="Search order #, name, email…"
            className="h-10 w-full rounded-md border border-line bg-surface pl-9 pr-8 text-sm text-ink outline-none focus:border-brand/50"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                resetPage();
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-3 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={orderStatus}
          onChange={(e) => {
            setOrderStatus(e.target.value);
            resetPage();
          }}
          className={selectCls}
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {cap(s)}
            </option>
          ))}
        </select>
        <select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value);
            resetPage();
          }}
          className={selectCls}
        >
          <option value="">All payments</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {cap(s)}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            resetPage();
          }}
          aria-label="From date"
          className={selectCls}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            resetPage();
          }}
          aria-label="To date"
          className={selectCls}
        />
      </div>

      {error && (
        <div className="rounded-md border border-rose/30 bg-rose/10 p-3 text-xs text-rose">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface py-16 text-center">
          <p className="text-sm font-medium text-ink-2">No orders found</p>
          <p className="mt-1 text-xs text-ink-3">
            Try adjusting the search or filters.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {orders.map((order) => {
            const open = openId === order.id;
            return (
              <li key={order.id}>
                <button
                  onClick={() => setOpenId(open ? null : order.id)}
                  className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-sunken/40"
                >
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 text-ink-3 transition-transform ${open ? "rotate-90" : ""}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                      {order.order_number}
                      <span className="font-normal text-ink-2">
                        · {order.customer_name}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-3">
                      {shortDate(order.created_at)} · {shortTime(order.created_at)}
                    </p>
                  </div>
                  <div className="hidden items-center gap-1.5 sm:flex">
                    <OrderStatusBadge status={order.order_status} />
                    <PaymentStatusBadge status={order.payment_status} />
                  </div>
                  <span className="shrink-0 text-sm font-bold text-ink tabular-nums">
                    {money(order.total)}
                  </span>
                </button>

                {open && (
                  <div className="fade-in space-y-4 border-t border-line bg-sunken/30 px-5 py-4">
                    {/* Customer + payment */}
                    <div className="grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
                      <Field label="Customer" value={order.customer_name} />
                      <Field label="Phone" value={order.customer_phone} />
                      <Field label="Email" value={order.customer_email} />
                      <Field
                        label="Payment method"
                        value={
                          METHOD_LABEL[order.payment_method] ||
                          order.payment_method
                        }
                      />
                      <div className="sm:col-span-2">
                        <Field
                          label="Shipping address"
                          value={order.shipping_address}
                        />
                      </div>
                    </div>

                    {/* Items */}
                    <ul className="divide-y divide-line/60 rounded-md border border-line bg-surface px-3">
                      {order.items.map((item) => (
                        <li key={item.id} className="py-2">
                          <div className="flex items-start justify-between gap-4">
                            <p className="min-w-0 flex-1 text-[13px] text-ink">
                              <span className="mr-1.5 font-mono text-[11px] font-bold text-brand">
                                {item.product_code}
                              </span>
                              <bdi>{item.product_name}</bdi>
                              {item.is_free && (
                                <span className="label-caps ml-1.5 rounded-sm border border-copper/35 bg-copper/[0.08] px-1 py-px text-copper">
                                  Bonus
                                </span>
                              )}
                              <span className="ml-2 text-[11px] text-ink-3 tabular-nums">
                                {item.quantity} × {money(item.unit_price)}
                              </span>
                            </p>
                            <span className="shrink-0 text-[13px] font-bold text-ink tabular-nums">
                              {money(item.subtotal)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {/* Totals */}
                    <div className="space-y-1 text-[13px]">
                      <Row label="Subtotal" value={money(order.subtotal)} />
                      {order.discount > 0 && (
                        <Row label="Discount" value={`−${money(order.discount)}`} />
                      )}
                      {order.shipping_cost > 0 && (
                        <Row label="Shipping" value={money(order.shipping_cost)} />
                      )}
                      {order.tax > 0 && <Row label="Tax" value={money(order.tax)} />}
                      <div className="flex items-baseline justify-between border-t border-line pt-1.5 font-semibold text-ink">
                        <span>Total</span>
                        <span className="tabular-nums">{money(order.total)}</span>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="rounded-md border border-line bg-surface p-3">
                        <p className="label-caps mb-1 text-ink-3">Notes</p>
                        <p className="whitespace-pre-wrap text-xs text-ink-2">
                          {order.notes}
                        </p>
                      </div>
                    )}

                    {/* Controls */}
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="text-[13px]">
                        <span className="label-caps mb-1 block text-ink-3">
                          Order status
                        </span>
                        <select
                          value={order.order_status}
                          disabled={busyId === order.id}
                          onChange={(e) =>
                            changeOrderStatus(
                              order,
                              e.target.value as OrderStatus,
                            )
                          }
                          className={selectCls}
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {cap(s)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-[13px]">
                        <span className="label-caps mb-1 block text-ink-3">
                          Payment status
                        </span>
                        <select
                          value={order.payment_status}
                          disabled={busyId === order.id}
                          onChange={(e) =>
                            changePaymentStatus(
                              order,
                              e.target.value as PaymentStatus,
                            )
                          }
                          className={selectCls}
                        >
                          {PAYMENT_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {cap(s)}
                            </option>
                          ))}
                        </select>
                      </label>

                      {confirmId === order.id ? (
                        <div className="ml-auto flex items-center gap-2">
                          <span className="text-[13px] text-ink-2">Delete?</span>
                          <button
                            onClick={() => remove(order)}
                            disabled={busyId === order.id}
                            className="flex h-9 items-center gap-1.5 rounded-md bg-rose px-3 text-[13px] font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {busyId === order.id ? "Deleting…" : "Yes, delete"}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="flex h-9 items-center rounded-md border border-line px-3 text-[13px] font-semibold text-ink-2 hover:bg-sunken"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(order.id)}
                          className="ml-auto flex h-9 items-center gap-1.5 self-end rounded-md border border-rose/35 px-3 text-[13px] font-semibold text-rose transition hover:bg-rose/10"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-ink-3">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex h-9 items-center gap-1 rounded-md border border-line px-3 text-[13px] font-semibold text-ink-2 transition hover:bg-sunken disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex h-9 items-center gap-1 rounded-md border border-line px-3 text-[13px] font-semibold text-ink-2 transition hover:bg-sunken disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-caps text-ink-3">{label}</p>
      <p className="mt-0.5 text-ink">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-ink-2">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
