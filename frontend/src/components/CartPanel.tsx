"use client";

import { CartItem } from "@/types";
import { money } from "@/lib/format";
import { ShoppingCart, Trash2, X } from "lucide-react";

interface CartPanelProps {
  items: CartItem[];
  notes: string;
  onNotesChange: (notes: string) => void;
  discount: number;
  onDiscountChange: (discount: number) => void;
  onQtyChange: (productId: number, isFree: boolean, qty: number) => void;
  onUnitPriceChange?: (productId: number, isFree: boolean, price: number) => void;
  onSubmit: () => void;
  onClear: () => void;
  submitting: boolean;
  submitError?: string | null;
  submitLabel?: string;
  /** Customer storefront: hides discount % and price editing. */
  customerMode?: boolean;
}

export default function CartPanel({
  items,
  notes,
  onNotesChange,
  discount,
  onDiscountChange,
  onQtyChange,
  onUnitPriceChange,
  onSubmit,
  onClear,
  submitting,
  submitError,
  submitLabel,
  customerMode = false,
}: CartPanelProps) {
  const itemsTotal = items.reduce((sum, ci) => sum + ci.subtotal, 0);
  const discountAmount = (itemsTotal * discount) / 100;
  const grandTotal = Math.max(0, itemsTotal - discountAmount);
  const totalQty = items.reduce((sum, ci) => sum + ci.quantity, 0);

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
            Order
          </h2>
          <p className="label-caps mt-0.5 text-ink-3">
            {totalQty} {totalQty === 1 ? "item" : "items"}
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={onClear}
            className="label-caps flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-rose transition hover:bg-rose/10 active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Items */}
      <div className="scroll-thin flex-1 overflow-y-auto px-5 py-3">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-line-strong text-ink-3">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-ink-2">Nothing here yet</p>
            <p className="text-xs text-ink-3">Add products to build the order</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li
                key={`${item.product_id}-${item.is_free ? "free" : "paid"}`}
                className="py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-ink">
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
                  <span
                    className={`shrink-0 text-[13px] font-bold tabular-nums ${
                      item.is_free ? "text-copper" : "text-ink"
                    }`}
                  >
                    {money(item.subtotal)}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1) {
                        onQtyChange(item.product_id, item.is_free, val);
                      }
                    }}
                    className="w-14 rounded-md border border-line bg-sunken px-1 py-1 text-center text-xs font-bold text-ink tabular-nums
                               outline-none transition focus:border-brand/50 focus:ring-1 focus:ring-brand/25"
                  />
                  {!customerMode && !item.is_free ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-ink-3">×</span>
                      <input
                        type="number"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val >= 0) {
                            onUnitPriceChange?.(item.product_id, item.is_free, val);
                          }
                        }}
                        className="w-24 rounded-md border border-line bg-sunken px-1.5 py-1 text-center text-xs font-semibold text-ink tabular-nums
                                   outline-none transition focus:border-brand/50 focus:ring-1 focus:ring-brand/25"
                      />
                      <span className="text-[10px] font-medium text-ink-3">IQD</span>
                    </div>
                  ) : (
                    <span className="text-xs text-ink-3 tabular-nums">
                      × {money(item.unit_price)}
                    </span>
                  )}
                  <button
                    onClick={() => onQtyChange(item.product_id, item.is_free, 0)}
                    aria-label={`Remove ${item.product_name} from order`}
                    className="ml-auto flex h-6 w-6 items-center justify-center rounded text-ink-3 transition hover:bg-rose/10 hover:text-rose"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Adjustments */}
      <div className="shrink-0 space-y-3 border-t border-line px-5 py-3.5">
        {!customerMode && (
          <div>
            <label htmlFor="discount" className="label-caps mb-1.5 block text-ink-3">
              Discount %
            </label>
            <div className="relative">
              <input
                id="discount"
                type="number"
                min="0"
                max="100"
                value={discount || ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onDiscountChange(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                }}
                placeholder="0"
                className="w-full rounded-md border border-line bg-sunken py-2 pl-3 pr-9 text-sm font-semibold text-ink tabular-nums
                           outline-none transition placeholder:text-ink-3 focus:border-brand/50 focus:ring-1 focus:ring-brand/25"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-3">
                %
              </span>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="order-notes" className="label-caps mb-1.5 block text-ink-3">
            Notes
          </label>
          <textarea
            id="order-notes"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Special instructions…"
            rows={2}
            className="w-full resize-none rounded-md border border-line bg-sunken px-3 py-2 text-sm text-ink
                       outline-none transition placeholder:text-ink-3 focus:border-brand/50 focus:ring-1 focus:ring-brand/25"
          />
        </div>
      </div>

      {/* Totals */}
      <div className="shrink-0 space-y-2 border-t border-line px-5 py-4">
        {discount > 0 && (
          <>
            <div className="flex items-baseline gap-2 text-xs">
              <span className="text-ink-3">Subtotal</span>
              <span className="leader flex-1" />
              <span className="font-semibold text-ink-2 tabular-nums">
                {money(itemsTotal)}
              </span>
            </div>
            <div className="flex items-baseline gap-2 text-xs">
              <span className="text-ink-3">Discount ({discount}%)</span>
              <span className="leader flex-1" />
              <span className="font-semibold text-brand tabular-nums">
                −{money(discountAmount)}
              </span>
            </div>
          </>
        )}
        {submitError && (
          <div className="rounded-md border border-rose/30 bg-rose/10 p-2.5 text-xs text-rose">
            {submitError}
          </div>
        )}
        <div className="flex items-baseline justify-between pt-1">
          <span className="label-caps text-ink-2">Total</span>
          <span className="font-display text-[26px] font-semibold tracking-tight text-ink tabular-nums">
            {grandTotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            <span className="ml-1.5 font-sans text-xs font-semibold tracking-[0.08em] text-ink-3">
              IQD
            </span>
          </span>
        </div>
        <button
          onClick={onSubmit}
          disabled={items.length === 0 || submitting}
          className="mt-1 h-11 w-full rounded-md bg-brand text-sm font-semibold tracking-[0.01em] text-cart
                     shadow-[0_10px_24px_-10px_var(--color-brand)] transition-all duration-200
                     hover:bg-brand-deep active:scale-[0.99]
                     disabled:pointer-events-none disabled:opacity-30 disabled:shadow-none"
        >
          {submitting
            ? "Saving…"
            : (submitLabel ?? (customerMode ? "Place Order" : "Generate Receipt"))}
        </button>
      </div>
    </div>
  );
}
