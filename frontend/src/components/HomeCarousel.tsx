"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Package,
  SlidersHorizontal,
  Tag,
} from "lucide-react";
import { Product, discountPercent, isDiscounted } from "@/types";
import { useI18n } from "@/lib/LanguageProvider";
import { localized } from "@/lib/i18n";
import { num } from "@/lib/format";
import { PROMO_PERCENT } from "./OfferPopup";

/** How far a finger has to travel sideways before it counts as a swipe, in px. */
const SWIPE_PX = 48;
/** And how much further sideways than down, before it counts as sideways. */
const AXIS_BIAS = 1.5;
/** Photographs on the offer slide. Enough to show a spread, few enough to read. */
const OFFER_PHOTOS = 3;

type Slide = { kind: "promo" } | { kind: "about" };

interface HomeCarouselProps {
  /** Everything in the catalogue — the deck picks its own photos out of it. */
  products: Product[];
  brandCount: number;
  categoryCount: number;
  onShopAll: () => void;
  onShopOffers: () => void;
  onBrowse: () => void;
  onOpenProduct: (product: Product) => void;
}

/**
 * The two things the home screen opens with: the discount that is running,
 * and a word on what the shop stocks.
 *
 * The offer slide is dropped when nothing is actually discounted — an
 * advertisement for offers that do not exist is worse than no advertisement,
 * and it is the same rule the popup follows.
 *
 * The deck never moves on its own: the shopper turns it, by swipe, arrow, dot
 * or arrow key. A slide holds for as long as it is being read.
 */
