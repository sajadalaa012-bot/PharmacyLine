"use client";

import { useRef, useState } from "react";
import { Order } from "@/types";
import { money, num, orderNo, shortDate, shortTime, whatsAppShareUrl } from "@/lib/format";
import { Printer, ArrowLeft, MessageCircle, Download } from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";

interface ReceiptProps {
  order: Order;
  onBack: () => void;
  backLabel?: string;
}

export default function Receipt({ order, onBack, backLabel }: ReceiptProps) {
  const { t } = useI18n();
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const itemsSubtotal = order.items.reduce((sum, it) => sum + it.subtotal, 0);
  const discountPercent =
    itemsSubtotal > 0 ? Math.round((order.discount / itemsSubtotal) * 100) : 0;
  const pending = order.status === "pending";

  const saveAsImage = async () => {
    if (!cardRef.current || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2,
        backgroundColor:
          getComputedStyle(cardRef.current).backgroundColor || "#ffffff",
      });
      if (!blob) throw new Error(t("receipt.renderFailed"));

      const fileName = `pharmacy-line-order-${String(order.id).padStart(5, "0")}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      // iOS / mobile: use the native share sheet so the user can "Save Image"
      // to Photos (programmatic downloads don't work there).
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: fileName });
          return;
        } catch (err) {
          if ((err as Error).name === "AbortError") return; // user cancelled
          // otherwise fall through to a normal download
        }
      }

      // Desktop: download via a temporary object URL.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error("Failed to save receipt image:", err);
      setSaveError(t("receipt.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-paper px-4 py-10 print:p-0">
      <div className="w-full max-w-lg">
        <div
          ref={cardRef}
          className="print-plain pop overflow-hidden rounded-lg border border-line bg-surface shadow-[0_24px_60px_-30px_rgba(34,49,42,0.4)]"
        >
          {/* Masthead */}
          <div className="border-b border-line bg-surface px-8 pb-6 pt-8 text-center print:bg-white">
            <p className="label-caps text-ink-3">{t("receipt.eyebrow")}</p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
              {t("common.brand")}
            </h1>
            <div className="mx-auto mt-4 flex max-w-xs items-center justify-between text-xs text-ink-2">
              <span className="font-semibold" dir="ltr">
                {orderNo(order.id)}
              </span>
              <span>
                {shortDate(order.created_at)} — {shortTime(order.created_at)}
              </span>
            </div>
            {pending && (
              <p className="label-caps mx-auto mt-3 inline-block rounded-sm border border-copper/40 bg-copper/10 px-2.5 py-1 text-copper">
                {t("receipt.pendingBadge")}
              </p>
            )}
          </div>

          {/* Ledger */}
          <div className="px-8 py-6">
            {/* Delivery details, when the order came from the storefront */}
            {(order.customer_name ||
              order.customer_phone ||
              order.customer_location) && (
              <div className="mb-5 rounded-md border border-line bg-sunken/60 p-3.5">
                <p className="label-caps mb-1 text-ink-3">
                  {t("checkout.customer")}
                </p>
                {order.customer_name && (
                  <p className="text-[13px] font-semibold text-ink">
                    <bdi>{order.customer_name}</bdi>
                  </p>
                )}
                {order.customer_phone && (
                  <p className="text-[13px] text-ink-2 tabular-nums" dir="ltr">
                    {order.customer_phone}
                  </p>
                )}
                {order.customer_location && (
                  <p className="mt-0.5 whitespace-pre-wrap text-[12px] leading-relaxed text-ink-2">
                    <bdi>{order.customer_location}</bdi>
                  </p>
                )}
              </div>
            )}

            <div className="label-caps flex justify-between border-b border-line pb-2 text-ink-3">
              <span>{t("receipt.item")}</span>
              <span>{t("receipt.amount")}</span>
            </div>

            <ul className="divide-y divide-line/70">
              {order.items.map((item) => (
                <li key={item.id} className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-snug text-ink">
                        <bdi>{item.product_name}</bdi>
                        {item.is_free && (
                          <span className="label-caps ms-1.5 rounded-sm border border-copper/35 bg-copper/[0.08] px-1 py-px text-copper">
                            {t("common.bonus")}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-[11px] text-ink-3 tabular-nums" dir="ltr">
                        <span className="me-2 inline-block rounded-sm border border-brand/25 bg-brand/[0.07] px-1.5 py-px font-mono font-bold text-brand">
                          {item.product_code}
                        </span>
                        {item.quantity} × {money(item.unit_price)}
                      </p>
                    </div>
                    <span className="shrink-0 pt-px text-[13px] font-bold text-ink tabular-nums">
                      {money(item.subtotal)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Totals */}
            <div className="mt-4 space-y-1.5 border-t-2 border-dashed border-line-strong pt-4">
              {order.discount > 0 && (
                <>
                  <div className="flex items-baseline gap-2 text-xs">
                    <span className="text-ink-3">{t("common.subtotal")}</span>
                    <span className="leader flex-1" />
                    <span className="font-semibold text-ink-2 tabular-nums">
                      {money(itemsSubtotal)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 text-xs">
                    <span className="text-ink-3">
                      {t("cart.discountWith", { n: discountPercent })}
                    </span>
                    <span className="leader flex-1" />
                    <span className="font-semibold text-brand tabular-nums">
                      −{money(order.discount)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-baseline justify-between pt-2">
                <span className="label-caps text-ink-2">{t("receipt.grandTotal")}</span>
                <span className="font-display text-3xl font-semibold tracking-tight text-ink tabular-nums">
                  {num(order.grand_total)}
                  <span className="ms-1.5 font-sans text-sm font-semibold tracking-[0.08em] text-ink-3">
                    {t("common.currency")}
                  </span>
                </span>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="mt-5 rounded-md border border-line bg-sunken/60 p-3.5">
                <p className="label-caps mb-1 text-ink-3">{t("common.notes")}</p>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">
                  {order.notes}
                </p>
              </div>
            )}

            <p className="label-caps mt-6 text-center text-ink-3">
              {pending ? t("receipt.pendingFooter") : t("receipt.thanks")}
            </p>
          </div>
        </div>

        {saveError && (
          <div className="print-hidden mt-4 rounded-md border border-rose/30 bg-rose/10 p-3 text-center text-xs text-rose">
            {saveError}
          </div>
        )}

        {/* Actions */}
        <div className="print-hidden mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => window.print()}
            className="flex h-12 items-center justify-center gap-2.5 rounded-md border border-line-strong bg-surface
                       text-sm font-semibold tracking-[0.02em] text-ink transition hover:bg-sunken active:scale-[0.99]"
          >
            <Printer className="h-4 w-4" />
            {t("receipt.print")}
          </button>
          <button
            onClick={saveAsImage}
            disabled={saving}
            className="flex h-12 items-center justify-center gap-2.5 rounded-md border border-line-strong bg-surface
                       text-sm font-semibold tracking-[0.02em] text-ink transition hover:bg-sunken active:scale-[0.99] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {saving ? t("common.saving") : t("receipt.saveImage")}
          </button>
          {!pending && (
            <a
              href={whatsAppShareUrl(order)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center gap-2.5 rounded-md bg-[#25d366]
                         text-sm font-semibold tracking-[0.02em] text-[#08301b]
                         shadow-[0_10px_24px_-10px_#25d366] transition hover:brightness-95 active:scale-[0.99]"
            >
              <MessageCircle className="h-4 w-4" />
              {t("receipt.whatsapp")}
            </a>
          )}
          <button
            onClick={onBack}
            className="flex h-12 items-center justify-center gap-2.5 rounded-md bg-brand
                       text-sm font-semibold tracking-[0.02em] text-on-brand
                       shadow-[0_10px_24px_-10px_var(--color-brand)] transition hover:bg-brand-deep active:scale-[0.99]"
          >
            <ArrowLeft className="h-4 w-4 flip-rtl" />
            {backLabel ??
              (pending ? t("receipt.backToShop") : t("receipt.newOrder"))}
          </button>
        </div>
      </div>
    </div>
  );
}
