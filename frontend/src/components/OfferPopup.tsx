"use client";

import { useEffect, useState } from "react";
import { X, Tag } from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";

/** The headline figure. One place to change what the ad claims. */
export const PROMO_PERCENT = 40;

const DISMISSED_KEY = "offer-popup-dismissed";

/** Today, as a plain date. Dismissing hides the ad until tomorrow. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface OfferPopupProps {
  /** Take the shopper to the products that are actually on offer. */
  onShop: () => void;
}

/**
 * The shop's discount ad, shown over the home screen.
 *
 * Two things keep it from becoming a nuisance. It waits a moment before
 * appearing, so it arrives over a drawn page rather than interrupting the
 * load; and dismissing it is remembered for the rest of the day, so a
 * shopper who says no is not asked again on their next visit.
 *
 * Whether there is anything to advertise is the caller's business — see
 * where this is rendered in ShopView.
 */
export default function OfferPopup({ onShop }: OfferPopupProps) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = (() => {
      try {
        return localStorage.getItem(DISMISSED_KEY) === today();
      } catch {
        // Private browsing can throw on read; an ad is not worth an error.
        return false;
      }
    })();
    if (dismissed) return;

    const timer = setTimeout(() => setShow(true), 900);
    return () => clearTimeout(timer);
  }, []);

  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISSED_KEY, today());
    } catch {
      /* Nothing to do — it will simply be offered again. */
    }
  };

  // Escape closes it, like every other overlay here.
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  if (!show) return null;

  return (
    <div className="fade-in fixed inset-0 z-50 flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={close} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("promo.title", { n: PROMO_PERCENT })}
        className="pop relative w-full max-w-sm overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2xl"
      >
        <button
          type="button"
          onClick={close}
          aria-label={t("common.close")}
          className="absolute end-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* The number, given the room it deserves. */}
        <div className="flex flex-col items-center bg-brand px-6 py-8 text-center text-on-brand">
          <Tag className="h-6 w-6 opacity-80" />
          <p className="mt-3 font-display text-5xl font-semibold leading-none tracking-tight tabular-nums">
            {PROMO_PERCENT}%
          </p>
          <p className="label-caps mt-2 opacity-90">{t("promo.eyebrow")}</p>
        </div>

        <div className="px-6 py-6 text-center">
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
            {t("promo.title", { n: PROMO_PERCENT })}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
            {t("promo.body")}
          </p>

          <button
            type="button"
            onClick={() => {
              close();
              onShop();
            }}
            className="mt-5 h-12 w-full rounded-full bg-brand text-sm font-semibold text-on-brand transition hover:bg-brand-deep active:scale-[0.99]"
          >
            {t("promo.cta")}
          </button>
          <button
            type="button"
            onClick={close}
            className="mt-2 h-10 w-full text-xs font-semibold text-ink-3 transition hover:text-ink"
          >
            {t("promo.later")}
          </button>
        </div>
      </div>
    </div>
  );
}