export default function HomeCarousel({
  products,
  brandCount,
  categoryCount,
  onShopAll,
  onShopOffers,
  onBrowse,
  onOpenProduct,
}: HomeCarouselProps) {
  const { t, rtl } = useI18n();

  const offers = products
    .filter(isDiscounted)
    .sort((a, b) => discountPercent(b) - discountPercent(a));

  const slides: Slide[] = [
    ...(offers.length > 0 ? [{ kind: "promo" } as Slide] : []),
    { kind: "about" },
  ];
  const count = slides.length;

  const [wanted, setWanted] = useState(0);
  const index = wanted < count ? wanted : 0;
  const [still, setStill] = useState(false);

  // The deck does not move by itself, but turning a slide is still a slide of
  // travel. Anyone who asked the system not to animate gets the cut instead.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const go = useCallback(
    (next: number) => setWanted(((next % count) + count) % count),
    [count],
  );

  // ── Swipe ─────────────────────────────────────────────────────────
  // In Arabic the deck runs right to left, so the gesture that means
  // "onwards" is the mirror of the English one.
  const dragFrom = useRef<{ id: number; x: number; y: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    dragFrom.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const from = dragFrom.current;
    dragFrom.current = null;
    if (!from || from.id !== e.pointerId) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    // A finger on its way down the page drifts sideways as it goes. That is
    // a scroll, and the deck stays where it is: only travel that is
    // decisively sideways — further across than down, and far enough to be
    // meant — turns a slide.
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * AXIS_BIAS) {
      return;
    }
    go(index + ((rtl ? dx > 0 : dx < 0) ? 1 : -1));
  };

  // The browser takes the gesture over the moment it decides the page is
  // being scrolled, and says so by cancelling the pointer. Whatever the
  // finger did after that belongs to the scroll, not to us.
  const onPointerCancel = () => {
    dragFrom.current = null;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    if (e.key === forward) {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === back) {
      e.preventDefault();
      go(index - 1);
    }
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("home.deck")}
      onKeyDown={onKeyDown}
      className="relative"
    >
      {/* The window the track runs behind. `touch-action: pan-y` leaves a
          vertical scroll of the page to the browser while a sideways drag
          belongs to us. */}
      <div
        className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_20px_50px_-32px_rgba(27,39,51,0.5)]"
        style={{ touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div
          className="flex ease-out"
          style={{
            transform: `translateX(${rtl ? "" : "-"}${index * 100}%)`,
            transitionProperty: "transform",
            transitionDuration: still ? "0ms" : "520ms",
          }}
        >
          {slides.map((slide, i) => (
            <div
              key={slide.kind}
              className="w-full shrink-0"
              aria-hidden={i !== index}
              inert={i !== index}
            >
              {slide.kind === "promo" ? (
                <PromoSlide
                  offers={offers}
                  onShopOffers={onShopOffers}
                  onOpenProduct={onOpenProduct}
                />
              ) : (
                <AboutSlide
                  products={products}
                  brandCount={brandCount}
                  categoryCount={categoryCount}
                  onShopAll={onShopAll}
                  onBrowse={onBrowse}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Announced politely, so a screen reader is told the slide changed
          without having the sentence it is reading cut off. */}
      <p className="sr-only" aria-live="polite">
        {t("home.slideOf", { n: index + 1, total: count })}
      </p>

      {count > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label={t("home.prev")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition hover:border-brand hover:text-brand active:scale-95"
          >
            <ChevronLeft className="h-4 w-4 flip-rtl" />
          </button>

          <div className="flex items-center gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.kind}
                type="button"
                onClick={() => go(i)}
                aria-label={t("home.goTo", { n: i + 1 })}
                aria-current={i === index ? "true" : undefined}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index
                    ? "w-6 bg-brand"
                    : "w-2 bg-line-strong hover:bg-ink-3"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label={t("home.next")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition hover:border-brand hover:text-brand active:scale-95"
          >
            <ChevronRight className="h-4 w-4 flip-rtl" />
          </button>
        </div>
      )}
    </section>
  );
}

/** The frame both slides are cut to: copy on one side, pictures on the other. */
function SlideFrame({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside: React.ReactNode;
}) {
  return (
    <div className="grid gap-5 p-5 sm:grid-cols-2 sm:items-center sm:gap-8 sm:p-8 lg:p-10">
      <div className="order-2 sm:order-1">{children}</div>
      <div className="order-1 sm:order-2">{aside}</div>
    </div>
  );
}

/** A product photograph on the clean white plate the cards use. */
function Plate({
  product,
  name,
  className = "",
}: {
  product: Product;
  name: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-2xl bg-white p-3 ${className}`}
    >
      {product.image_url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={product.image_url}
          alt={name}
          loading="lazy"
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <Package className="h-8 w-8 text-line-strong" />
      )}
    </div>
  );
}

/**
 * The discount, as the shop advertises it. The headline figure is the one the
 * popup uses — see PROMO_PERCENT — so the two never disagree about what is
 * being claimed. The photographs are the steepest discounts actually running,
 * each carrying its own real percentage.
 */
function PromoSlide({
  offers,
  onShopOffers,
  onOpenProduct,
}: {
  offers: Product[];
  onShopOffers: () => void;
  onOpenProduct: (product: Product) => void;
}) {
  const { t, lang } = useI18n();
  const shown = offers.slice(0, OFFER_PHOTOS);

  return (
    <SlideFrame
      aside={
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {shown.map((p) => {
            const name = localized(p, "name", lang);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenProduct(p)}
                aria-label={t("product.viewDetails", { name })}
                className="group/plate relative cursor-zoom-in"
              >
                <Plate
                  product={p}
                  name={name}
                  className="h-24 transition-transform duration-300 group-hover/plate:scale-[1.03] sm:h-32"
                />
                <span className="label-caps absolute -end-1 -top-1.5 rounded-full bg-rose px-1.5 py-0.5 text-[10px] text-paper shadow-md">
                  {t("offer.percentOff", { n: discountPercent(p) })}
                </span>
              </button>
            );
          })}
        </div>
      }
    >
      <span className="label-caps flex items-center gap-1.5 text-rose">
        <Tag className="h-3.5 w-3.5" />
        {t("promo.eyebrow")}
      </span>
      <h2 className="mt-2 font-display text-[26px] font-semibold leading-[1.12] tracking-tight text-ink sm:text-4xl lg:text-5xl">
        {t("promo.title", { n: PROMO_PERCENT })}
      </h2>
      <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-ink-2 sm:mt-5 sm:text-[15px]">
        {t("promo.body")}
      </p>
      <button
        onClick={onShopOffers}
        className="group mt-5 flex h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-on-brand transition hover:bg-brand-deep active:scale-[0.98] sm:mt-7 sm:h-12 sm:px-7"
      >
        {t("promo.cta")}
        <ArrowRight className="h-4 w-4 flip-rtl transition-transform group-hover:translate-x-0.5" />
      </button>
    </SlideFrame>
  );
}

/** What the shop stocks, in a sentence and four numbers. */
function AboutSlide({
  products,
  brandCount,
  categoryCount,
  onShopAll,
  onBrowse,
}: {
  products: Product[];
  brandCount: number;
  categoryCount: number;
  onShopAll: () => void;
  onBrowse: () => void;
}) {
  const { t, lang } = useI18n();
  // Real products stand in for the catalogue — ones with a picture only, since
  // an empty plate says nothing about what is in the shop.
  const shelf = products.filter((p) => p.image_url).slice(0, 3);
  // A count nobody has filled in yet is left off rather than shown as zero.
  const stats = [
    { n: products.length, label: t("home.statProducts") },
    { n: brandCount, label: t("home.statBrands") },
    { n: categoryCount, label: t("home.statCategories") },
  ].filter((s) => s.n > 0);

  return (
    <SlideFrame
      aside={
        shelf.length > 0 ? (
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {shelf.map((p, i) => (
              <Plate
                key={p.id}
                product={p}
                name={localized(p, "name", lang)}
                className={`h-24 sm:h-32 ${i === 1 ? "sm:-translate-y-3" : ""}`}
              />
            ))}
          </div>
        ) : (
          <div className="h-24 rounded-2xl bg-sunken sm:h-32" />
        )
      }
    >
      <span className="label-caps text-brand">{t("shop.eyebrow")}</span>
      <h2 className="mt-2 font-display text-[26px] font-semibold leading-[1.12] tracking-tight text-ink sm:text-4xl lg:text-5xl">
        {t("shop.headline1")}
        <br />
        {t("shop.headline2")}
      </h2>
      <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-ink-2 sm:mt-5 sm:text-[15px]">
        {t("shop.lede")}
      </p>

      {stats.length > 0 && (
        <ul className="mt-4 flex flex-wrap items-center gap-2">
          {stats.map((s) => (
            <li
              key={s.label}
              className="rounded-full bg-sunken px-3 py-1.5 text-[12px] text-ink-2"
            >
              <span className="font-semibold tabular-nums text-ink">
                {num(s.n)}
              </span>{" "}
              {s.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:mt-6 sm:gap-3">
        <button
          onClick={onShopAll}
          className="group flex h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-on-brand transition hover:bg-brand-deep active:scale-[0.98] sm:h-12 sm:px-7"
        >
          {t("shop.ctaShop")}
          <ArrowRight className="h-4 w-4 flip-rtl transition-transform group-hover:translate-x-0.5" />
        </button>
        <button
          onClick={onBrowse}
          className="flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-sm font-semibold text-ink transition hover:bg-sunken active:scale-[0.98] sm:h-12 sm:px-6"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {t("shop.ctaBrowse")}
        </button>
      </div>
    </SlideFrame>
  );
}
