"use client";

import { Order } from "@/types";
import { money, orderNo } from "@/lib/format";
import { CheckCircle2, ArrowLeft } from "lucide-react";

interface OrderConfirmationProps {
  order: Order;
  onBack: () => void;
}

/** What customers see after placing an order — no receipt, no actions.
 *  The full receipt lives in the admin, where orders are reviewed and approved. */
export default function OrderConfirmation({ order, onBack }: OrderConfirmationProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <div className="pop w-full max-w-md rounded-lg border border-line bg-surface p-8 text-center shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
          <CheckCircle2 className="h-7 w-7" />
        </div>

        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink">
          Order received
        </h1>
        <p className="mt-1 text-sm text-ink-2" dir="rtl">
          تم استلام طلبك — سنؤكده قريباً
        </p>

        <div className="mt-6 space-y-2 rounded-md border border-line bg-sunken/50 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="label-caps text-ink-3">Order</span>
            <span className="font-semibold text-ink">{orderNo(order.id)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="label-caps text-ink-3">Items</span>
            <span className="font-semibold text-ink tabular-nums">
              {order.items.reduce((sum, it) => sum + it.quantity, 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="label-caps text-ink-3">Total</span>
            <span className="font-display text-lg font-semibold text-ink tabular-nums">
              {money(order.grand_total)}
            </span>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-ink-3">
          The pharmacy will review your order and confirm it shortly.
        </p>

        <button
          onClick={onBack}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand
                     text-sm font-semibold tracking-[0.01em] text-on-brand
                     shadow-[0_10px_24px_-10px_var(--color-brand)] transition hover:bg-brand-deep active:scale-[0.99]"
        >
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </button>
      </div>
    </div>
  );
}
