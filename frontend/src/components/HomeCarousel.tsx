"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Package,
  SlidersHorizontal,
  Tag,
} from "lucide-react";
import {
  Product,
  Package as PackageType,
  discountPercent,
  isDiscounted,
  packageContents,
  packageItemCount,
} from "@/types";
import { useI18n } from "@/lib/LanguageProvider";
import { localized } from "@/lib/i18n";
import { num } from "@/lib/format";
import { PROMO_PERCENT } from "./OfferPopup";

/** How far a finger has to travel sideways before it counts as a swipe, in px. */
const SWIPE_PX = 48;
/** And how much further sideways than down, before it counts as sideways. */
const AXIS_BIAS = 1.5;
/** How far a finger moves before the deck commits to sideways or down. */
const AXIS_LOCK_PX = 6;
/**
 * How much of a drag past the first or last slide actually shows. There is
 * nothing to bring on from either end, so the track follows the finger part
 * of the way and springs back — the deck saying "that's the end" by feel.
 */
const EDGE_RESISTANCE = 0.32;
/** The snap after a finger lets go. Decelerates hard, so it settles rather
 *  than coasting to a stop. */
const SNAP_MS = 460;
const SNAP_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Photographs on the offer slide. Enough to show a spread, few enough to read. */
const OFFER_PHOTOS = 3;

type Slide =
  | { kind: "promo" }
  | { kind: "about" }
  | { kind: "package"; pkg: PackageType };

/** Stable per slide — package slides all share a `kind`. */
function slideKey(slide: Slide): string {
  return slide.kind === "package" ? `package-${slide.pkg.id}` : slide.kind;
}

interface HomeCarouselProps {
  /** Everything in the catalogue — the deck picks its own photos out of it. */
  products: Product[];
  /** The packages on sale. Each gets a slide of its own, up to a few. */
  packages: PackageType[];
  brandCount: number;
  categoryCount: number;
  onShopAll: () => void;
  onShopOffers: () => void;
  onBrowse: () => void;
  onOpenProduct: (product: Product) => void;
  /** Puts one package in the basket, straight off the slide. */
  onAddPackage: (pkg: PackageType) => void;
  /** Opens one package in full — its description and everything in it. */
  onOpenPackage: (pkg: PackageType) => void;
  /** How many of one package are already in the basket. */
  packageQty: (pkg: PackageType) => number;
}

/**
 * What the home screen opens with: a word on what the shop stocks, then the
 * packages it has put together, then the discount that is running.
 *
 * Slides that have nothing to say are dropped rather than shown empty — the
 * offer slide when nothing is actually discounted, a package slide when there
 * is no package or it has not been priced. An advertisement for something
 * that does not exist is worse than no advertisement, and it is the same rule
 * the popup follows.
 *
 * The deck never moves on its own: the shopper turns it, by swipe, arrow, dot
 * or arrow key. A slide holds for as long as it is being read.
 */
