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
import { Product, discountPercent, isDiscounted, priceRange } from "@/types";
import { useI18n } from "@/lib/LanguageProvider";
import { localized } from "@/lib/i18n";
import { num } from "@/lib/format";

/** How far a finger has to travel before it counts as a swipe, in px. */
const SWIPE_PX = 48;
/** At most this many offers get a slide — past that it stops being a deck. */
const MAX_OFFERS = 3;

type Slide =
  | { kind: "intro" }
  | { kind: "offer"; product: Product }
  | { kind: "collection" };

interface HomeCarouselProps {
  /** Everything in the catalogue — the deck picks its own offers out of it. */
  products: Product[];
  brandCount: number;
  categoryCount: number;
  onShopAll: () => void;
  onShopOffers: () => void;
  onBrowse: () => void;
  onOpenProduct: (product: Product) => void;
}

/**
 * The home screen's opening deck: what the shop is, what is discounted right
 * now, and what is inside.
 *
 * The offer slides are built from the catalogue rather than written by hand,
 * so the deck can only ever advertise a discount that exists — steepest
 * first. With nothing on offer it quietly becomes two slides.
 *
 * It never moves on its own: the shopper turns it, by swipe, arrow, dot or
 * arrow key. A slide therefore holds for as long as it is being read, and
 * nothing is ever pulled out from under someone mid-sentence.
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
    .sort((a, b) => discountPercent(b) - discountPercent(a))
    .slice(0, MAX_OFFERS);

  const slides: Slide[] = [
    { kind: "intro" },
    ...offers.map((product): Slide => ({ kind: "offer", product })),
    { kind: "collection" },
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
  const dragFrom = useRef<number | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    dragFrom.current = e.clientX;
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    const from = dragFrom.current;
    dragFrom.current = null;
    if (from === null) return;
    const dx = e.clientX - from;
    if (Math.abs(dx) < SWIPE_PX) return;
    go(index + ((rtl ? dx > 0 : dx < 0) ? 1 : -1));
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

  const offerCount = products.filter(isDiscounted).length;

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
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
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
              key={
                slide.kind === "offer" ? `offer-${slide.product.id}` : slide.kind
              }
              className="w-full shrink-0"
              aria-hidden={i !== index}
              inert={i !== index}
            >
              {slide.kind === "intro" && (
                <IntroSlide
                  products={products}
                  onShopAll={onShopAll}
                  onBrowse={onBrowse}
                />
              )}
              {slide.kind === "offer" && (
                <OfferSlide
                  product={slide.product}
                  onShopOffers={onShopOffers}
                  onOpen={() => onOpenProduct(slide.product)}
                />
              )}
              {slide.kind === "collection" && (
                <CollectionSlide
                  productCount={products.length}
                  brandCount={brandCount}
                  categoryCount={categoryCount}
                  offerCount={offerCount}
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
            {slides.map((_, i) => (
              <button
                key={i}
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

/** The frame every slide is cut to: copy on one side, a picture on the other. */
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
      className={`flex items-center justify-center overflow-hidden rounded-2xl bg-white p-4 ${className}`}
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
        <Package className="h-10 w-10 text-line-strong" />
      )}
    </div>
  );
}

