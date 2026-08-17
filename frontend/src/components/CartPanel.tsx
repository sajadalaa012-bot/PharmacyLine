"use client";

import { useState } from "react";
import { CartItem, CustomerDetails, hasCustomerDetails } from "@/types";
import { money, num } from "@/lib/format";
import { ShoppingCart, Trash2, X, MapPin, LoaderCircle } from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";

interface CartPanelProps {
  items: CartItem[];
  notes: string;
  onNotesChange: (notes: string) => void;
  customer: CustomerDetails;
  onCustomerChange: (field: keyof CustomerDetails, value: string) => void;
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
  customer,
  onCustomerChange,
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
  const { t } = useI18n();
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const itemsTotal = items.reduce((sum, ci) => sum + ci.subtotal, 0);
  const discountAmount = (itemsTotal * discount) / 100;
  const grandTotal = Math.max(0, itemsTotal - discountAmount);
  const totalQty = items.reduce((sum, ci) => sum + ci.quantity, 0);

  // A shopper's order has to be deliverable; a sale rung up at the counter
  // has the customer standing there, so the same fields stay optional.
  const customerReady = !customerMode || hasCustomerDetails(customer);

  /** Append the phone's coordinates to whatever address is already typed. */
  const useMyLocation = () => {
    if (locating || !navigator.geolocation) {
      if (!navigator.geolocation) setLocateError(t("checkout.locateFailed"));
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pin = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
        const existing = customer.customer_location.trim();
        onCustomerChange(
          "customer_location",
          existing ? `${existing}\n${t("checkout.gps")}: ${pin}` : pin,
        );
        setLocating(false);
      },
      () => {
        setLocateError(t("checkout.locateFailed"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const field =
    "w-full rounded-md border border-line bg-sunken px-3 py-2 text-sm text-ink " +
    "outline-none transition placeholder:text-ink-3 focus:border-brand/50 focus:ring-1 focus:ring-brand/25";

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
            {t("cart.title")}
          </h2>
          <p className="label-caps mt-0.5 text-ink-3">
            {totalQty} {totalQty === 1 ? t("common.item") : t("common.items")}
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={onClear}
            className="label-caps flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-rose transition hover:bg-rose/10 active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("common.clear")}
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
            <p className="text-sm font-medium text-ink-2">{t("cart.empty")}</p>
            <p className="text-xs text-ink-3">{t("cart.emptyHint")}</p>
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
                    <span className="me-1.5 font-mono text-[11px] font-bold text-brand">
                      {item.product_code}
                    </span>
                    <bdi>{item.product_name}</bdi>
                    {item.is_free && (
                      <span className="label-caps ms-1.5 rounded-sm border border-copper/35 bg-copper/[0.08] px-1 py-px text-copper">
                        {t("common.bonus")}
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
                    onBlur={(e) => {
                      // A request above the stock ceiling is clamped upstream,
                      // which leaves the state unchanged — so React has no
                      // re-render to correct the box with, and it would keep
                      // showing the rejected number. Put the real quantity back.
                      e.target.value = String(item.quantity);
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
                      <span className="text-[10px] font-medium text-ink-3">
                        {t("common.currency")}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-ink-3 tabular-nums">
                      × {money(item.unit_price)}
                    </span>
                  )}
                  <button
                    onClick={() => onQtyChange(item.product_id, item.is_free, 0)}
                    aria-label={t("cart.removeFromOrder", {
                      name: item.product_name,
                    })}
                    className="ms-auto flex h-6 w-6 items-center justify-center rounded text-ink-3 transition hover:bg-rose/10 hover:text-rose"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Who it's for and where it goes. Inside the scroller, not a fixed
            panel of its own: on a phone the cart would otherwise be three
            stacked boxes with no room left to read the order. */}
        <div className="mt-4 space-y-2.5 border-t border-line pt-4">
          <p className="label-caps text-ink-3">{t("checkout.details")}</p>

          <div>
            <label htmlFor="customer-name" className="sr-only">
              {t("checkout.name")}
            </label>
            <input
              id="customer-name"
              type="text"
              autoComplete="name"
              value={customer.customer_name}
              onChange={(e) => onCustomerChange("customer_name", e.target.value)}
              placeholder={t("checkout.namePlaceholder")}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="customer-phone" className="sr-only">
              {t("checkout.phone")}
            </label>
            <input
              id="customer-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              value={customer.customer_phone}
              onChange={(e) =>
                onCustomerChange("customer_phone", e.target.value)
              }
              placeholder={t("checkout.phonePlaceholder")}
              className={`${field} text-start tabular-nums`}
            />
          </div>

          <div>
            <label htmlFor="customer-location" className="sr-only">
              {t("checkout.location")}
            </label>
            <textarea
              id="customer-location"
              rows={2}
              value={customer.customer_location}
              onChange={(e) =>
                onCustomerChange("customer_location", e.target.value)
              }
              placeholder={t("checkout.locationPlaceholder")}
              className={`${field} resize-none`}
            />
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="mt-1.5 flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold text-ink-2
                         transition hover:border-brand/40 hover:text-brand active:scale-95 disabled:opacity-60"
            >
              {locating ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MapPin className="h-3.5 w-3.5" />
              )}
              {locating ? t("checkout.locating") : t("checkout.useMyLocation")}
            </button>
            {locateError && (
              <p className="mt-1 text-[11px] text-rose">{locateError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Adjustments */}
      <div className="shrink-0 space-y-3 border-t border-line px-5 py-3.5">
        {!customerMode && (
          <div>
            <label htmlFor="discount" className="label-caps mb-1.5 block text-ink-3">
              {t("cart.discountPercent")}
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
              <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-3">
                %
              </span>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="order-notes" className="label-caps mb-1.5 block text-ink-3">
            {t("common.notes")}
          </label>
          <textarea
            id="order-notes"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder={t("cart.notesPlaceholder")}
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
              <span className="text-ink-3">{t("common.subtotal")}</span>
              <span className="leader flex-1" />
              <span className="font-semibold text-ink-2 tabular-nums">
                {money(itemsTotal)}
              </span>
            </div>
            <div className="flex items-baseline gap-2 text-xs">
              <span className="text-ink-3">
                {t("cart.discountWith", { n: discount })}
              </span>
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
          <span className="label-caps text-ink-2">{t("common.total")}</span>
          <span className="font-display text-[26px] font-semibold tracking-tight text-ink tabular-nums">
            {num(grandTotal)}
            <span className="ms-1.5 font-sans text-xs font-semibold tracking-[0.08em] text-ink-3">
              {t("common.currency")}
            </span>
          </span>
        </div>
        {items.length > 0 && !customerReady && (
          <p className="pt-1 text-[11px] leading-relaxed text-ink-3">
            {t("checkout.required")}
          </p>
        )}
        <button
          onClick={onSubmit}
          disabled={items.length === 0 || submitting || !customerReady}
          className="mt-1 h-11 w-full rounded-md bg-brand text-sm font-semibold tracking-[0.01em] text-cart
                     shadow-[0_10px_24px_-10px_var(--color-brand)] transition-all duration-200
                     hover:bg-brand-deep active:scale-[0.99]
                     disabled:pointer-events-none disabled:opacity-30 disabled:shadow-none"
        >
          {submitting
            ? t("common.saving")
            : (submitLabel ??
              (customerMode
                ? t("cart.placeOrder")
                : t("cart.generateReceipt")))}
        </button>
      </div>
    </div>
  );
}