export default function HomeCarousel({
  products,
  packages,
  brandCount,
  categoryCount,
  onShopAll,
  onShopOffers,
  onBrowse,
  onOpenProduct,
  onAddPackage,
  onOpenPackage,
  packageQty,
}: HomeCarouselProps) {
  const { t, rtl } = useI18n();

  const offers = products
    .filter(isDiscounted)
    .sort((a, b) => discountPercent(b) - discountPercent(a));

  // Every package the shop is selling, in the order the admin arranged them.
  // The deck is the only place packages appear, so nothing is held back here
  // — except one nobody has priced, which is not something to advertise.
  const promoted = packages.filter((p) => p.price > 0);

  // The brief opens the deck: what the shop is comes before what it is
  // selling, so a first-time visitor is told where they are before they are
  // sold to. Packages come next — a named kit at a fixed price is a more
  // concrete thing to put in front of someone than a percentage — and the
  // general discount ad brings up the rear.
  const slides: Slide[] = [
    { kind: "about" },
    ...promoted.map((pkg): Slide => ({ kind: "package", pkg })),
    ...(offers.length > 0 ? [{ kind: "promo" } as Slide] : []),
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

  // Clamped, not wrapped. Wrapping looked like the deck lurching backwards
  // through every slide it had just come forward through, which with a
  // package apiece is a long way to lurch.
  const go = useCallback(
    (next: number) => setWanted(Math.min(count - 1, Math.max(0, next))),
    [count],
  );

  // ── Swipe ─────────────────────────────────────────────────────────
  // The track follows the finger rather than waiting for it to let go, so a
  // half-swipe shows half the next slide and you can see what you are about
  // to get. In Arabic the deck runs right to left, so the gesture that means
  // "onwards" is the mirror of the English one.
  const forward = rtl ? 1 : -1;
  const dragFrom = useRef<{
    id: number;
    x: number;
    y: number;
    /** Locked on the first real movement and never revisited. */
    axis: "undecided" | "x" | "y";
  } | null>(null);
  /** How far the finger has carried the track, in px. 0 whenever none is down. */
  const [drag, setDrag] = useState(0);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    dragFrom.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      axis: "undecided",
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const from = dragFrom.current;
    if (!from || from.id !== e.pointerId) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;

    // A finger on its way down the page drifts sideways as it goes. That is a
    // scroll, so the choice is made once, at the first real movement, and
    // stuck to: a deck that started following a finger halfway through a
    // scroll would feel like it was grabbing at the page.
    if (from.axis === "undecided") {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      from.axis = Math.abs(dx) > Math.abs(dy) * AXIS_BIAS ? "x" : "y";
      // Ours now — keep the moves coming even if the finger leaves the deck.
      if (from.axis === "x") e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (from.axis === "x") setDrag(dx);
  };

  /**
   * When the last sideways drag finished. A slide is a button now — the whole
   * photograph opens the package — so a swipe that happens to end on one
   * would otherwise land as a press the moment the finger lifts. Anything
   * that got as far as locking to the x axis was a swipe, not a tap, and the
   * click it produces is swallowed below.
   */
  const draggedAt = useRef(0);

  const settle = (e: React.PointerEvent) => {
    const from = dragFrom.current;
    dragFrom.current = null;
    setDrag(0);
    if (!from || from.id !== e.pointerId || from.axis !== "x") return;
    draggedAt.current = Date.now();
    const dx = e.clientX - from.x;
    // Short of the threshold the track springs back to where it was, which
    // setDrag(0) above has already asked for.
    if (Math.abs(dx) < SWIPE_PX) return;
    go(index + (dx * forward > 0 ? 1 : -1));
  };

  // The browser takes the gesture over the moment it decides the page is
  // being scrolled, and says so by cancelling the pointer. Whatever the
  // finger did after that belongs to the scroll, not to us.
  const onPointerCancel = () => {
    dragFrom.current = null;
    setDrag(0);
  };

  // Neither end has anything to bring on, so a drag past them is resisted.
  const straining =
    (index === 0 && drag * forward < 0) ||
    (index === count - 1 && drag * forward > 0);
  const offset = straining ? drag * EDGE_RESISTANCE : drag;
  // Built by hand rather than interpolated: calc() will not take "+ -12px".
  const nudge = `${offset < 0 ? "-" : "+"} ${Math.abs(offset)}px`;

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
        onPointerMove={onPointerMove}
        onPointerUp={settle}
        onPointerCancel={onPointerCancel}
        // Caught on the way down, before it reaches whatever was under the
        // finger when it stopped. See draggedAt.
        onClickCapture={(e) => {
          if (Date.now() - draggedAt.current < 350) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <div
          className="flex"
          style={{
            // translate3d, not translateX: it puts the track on a layer of
            // its own, so following a finger is the compositor's job rather
            // than a repaint per frame.
            transform: `translate3d(calc(${rtl ? "" : "-"}${
              index * 100
            }% ${nudge}), 0, 0)`,
            transitionProperty: "transform",
            // No transition while a finger is on it — the track is meant to
            // be under the finger, not chasing it.
            transitionDuration: still || drag !== 0 ? "0ms" : `${SNAP_MS}ms`,
            transitionTimingFunction: SNAP_EASE,
            willChange: "transform",
          }}
        >
          {slides.map((slide, i) => (
            <div
              key={slideKey(slide)}
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
              ) : slide.kind === "package" ? (
                <PackageSlide
                  pkg={slide.pkg}
                  products={products}
                  qty={packageQty(slide.pkg)}
                  onAdd={onAddPackage}
                  onOpen={onOpenPackage}
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
          {/* The deck no longer wraps, so the ends say so rather than
              quietly doing nothing. */}
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label={t("home.prev")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition hover:border-brand hover:text-brand active:scale-95 disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4 flip-rtl" />
          </button>

          {/* Wraps: the deck carries a slide per package now, and a shop with
              a dozen of them must not push the arrows off the screen. */}
          <div className="flex max-w-full flex-wrap items-center justify-center gap-2">
            {slides.map((slide, i) => (
              <button
                key={slideKey(slide)}
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
            disabled={index === count - 1}
            aria-label={t("home.next")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition hover:border-brand hover:text-brand active:scale-95 disabled:pointer-events-none disabled:opacity-30"
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

/**
 * One package, as a billboard. The aside is the kit itself — the photographs
 * of what is actually in it — which answers "what am I buying" without the
 * shopper having to open anything, and is the whole reason a package deserves
 * a slide rather than a line of text.
 *
 * The button adds it to the basket outright. The shelf below the deck offers
 * the same package with its contents listed in words; anyone who wants to
 * read the list first has it, and anyone who recognises the kit from the
 * photographs can buy it from here.
 */
function PackageSlide({
  pkg,
  products,
  qty,
  onAdd,
  onOpen,
  onOpenProduct,
}: {
  pkg: PackageType;
  products: Product[];
  qty: number;
  onAdd: (pkg: PackageType) => void;
  onOpen: (pkg: PackageType) => void;
  onOpenProduct: (product: Product) => void;
}) {
  const { t, lang } = useI18n();
  const name = localized(pkg, "name", lang);
  const blurb = localized(pkg, "description", lang);
  const contents = packageContents(pkg, products);
  const count = packageItemCount(pkg);
  // Only what has a photograph: an empty plate says nothing about the kit.
  const shown = contents.filter((c) => c.product.image_url).slice(0, 3);

  const onOffer = isDiscounted(pkg);
  const saving = onOffer ? (pkg.old_price as number) - pkg.price : 0;
  const off = discountPercent(pkg);

  const chips = [
    count > 0
      ? count === 1
        ? t("pkg.oneItem")
        : t("pkg.itemsCount", { n: count })
      : null,
    saving > 0
      ? t("pkg.save", { n: `${num(saving)} ${t("common.currency")}` })
      : null,
  ].filter(Boolean) as string[];

  // The photograph the shop uploaded for this package — its own, never one
  // borrowed from the contents. A picture chosen for the kit is a picture of
  // the kit, so it gets the whole slide and the copy sits on top of it. With
  // none uploaded the slide falls back to the frame the rest of the deck
  // uses, with the contents on the plates.
  if (pkg.image_url) {
    return (
      <div className="relative flex h-full min-h-80 flex-col justify-end sm:min-h-96">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pkg.image_url}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* The copy has to stay readable over a photograph nobody vetted, so
            it reads white on a scrim that is heaviest where the words are.
            Fixed colours rather than theme tokens: what is behind them is a
            photograph in both themes. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/20" />

        {/* The photograph itself opens the package. It lies under the copy
            rather than over it, so the buttons below still take their own
            taps — and a swipe that happens to end here is swallowed by the
            deck rather than counted as a press. */}
        <button
          type="button"
          onClick={() => onOpen(pkg)}
          aria-label={t("pkg.viewDetails", { name })}
          className="absolute inset-0 cursor-pointer"
        />

        <div className="relative p-5 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-caps flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-white backdrop-blur-sm">
              <Boxes className="h-3.5 w-3.5" />
              {t("pkg.eyebrow")}
            </span>
            {onOffer && (
              <span className="label-caps rounded-full bg-rose px-2.5 py-1 text-paper shadow-sm">
                {t("offer.percentOff", { n: off })}
              </span>
            )}
          </div>

          <h2 className="mt-3 font-display text-[26px] font-semibold leading-[1.12] tracking-tight text-white drop-shadow-sm sm:text-4xl lg:text-5xl">
            <bdi>{name}</bdi>
          </h2>
          {blurb && (
            <p className="mt-2.5 line-clamp-2 max-w-lg text-[13px] leading-relaxed text-white/80 sm:text-[15px]">
              <bdi>{blurb}</bdi>
            </p>
          )}

          {chips.length > 0 && (
            <ul className="mt-4 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <li
                  key={c}
                  className="rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-sm"
                >
                  {c}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            {onOffer && (
              <span className="font-display text-base font-semibold text-white/60 line-through decoration-white/50 decoration-[1.5px] tabular-nums">
                {num(pkg.old_price as number)}
              </span>
            )}
            <p className="font-display text-2xl font-semibold tracking-tight text-white tabular-nums sm:text-3xl">
              {num(pkg.price)}
              <span className="ms-1.5 font-sans text-[11px] font-semibold tracking-[0.08em] text-white/70">
                {t("common.currency")}
              </span>
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:mt-6">
            <button
              onClick={() => onAdd(pkg)}
              className="group flex h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-on-brand transition hover:bg-brand-deep active:scale-[0.98] sm:h-12 sm:px-7"
            >
              {t("pkg.addToCart")}
              <ArrowRight className="h-4 w-4 flip-rtl transition-transform group-hover:translate-x-0.5" />
            </button>
            {/* Says out loud what tapping the photograph does — nobody should
                have to guess that a picture is a door. */}
            <button
              onClick={() => onOpen(pkg)}
              className="flex h-11 items-center gap-2 rounded-full border border-white/45 px-5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 active:scale-[0.98] sm:h-12 sm:px-6"
            >
              {t("pkg.whatsInside")}
            </button>
          </div>

          {qty > 0 && (
            <p className="mt-2.5 text-[12px] font-semibold text-white">
              {t("pkg.inCart", { n: qty })}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <SlideFrame
      aside={
        shown.length > 0 ? (
          <div
            className={`grid gap-2.5 sm:gap-3 ${
              shown.length === 1
                ? "grid-cols-1"
                : shown.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-3"
            }`}
          >
            {shown.map(({ product }, i) => {
              const itemName = localized(product, "name", lang);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onOpenProduct(product)}
                  aria-label={t("product.viewDetails", { name: itemName })}
                  className="group/plate cursor-zoom-in"
                >
                  <Plate
                    product={product}
                    name={itemName}
                    className={`h-24 transition-transform duration-300 group-hover/plate:scale-[1.03] sm:h-32 ${
                      i === 1 && shown.length === 3 ? "sm:-translate-y-3" : ""
                    }`}
                  />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex h-24 items-center justify-center rounded-2xl bg-sunken sm:h-32">
            <Boxes className="h-8 w-8 text-line-strong" />
          </div>
        )
      }
    >
      <span className="label-caps flex items-center gap-1.5 text-brand">
        <Boxes className="h-3.5 w-3.5" />
        {t("pkg.eyebrow")}
      </span>
      <h2 className="mt-2 font-display text-[26px] font-semibold leading-[1.12] tracking-tight text-ink sm:text-4xl lg:text-5xl">
        <bdi>{name}</bdi>
      </h2>
      {blurb && (
        <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-ink-2 sm:mt-4 sm:text-[15px]">
          <bdi>{blurb}</bdi>
        </p>
      )}

      {chips.length > 0 && (
        <ul className="mt-4 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <li
              key={c}
              className="rounded-full bg-sunken px-3 py-1.5 text-[12px] font-medium text-ink-2"
            >
              {c}
            </li>
          ))}
        </ul>
      )}

      {/* The price, in the "was … now …" the cards use. */}
      <div className="mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        {onOffer && (
          <span className="font-display text-base font-semibold text-ink-3 line-through decoration-rose/70 decoration-[1.5px] tabular-nums">
            {num(pkg.old_price as number)}
          </span>
        )}
        <p
          className={`font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl ${
            onOffer ? "text-rose" : "text-ink"
          }`}
        >
          {num(pkg.price)}
          <span
            className={`ms-1.5 font-sans text-[11px] font-semibold tracking-[0.08em] ${
              onOffer ? "text-rose/70" : "text-ink-3"
            }`}
          >
            {t("common.currency")}
          </span>
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:mt-6">
        <button
          onClick={() => onAdd(pkg)}
          className="group flex h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-on-brand transition hover:bg-brand-deep active:scale-[0.98] sm:h-12 sm:px-7"
        >
          {t("pkg.addToCart")}
          <ArrowRight className="h-4 w-4 flip-rtl transition-transform group-hover:translate-x-0.5" />
        </button>
        <button
          onClick={() => onOpen(pkg)}
          className="flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-sm font-semibold text-ink transition hover:bg-sunken active:scale-[0.98] sm:h-12 sm:px-6"
        >
          {t("pkg.whatsInside")}
        </button>
      </div>

      {qty > 0 && (
        <p className="mt-2.5 text-[12px] font-semibold text-brand">
          {t("pkg.inCart", { n: qty })}
        </p>
      )}
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
