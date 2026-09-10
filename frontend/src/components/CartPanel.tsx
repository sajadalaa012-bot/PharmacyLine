"use client";

import { useEffect, useState } from "react";
import { CartItem, CustomerDetails, hasCustomerDetails, lineKey } from "@/types";
import { money, num } from "@/lib/format";
import { ArrowLeft, ArrowRight, ShoppingCart, Trash2, X } from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";

interface CartPanelProps {
  items: CartItem[];
  notes: string;
  onNotesChange: (notes: string) => void;
  customer: CustomerDetails;
  onCustomerChange: (field: keyof CustomerDetails, value: string) => void;
  discount: number;
  onDiscountChange: (discount: number) => void;
  /** Addressed by line key - a product bought in two options is two lines. */
  onQtyChange: (key: string, qty: number) => void;
  onUnitPriceChange?: (key: string, price: number) => void;
  onSubmit: () => void;
  onClear: () => void;
  submitting: boolean;
  submitError?: string | null;
  submitLabel?: string;
  /** Customer storefront: hides discount % and price editing. */
  customerMode?: boolean;
}

/**
 * The order: two screens on the storefront, one behind the counter.
 *
 * A shopper sees the basket first - items, total, and a button that carries
 * on - and gives their name, phone, and delivery location on a second screen
 * of its own, where the fields have room to breathe and nothing competes with
 * them for the eye. A sale rung up at the till has the customer standing
 * right there, so the POS keeps the single panel it always had.
 *
 * On either screen only the middle scrolls; the heading, the total, and the
 * button that moves things along stay put, so nobody has to scroll to find
 * out whether they can check out.
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
  const itemsTotal = items.reduce((sum, ci) => sum + ci.subtotal, 0);
  const discountAmount = (itemsTotal * discount) / 100;
  const grandTotal = Math.max(0, itemsTotal - discountAmount);
  const totalQty = items.reduce((sum, ci) => sum + ci.quantity, 0);

  // A shopper's order has to be deliverable; a sale rung up at the counter
  // has the customer standing there, so the same fields stay optional.
  const customerReady = !customerMode || hasCustomerDetails(customer);

  const twoStep = customerMode;
  const [step, setStep] = useState<"items" | "details">("items");
  // Emptying the basket from the second screen leaves nothing to deliver -
  // go back to the items rather than ask for an address for no order.
  useEffect(() => {
    if (items.length === 0) setStep("items");
  }, [items.length]);
  const onDetails = twoStep && step === "details";

  const field =
    "h-10 w-full rounded-md border border-line bg-sunken px-3 text-sm text-ink " +
    "outline-none transition placeholder:text-ink-3 focus:border-brand/50 focus:ring-1 focus:ring-brand/25";
  const fieldLabel = "label-caps mb-1.5 block text-ink-3";

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header */}
      {onDetails ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-2.5">
          <button
            onClick={() => setStep("items")}
            aria-label={t("checkout.backToOrder")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-2 transition hover:bg-sunken hover:text-ink active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 flip-rtl" />
          </button>
          <div className="flex items-baseline gap-2">
            <h2 className="font-display text-base font-semibold tracking-tight text-ink">
              {t("checkout.details")}
            </h2>
            <p className="label-caps text-ink-3">{t("checkout.stepTwo")}</p>
          </div>
        </div>
      ) : (
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
      )}

      {/* Items - the one part that scrolls */}
      {!onDetails && (
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
                <li key={lineKey(item)} className="py-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-ink">
                      <span className="me-1.5 font-mono text-[11px] font-bold text-brand">
                        {item.product_code}
                      </span>
                      <bdi>{item.product_name}</bdi>
                      {item.variant_name && (
                        <span className="ms-1.5 rounded-sm border border-line-strong bg-sunken px-1 py-px text-[11px] font-semibold text-ink-2">
                          <bdi>{item.variant_name}</bdi>
                        </span>
                      )}
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
                          onQtyChange(lineKey(item), val);
                        }
                      }}
                      onBlur={(e) => {
                        // A request above the stock ceiling is clamped upstream,
                        // which leaves the state unchanged - so React has no
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
                              onUnitPriceChange?.(lineKey(item), val);
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
                      onClick={() => onQtyChange(lineKey(item), 0)}
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
      )}

      {/* Second screen - who it is for and where it goes, with room to type */}
      {onDetails && (
        <div className="scroll-thin tab-in min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
          <p className="text-xs leading-relaxed text-ink-2">
            {t("checkout.detailsHint")}
          </p>

          <div>
            <label className={fieldLabel} htmlFor="checkout-name">
              {t("checkout.name")}
            </label>
            <input
              id="checkout-name"
              type="text"
              autoComplete="name"
              value={customer.customer_name}
              onChange={(e) => onCustomerChange("customer_name", e.target.value)}
              placeholder={t("checkout.name")}
              className={field}
            />
          </div>

          <div>
            <label className={fieldLabel} htmlFor="checkout-phone">
              {t("checkout.phone")}
            </label>
            <input
              id="checkout-phone"
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
            <label className={fieldLabel} htmlFor="checkout-location">
              {t("checkout.location")}
            </label>
            <input
              id="checkout-location"
              type="text"
              value={customer.customer_location}
              onChange={(e) =>
                onCustomerChange("customer_location", e.target.value)
              }
              placeholder={t("checkout.locationPlaceholder")}
              className={field}
            />
          </div>

          <div>
            <label className={fieldLabel} htmlFor="checkout-notes">
              {t("common.notes")}
            </label>
            <textarea
              id="checkout-notes"
              rows={3}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder={t("cart.notesPlaceholder")}
              className="w-full resize-none rounded-md border border-line bg-sunken px-3 py-2 text-sm leading-relaxed text-ink
                         outline-none transition placeholder:text-ink-3 focus:border-brand/50 focus:ring-1 focus:ring-brand/25"
            />
          </div>

          {/* What is being delivered, so no address is given blind */}
          <div className="rounded-md border border-line bg-sunken/60 px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="label-caps text-ink-3">{t("cart.title")}</span>
              <span className="text-[11px] font-semibold text-ink-2">
                {totalQty}{" "}
                {totalQty === 1 ? t("common.item") : t("common.items")}
              </span>
            </div>
            <ul className="mt-1.5 space-y-1">
              {items.map((item) => (
                <li
                  key={lineKey(item)}
                  className="flex items-baseline gap-2 text-[11px]"
                >
                  <span className="min-w-0 flex-1 truncate text-ink-2">
                    <bdi>{item.product_name}</bdi>
                    {item.variant_name && (
                      <span className="text-ink-3">
                        {" "}
                        · <bdi>{item.variant_name}</bdi>
                      </span>
                    )}
                    <span className="text-ink-3"> × {item.quantity}</span>
                  </span>
                  <span
                    className={`shrink-0 font-semibold tabular-nums ${
                      item.is_free ? "text-copper" : "text-ink-2"
                    }`}
                  >
                    {money(item.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Who it is for, where it goes, and anything to add - one row each.
          The counter's single panel; the storefront asks on its own screen. */}
      {!twoStep && (
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
              onChange={(e) =>
                onCustomerChange("customer_phone", e.target.value)
              }
              placeholder={t("checkout.phonePlaceholder")}
              aria-label={t("checkout.phone")}
              className={`${field} text-start tabular-nums`}
            />
          </div>

          <input
            type="text"
            value={customer.customer_location}
            onChange={(e) =>
              onCustomerChange("customer_location", e.target.value)
            }
            placeholder={t("checkout.locationPlaceholder")}
            aria-label={t("checkout.location")}
            className={field}
          />

          <div className="flex gap-2">
            <div className="relative w-24 shrink-0">
              <input
                id="discount"
                type="number"
                min="0"
                max="100"
                value={discount || ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onDiscountChange(
                    isNaN(val) ? 0 : Math.min(100, Math.max(0, val)),
                  );
                }}
                placeholder={t("common.discount")}
                aria-label={t("cart.discountPercent")}
                className={`${field} pe-6 tabular-nums`}
              />
              <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-3">
                %
              </span>
            </div>
            <input
              type="text"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder={t("cart.notesPlaceholder")}
              aria-label={t("common.notes")}
              className={field}
            />
          </div>
        </div>
      )}

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
        {/* The storefront only asks for the details on the second screen, so
            that is the only place the reminder belongs. */}
        {items.length > 0 && !customerReady && (!twoStep || onDetails) && (
          <p className="text-[11px] leading-snug text-ink-3">
            {t("checkout.required")}
          </p>
        )}
        {twoStep && step === "items" ? (
          <button
            onClick={() => setStep("details")}
            disabled={items.length === 0}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand text-sm font-semibold tracking-[0.01em] text-cart
                       shadow-[0_10px_24px_-10px_var(--color-brand)] transition-all duration-200
                       hover:bg-brand-deep active:scale-[0.99]
                       disabled:pointer-events-none disabled:opacity-30 disabled:shadow-none"
          >
            {t("checkout.continue")}
            <ArrowRight className="h-4 w-4 flip-rtl" />
          </button>
        ) : (
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
        )}
      </div>
    </div>
  );
}
