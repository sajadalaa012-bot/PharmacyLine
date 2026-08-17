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

/** A "31.99123, 44.92456" pin sitting at the end of the location field —
 *  what this component itself wrote there last time. Language-independent,
 *  so it still matches a field filled in the other language. */
const PIN_AT_END = /(\s*·)?\s*-?\d{1,2}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}\s*$/;

/**
 * The order, on one screen. Everything except the list of items is fixed
 * furniture — heading, delivery details, note, total, and the button that
 * places the order are all visible at once, so nobody has to scroll to find
 * out whether they can check out. Only the items scroll, and only when there
 * are more of them than the middle of the panel can hold.
 */
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
  /** The pin just written, echoed back so the tap visibly did something. */
  const [located, setLocated] = useState<string | null>(null);
  const itemsTotal = items.reduce((sum, ci) => sum + ci.subtotal, 0);
  const discountAmount = (itemsTotal * discount) / 100;
  const grandTotal = Math.max(0, itemsTotal - discountAmount);
  const totalQty = items.reduce((sum, ci) => sum + ci.quantity, 0);

  // A shopper's order has to be deliverable; a sale rung up at the counter
  // has the customer standing there, so the same fields stay optional.
  const customerReady = !customerMode || hasCustomerDetails(customer);

  /**
   * Put the phone's coordinates beside whatever address was typed.
   *
   * Two things this has to survive. Tapping it twice must not stack pins, so
   * a pin already at the end of the field is replaced rather than appended.
   * And a precise fix regularly never arrives indoors — where people order
   * from — so a high-accuracy attempt that fails falls back to the coarse
   * network fix instead of reporting failure.
   */
  const applyPin = (lat: number, lng: number) => {
    const pin = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const base = customer.customer_location.replace(PIN_AT_END, "").trim();
    onCustomerChange("customer_location", base ? `${base} · ${pin}` : pin);
    setLocating(false);
    setLocated(pin);
  };

  const useMyLocation = () => {
    if (locating) return;
    setLocateError(null);
    setLocated(null);

    if (!navigator.geolocation) {
      setLocateError(t("checkout.locateUnsupported"));
      return;
    }
    // A browser only hands out a position over https (localhost aside), and
    // it fails silently enough that this is worth saying out loud.
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setLocateError(t("checkout.locateInsecure"));
      return;
    }

    setLocating(true);
    const ok = (pos: GeolocationPosition) =>
      applyPin(pos.coords.latitude, pos.coords.longitude);

    navigator.geolocation.getCurrentPosition(
      ok,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocateError(t("checkout.locateDenied"));
          setLocating(false);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          ok,
          () => {
            setLocateError(t("checkout.locateFailed"));
            setLocating(false);
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 120000 },
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  };

  const field =
    "h-10 w-full rounded-md border border-line bg-sunken px-3 text-sm text-ink " +
    "outline-none transition placeholder:text-ink-3 focus:border-brand/50 focus:ring-1 focus:ring-brand/25";

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-base font-semibold tracking-tight text-ink">
            {t("cart.title")}
          </h2>
          <p className="label-caps text-ink-3">
            {totalQty} {totalQty === 1 ? t("common.item") : t("common.items")}
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={onClear}
            className="label-caps flex items-center gap-1.5 rounded-md px-2 py-1 text-rose transition hover:bg-rose/10 active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("common.clear")}
          </button>
        )}
      </div>

      {/* Items — the one part that scrolls */}
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-2">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-line-strong text-ink-3">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-ink-2">{t("cart.empty")}</p>
            <p className="text-xs text-ink-3">{t("cart.emptyHint")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li
                key={`${item.product_id}-${item.is_free ? "free" : "paid"}`}
                className="py-2"
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

                <div className="mt-1.5 flex items-center gap-2">
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
      </div>

      {/* Who it's for, where it goes, and anything to add — one row each */}
      <div className="shrink-0 space-y-2 border-t border-line px-4 py-2.5">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            autoComplete="name"
            value={customer.customer_name}
            onChange={(e) => onCustomerChange("customer_name", e.target.value)}
            placeholder={t("checkout.name")}
            aria-label={t("checkout.name")}
            className={field}
          />
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            value={customer.customer_phone}
            onChange={(e) => onCustomerChange("customer_phone", e.target.value)}
            placeholder={t("checkout.phonePlaceholder")}
            aria-label={t("checkout.phone")}
            className={`${field} text-start tabular-nums`}
          />
        </div>

        <div className="relative">
          <input
            type="text"
            value={customer.customer_location}
            onChange={(e) =>
              onCustomerChange("customer_location", e.target.value)
            }
            placeholder={t("checkout.locationPlaceholder")}
            aria-label={t("checkout.location")}
            className={`${field} pe-11`}
          />
          {/* Drops the phone's coordinates in beside whatever was typed */}
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            aria-label={t("checkout.useMyLocation")}
            title={t("checkout.useMyLocation")}
            className={`absolute end-1 top-1 flex h-8 w-9 items-center justify-center rounded-md
                        transition hover:bg-surface active:scale-90 disabled:opacity-60 ${
                          located ? "text-brand" : "text-ink-3 hover:text-brand"
                        }`}
          >
            {locating ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
          </button>
        </div>

        {(locating || located) && !locateError && (
          <p className="text-[11px] text-ink-3">
            {locating ? (
              t("checkout.locating")
            ) : (
              <span className="text-brand">
                {t("checkout.located")} <span dir="ltr">{located}</span>
              </span>
            )}
          </p>
        )}

        <div className="flex gap-2">
          {!customerMode && (
            <div className="relative w-24 shrink-0">
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
                placeholder={t("common.discount")}
                aria-label={t("cart.discountPercent")}
                className={`${field} pe-6 tabular-nums`}
              />
              <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-3">
                %
              </span>
            </div>
          )}
          <input
            type="text"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder={t("cart.notesPlaceholder")}
            aria-label={t("common.notes")}
            className={field}
          />
        </div>

        {locateError && (
          <p className="text-[11px] text-rose">{locateError}</p>
        )}
      </div>

      {/* Totals */}
      <div className="shrink-0 space-y-1.5 border-t border-line px-4 py-2.5">
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
          <div className="rounded-md border border-rose/30 bg-rose/10 p-2 text-xs text-rose">
            {submitError}
          </div>
        )}
        <div className="flex items-baseline justify-between">
          <span className="label-caps text-ink-2">{t("common.total")}</span>
          <span className="font-display text-[22px] font-semibold tracking-tight text-ink tabular-nums">
            {num(grandTotal)}
            <span className="ms-1.5 font-sans text-xs font-semibold tracking-[0.08em] text-ink-3">
              {t("common.currency")}
            </span>
          </span>
        </div>
        {items.length > 0 && !customerReady && (
          <p className="text-[11px] leading-snug text-ink-3">
            {t("checkout.required")}
          </p>
        )}
        <button
          onClick={onSubmit}
          disabled={items.length === 0 || submitting || !customerReady}
          className="h-11 w-full rounded-md bg-brand text-sm font-semibold tracking-[0.01em] text-cart
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