/** Slide one: what this shop is, and the two ways into it. */
function IntroSlide({
  products,
  onShopAll,
  onBrowse,
}: {
  products: Product[];
  onShopAll: () => void;
  onBrowse: () => void;
}) {
  const { t, lang } = useI18n();
  // Three real products stand in for the catalogue. Ones with a picture only
  // — an empty plate says nothing about what is in the shop.
  const shelf = products.filter((p) => p.image_url).slice(0, 3);

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
          <div className="h-24 rounded-2xl bg-sunken sm:h-40" />
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
      <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:mt-7 sm:gap-3">
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

/** One real discount, priced honestly: what it was, and what it is. */
function OfferSlide({
  product,
  onShopOffers,
  onOpen,
}: {
  product: Product;
  onShopOffers: () => void;
  onOpen: () => void;
}) {
  const { t, lang } = useI18n();
  const name = localized(product, "name", lang);
  const off = discountPercent(product);
  const { min } = priceRange(product);
  const was = product.old_price as number;

  return (
    <SlideFrame
      aside={
        <button
          type="button"
          onClick={onOpen}
          aria-label={t("product.viewDetails", { name })}
          className="group/plate relative block w-full cursor-zoom-in"
        >
          <Plate
            product={product}
            name={name}
            className="h-40 w-full transition-transform duration-300 group-hover/plate:scale-[1.02] sm:h-56"
          />
          <span className="label-caps absolute -end-1 -top-2 rounded-full bg-rose px-2.5 py-1 text-[11px] text-paper shadow-md">
            {t("offer.percentOff", { n: off })}
          </span>
        </button>
      }
    >
      <span className="label-caps flex items-center gap-1.5 text-rose">
        <Tag className="h-3.5 w-3.5" />
        {t("promo.eyebrow")}
      </span>
      <h2 className="mt-2 font-display text-[22px] font-semibold leading-tight tracking-tight text-ink sm:text-3xl lg:text-4xl">
        <bdi>{name}</bdi>
      </h2>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-2xl font-semibold tabular-nums text-rose sm:text-3xl">
          {num(min)}
          <span className="ms-1 font-sans text-[11px] font-semibold tracking-[0.08em] text-rose/70">
            {t("common.currency")}
          </span>
        </span>
        <span className="font-display text-base text-ink-3 line-through decoration-rose/70 decoration-[1.5px] tabular-nums">
          {num(was)}
        </span>
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-ink-2 sm:text-[14px]">
        {t("offer.youSave", {
          n: num(was - product.price),
          currency: t("common.currency"),
        })}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:mt-6 sm:gap-3">
        <button
          onClick={onShopOffers}
          className="group flex h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-on-brand transition hover:bg-brand-deep active:scale-[0.98] sm:h-12 sm:px-7"
        >
          {t("promo.cta")}
          <ArrowRight className="h-4 w-4 flip-rtl transition-transform group-hover:translate-x-0.5" />
        </button>
        <button
          onClick={onOpen}
          className="flex h-11 items-center rounded-full border border-line-strong px-5 text-sm font-semibold text-ink transition hover:bg-sunken active:scale-[0.98] sm:h-12 sm:px-6"
        >
          {t("home.viewProduct")}
        </button>
      </div>
    </SlideFrame>
  );
}

/** The closing slide: the size of the shop, in its own numbers. */
function CollectionSlide({
  productCount,
  brandCount,
  categoryCount,
  offerCount,
  onBrowse,
}: {
  productCount: number;
  brandCount: number;
  categoryCount: number;
  offerCount: number;
  onBrowse: () => void;
}) {
  const { t } = useI18n();
  // A count nobody has filled in yet is left off rather than shown as zero.
  const stats = [
    { n: productCount, label: t("home.statProducts") },
    { n: brandCount, label: t("home.statBrands") },
    { n: categoryCount, label: t("home.statCategories") },
    { n: offerCount, label: t("home.statOffers") },
  ].filter((s) => s.n > 0);

  return (
    <SlideFrame
      aside={
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-sunken px-4 py-4 text-center sm:py-6"
            >
              <p className="font-display text-2xl font-semibold tabular-nums text-brand sm:text-3xl">
                {num(s.n)}
              </p>
              <p className="label-caps mt-1 text-ink-3">{s.label}</p>
            </div>
          ))}
        </div>
      }
    >
      <span className="label-caps text-brand">{t("shop.featured")}</span>
      <h2 className="mt-2 font-display text-[24px] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
        {t("home.collectionTitle")}
      </h2>
      <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-ink-2 sm:mt-5 sm:text-[15px]">
        {t("home.collectionBody")}
      </p>
      <button
        onClick={onBrowse}
        className="group mt-5 flex h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-on-brand transition hover:bg-brand-deep active:scale-[0.98] sm:mt-7 sm:h-12 sm:px-7"
      >
        {t("shop.ctaBrowse")}
        <ArrowRight className="h-4 w-4 flip-rtl transition-transform group-hover:translate-x-0.5" />
      </button>
    </SlideFrame>
  );
}
