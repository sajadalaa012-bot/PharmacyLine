"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Boxes,
  Droplet,
  LayoutGrid,
  Leaf,
  Sparkles,
  Sun,
  ChevronLeft,
  ChevronRight,
  Package,

  Tag,
} from "lucide-react";
import {
  Product,
  ProductCategory,
  Package as PackageType,
  discountPercent,
  isDiscounted,
  packageContents,
  packageItemCount,
  HomeDeck,
} from "@/types";
import { useI18n } from "@/lib/LanguageProvider";
import { format, localized } from "@/lib/i18n";
import { num } from "@/lib/format";


/** How far a finger has to travel sideways before it counts as a swipe, in px. */
const SWIPE_PX = 48;
/** And how much further sideways than down, before it counts as sideways. */
const AXIS_BIAS = 1.5;
/** How far a finger moves before the deck commits to sideways or down. */
const AXIS_LOCK_PX = 6;
/**
 * How much of a drag past the first or last slide actually shows. There is
 * nothing to bring on from either end, so the track follows the finger part
 * of the way and springs back - the deck saying "that's the end" by feel.
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

/** Stable per slide - package slides all share a `kind`. */
function slideKey(slide: Slide): string {
  return slide.kind === "package" ? `package-${slide.pkg.id}` : slide.kind;
}

interface HomeCarouselProps {
  /** Everything in the catalogue - the deck picks its own photos out of it. */
  products: Product[];
  /** The packages on sale. Each gets a slide of its own. */
  packages: PackageType[];
  /** The copy the shop has written for the two slides that are not packages. */
  deck: HomeDeck;
  /** Product types, to name the benefit pills on the discount slide. */
  productCategories: ProductCategory[];
  brandCount: number;
  categoryCount: number;
  onShopAll: () => void;
  onShopOffers: () => void;
  onBrowse: () => void;
  onOpenProduct: (product: Product) => void;
  /** Puts one package in the basket, straight off the slide. */
  onAddPackage: (pkg: PackageType) => void;
  /** Opens one package in full - its description and everything in it. */
  onOpenPackage: (pkg: PackageType) => void;
  /** How many of one package are already in the basket. */
  packageQty: (pkg: PackageType) => number;
}

/**
 * What the home screen opens with: a word on what the shop stocks, then the
 * packages it has put together, then the discount that is running.
 *
 * Slides that have nothing to say are dropped rather than shown empty - the
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
  deck,
  productCategories,
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
  // - except one nobody has priced, which is not something to advertise.
  const promoted = packages.filter((p) => p.price > 0);

  // The brief opens the deck: what the shop is comes before what it is
  // selling, so a first-time visitor is told where they are before they are
  // sold to. Packages come next - a named kit at a fixed price is a more
  // concrete thing to put in front of someone than a percentage - and the
  // general discount ad brings up the rear.
  const slides: Slide[] = [
    ...(deck.brief.enabled ? [{ kind: "about" } as Slide] : []),
    ...promoted.map((pkg): Slide => ({ kind: "package", pkg })),
    ...(deck.offer.enabled && offers.length > 0
      ? [{ kind: "promo" } as Slide]
      : []),
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
      // Ours now - keep the moves coming even if the finger leaves the deck.
      if (from.axis === "x") e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (from.axis === "x") setDrag(dx);
  };

  /**
   * When the last sideways drag finished. A slide is a button now - the whole
   * photograph opens the package - so a swipe that happens to end on one
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
        className="@container overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_20px_50px_-32px_rgba(27,39,51,0.5)]"
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
            // No transition while a finger is on it - the track is meant to
            // be under the finger, not chasing it.
            transitionDuration: still || drag !== 0 ? "0ms" : `${SNAP_MS}ms`,
            transitionTimingFunction: SNAP_EASE,
            willChange: "transform",
          }}
        >
          {slides.map((slide, i) => (
            <div
              key={slideKey(slide)}
              className="aspect-[16/9] w-full shrink-0 overflow-hidden"
              aria-hidden={i !== index}
              inert={i !== index}
            >
              {slide.kind === "promo" ? (
                <PromoSlide
                  slide={deck.offer}
                  offers={offers}
                  categories={productCategories}
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
                  slide={deck.brief}
                  products={products}
                  categories={productCategories}
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
    <div className="grid h-full grid-cols-2 items-center gap-[3cqw] p-[3.5cqw]">
      <div className="min-w-0">{children}</div>
      <div className="min-w-0">{aside}</div>
    </div>
  );
}

/**
 * The other shape a slide comes in: one photograph filling it, with the copy
 * on a scrim over the bottom of it.
 *
 * A picture somebody chose for a slide is the slide, so it gets the whole
 * frame rather than a third of it beside the words. Every slide can be either
 * shape - a package uses this when it has its own photo, and the brief and
 * the discount ad when the shop uploads one.
 */
function PhotoSlide({
  photo,
  alt,
  icon: Icon,
  eyebrow,
  badge,
  title,
  body,
  onPress,
  pressLabel,
  children,
}: {
  photo: string;
  alt: string;
  icon?: typeof Tag;
  eyebrow: string;
  /** A second pill beside the eyebrow - the discount figure, usually. */
  badge?: React.ReactNode;
  title: string;
  body?: string;
  /** When given, the photograph itself becomes a button. */
  onPress?: () => void;
  pressLabel?: string;
  /** The actions, and anything between the copy and them. */
  children?: React.ReactNode;
}) {
  return (
    <div className="relative flex h-full flex-col justify-end overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* The copy has to stay readable over a photograph nobody vetted, so it
          reads white on a scrim that is heaviest where the words are. Fixed
          colours rather than theme tokens: what is behind them is a
          photograph in both themes. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/20" />

      {/* The photograph lies under the copy rather than over it, so the
          buttons still take their own taps - and a swipe that happens to end
          here is swallowed by the deck rather than counted as a press. */}
      {onPress && (
        <button
          type="button"
          onClick={onPress}
          aria-label={pressLabel}
          className="absolute inset-0 cursor-pointer"
        />
      )}

      <div className="relative p-[3.5cqw]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-caps flex items-center gap-[0.5cqw] rounded-full bg-white/15 px-[1.2cqw] py-[0.5cqw] text-[clamp(8px,0.95cqw,12px)] text-white backdrop-blur-sm">
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {eyebrow}
          </span>
          {badge}
        </div>

        <h2 className="mt-[1cqw] line-clamp-2 whitespace-pre-line font-display text-[clamp(15px,3.4cqw,44px)] font-semibold leading-[1.12] tracking-tight text-white drop-shadow-sm">
          <bdi>{title}</bdi>
        </h2>
        {body && (
          <p className="mt-[1cqw] line-clamp-2 max-w-lg whitespace-pre-line text-[clamp(9px,1.25cqw,15px)] leading-relaxed text-white/80">
            <bdi>{body}</bdi>
          </p>
        )}

        {children}
      </div>
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
 * Splits a headline around its {n}, so the figure can be coloured while the
 * rest of the sentence is not. "Discounts up to {n}%!" comes back as
 * "Discounts up to " + "40%" + "!", with the per cent sign travelling with
 * the number because that is the part being shouted.
 *
 * A headline the shop wrote without an {n} simply comes back whole.
 */
function splitOnFigure(
  template: string,
  n: number,
): { before: string; figure: string; after: string } {
  const at = template.indexOf("{n}");
  if (at < 0) return { before: format(template, { n }), figure: "", after: "" };
  let after = template.slice(at + 3);
  let figure = String(n);
  if (after.startsWith("%")) {
    figure += "%";
    after = after.slice(1);
  }
  // Only the first {n} is the one being shouted; any the shop wrote further
  // along the sentence are filled in normally rather than left showing.
  return {
    before: format(template.slice(0, at), { n }),
    figure,
    after: format(after, { n }),
  };
}

/** The little marks on the benefit pills, in the order the pills appear. */
const PILL_ICONS = [Droplet, Sun, Sparkles, Leaf];

/**
 * The discount, as the shop advertises it: a blush banner with what is
 * actually reduced standing on it, the figure shouted in brand pink, and one
 * button into the offers.
 *
 * Every colour here is fixed rather than themed. It is a printed
 * advertisement more than a piece of the interface, and it is meant to read
 * the same in both themes - the way the tinted product cards already do.
 *
 * The photographs stand on frosted plinths rather than being cut out of their
 * backgrounds. The catalogue is shot on real surfaces - beige, grey, lavender
 * - as opaque JPEGs, so there is nothing to cut out; a plinth is the honest
 * way to stand one of those on a coloured ground.
 */
function PromoSlide({
  slide,
  offers,
  categories,
  onShopOffers,
  onOpenProduct,
}: {
  slide: HomeDeck["offer"];
  offers: Product[];
  /** Names the benefit pills - the types the reduced products actually are. */
  categories: ProductCategory[];
  onShopOffers: () => void;
  onOpenProduct: (product: Product) => void;
}) {
  const { t, lang } = useI18n();
  const shown = offers.slice(0, OFFER_PHOTOS);

  // {n} is filled in whether the wording is the shop's or the shipped one, so
  // a headline it writes can still carry the figure without retyping it.
  const n = slide.percent;
  const eyebrow = localized(slide, "eyebrow", lang) || t("promo.eyebrow");
  const written = localized(slide, "title", lang);
  const headline = splitOnFigure(written || t("promo.title"), n);
  const body = localized(slide, "body", lang) || t("promo.body");

  // What kinds of thing are actually reduced, named from the catalogue rather
  // than written by hand: a pill reading "Sunscreen" when no sunscreen is
  // discounted would be the wrong kind of true.
  const pills = [
    ...new Map(
      offers
        .map((p) => categories.find((c) => c.id === p.product_category_id))
        .filter((c): c is ProductCategory => !!c)
        .map((c) => [c.id, c] as const),
    ).values(),
  ].slice(0, PILL_ICONS.length);

  return (
    // h-full so the blush reaches the bottom of the deck: the track sizes
    // every slide to the tallest, and a ground that stopped short of that
    // would show the surface behind it.
    <div className="relative flex h-full flex-col justify-center overflow-hidden">
      <BlushGround photo={slide.image_url || undefined} />

      <div className="relative grid h-full grid-cols-2 items-center gap-[3cqw] p-[3.5cqw]">
        {/* ── Copy. First in the source, so it takes the start side: the right
            in Arabic, the left in English, without either being hard-coded. */}
        <div className="min-w-0">
          <span className="label-caps flex items-center gap-[0.5cqw] text-[clamp(8px,0.95cqw,12px)] text-[#c62a6c]">
            <Tag className="h-3.5 w-3.5" />
            {eyebrow}
          </span>

          <h2 className="mt-[1cqw] line-clamp-2 whitespace-pre-line font-display text-[clamp(15px,3.4cqw,44px)] font-bold leading-[1.08] tracking-tight text-[#1b2733]">
            <bdi>
              {headline.before}
              {headline.figure && (
                <span className="text-[#c62a6c]">{headline.figure}</span>
              )}
              {headline.after}
            </bdi>
          </h2>

          <p className="mt-[1cqw] line-clamp-2 max-w-md whitespace-pre-line text-[clamp(9px,1.25cqw,15px)] leading-relaxed text-[#5b6b7c]">
            <bdi>{body}</bdi>
          </p>

          {pills.length > 0 && (
            <ul className="no-scrollbar mt-[1.4cqw] flex items-center gap-[0.8cqw] overflow-x-auto">
              {pills.map((c, i) => {
                const Icon = PILL_ICONS[i % PILL_ICONS.length];
                return (
                  <li
                    key={c.id}
                    className="flex shrink-0 items-center gap-[0.5cqw] rounded-full bg-white/70 px-[1.2cqw] py-[0.6cqw] text-[clamp(8px,1cqw,12px)] font-medium text-[#96436a] ring-1 ring-white/70"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <bdi>{localized(c, "name", lang)}</bdi>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            onClick={onShopOffers}
            className="group mt-[1.8cqw] flex h-[clamp(30px,4.4cqw,56px)] items-center gap-[0.8cqw] rounded-full bg-[#c62a6c] px-[2.6cqw] text-[clamp(10px,1.3cqw,16px)] font-semibold text-white shadow-[0_14px_28px_-12px_rgba(198,42,108,0.75)] transition hover:bg-[#a51f57] active:scale-[0.98]"
          >
            {t("promo.cta")}
            <ArrowRight className="h-4 w-4 flip-rtl transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* ── What is actually reduced. Above the copy on a phone, beside it
            from `sm` up - the arrangement is the hook, the words are the
            argument, and on a narrow screen the hook comes first. */}
        <div className="flex min-w-0 items-end justify-center gap-[1.5cqw]">
          {shown.map((p, i) => {
            const name = localized(p, "name", lang);
            // Staggered, so three bottles read as an arrangement rather than a
            // row of boxes: the middle one stands tallest.
            const height =
              i === 1 ? "h-[38cqw] max-h-[85%]" : "h-[31cqw] max-h-[70%]";
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenProduct(p)}
                aria-label={t("product.viewDetails", { name })}
                className="group/plate relative min-w-0 flex-1 cursor-zoom-in"
              >
                <span className="label-caps absolute -top-2 end-0 z-10 rounded-full bg-[#c62a6c] px-2 py-1 text-[10px] text-white shadow-[0_8px_16px_-6px_rgba(198,42,108,0.8)]">
                  {t("offer.percentOff", { n: discountPercent(p) })}
                </span>
                <Plinth
                  className={`${height} transition-transform duration-300 group-hover/plate:-translate-y-1`}
                >
                  {p.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={p.image_url}
                      alt={name}
                      loading="lazy"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Package className="h-8 w-8 text-[#d8b7c0]" />
                  )}
                </Plinth>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * One package, as a billboard. The aside is the kit itself - the photographs
 * of what is actually in it - which answers "what am I buying" without the
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

  // The photograph the shop uploaded for this package - its own, never one
  // borrowed from the contents. A picture chosen for the kit is a picture of
  // the kit, so it gets the whole slide and the copy sits on top of it. With
  // none uploaded the slide falls back to the frame the rest of the deck
  // uses, with the contents on the plates.
  if (pkg.image_url) {
    return (
      <PhotoSlide
        photo={pkg.image_url}
        alt={name}
        icon={Boxes}
        eyebrow={t("pkg.eyebrow")}
        badge={
          onOffer ? (
            <span className="label-caps shrink-0 rounded-full bg-rose px-[1.2cqw] py-[0.5cqw] text-[clamp(8px,0.95cqw,12px)] text-paper shadow-sm">
              {t("offer.percentOff", { n: off })}
            </span>
          ) : undefined
        }
        title={name}
        body={blurb || undefined}
        onPress={() => onOpen(pkg)}
        pressLabel={t("pkg.viewDetails", { name })}
      >
        {chips.length > 0 && (
          <ul className="no-scrollbar mt-[1.4cqw] flex items-center gap-[0.8cqw] overflow-x-auto">
            {chips.map((c) => (
              <li
                key={c}
                className="shrink-0 rounded-full bg-white/15 px-[1.2cqw] py-[0.6cqw] text-[clamp(8px,1cqw,12px)] font-medium text-white backdrop-blur-sm"
              >
                {c}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-[1.2cqw] flex items-baseline gap-x-[1cqw]">
          {onOffer && (
            <span className="font-display text-[clamp(9px,1.4cqw,17px)] font-semibold text-white/60 line-through decoration-white/50 decoration-[1.5px] tabular-nums">
              {num(pkg.old_price as number)}
            </span>
          )}
          <p className="font-display text-[clamp(13px,2.4cqw,30px)] font-semibold tracking-tight text-white tabular-nums">
            {num(pkg.price)}
            <span className="ms-[0.5cqw] font-sans text-[clamp(7px,0.9cqw,11px)] font-semibold tracking-[0.08em] text-white/70">
              {t("common.currency")}
            </span>
          </p>
        </div>

        <div className="mt-[1.8cqw] flex items-center gap-[1cqw]">
          <button
            onClick={() => onAdd(pkg)}
            className="group flex h-[clamp(30px,4.4cqw,56px)] items-center gap-[0.8cqw] rounded-full bg-brand px-[2.6cqw] text-[clamp(10px,1.3cqw,16px)] font-semibold text-on-brand transition hover:bg-brand-deep active:scale-[0.98]"
          >
            {t("pkg.addToCart")}
            <ArrowRight className="h-4 w-4 flip-rtl transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={() => onOpen(pkg)}
            className="flex h-[clamp(30px,4.4cqw,56px)] items-center gap-[0.8cqw] rounded-full border border-white/45 px-[2cqw] text-[clamp(10px,1.3cqw,16px)] font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 active:scale-[0.98]"
          >
            {t("pkg.whatsInside")}
          </button>
        </div>

        {qty > 0 && (
          <p className="mt-[0.8cqw] text-[clamp(8px,1cqw,12px)] font-semibold text-white">
            {t("pkg.inCart", { n: qty })}
          </p>
        )}
      </PhotoSlide>
    );
  }

  return (
    <SlideFrame
      aside={
        shown.length > 0 ? (
          <div
            className={`grid gap-[1.5cqw] ${
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
                    className={`h-[31cqw] max-h-[70%] transition-transform duration-300 group-hover/plate:scale-[1.03] ${
                      i === 1 && shown.length === 3 ? "sm:-translate-y-3" : ""
                    }`}
                  />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex h-[31cqw] max-h-[70%] items-center justify-center rounded-2xl bg-sunken">
            <Boxes className="h-8 w-8 text-line-strong" />
          </div>
        )
      }
    >
      <span className="label-caps flex items-center gap-1.5 text-brand">
        <Boxes className="h-3.5 w-3.5" />
        {t("pkg.eyebrow")}
      </span>
      <h2 className="mt-[1cqw] line-clamp-2 font-display text-[clamp(15px,3.4cqw,44px)] font-semibold leading-[1.12] tracking-tight text-ink">
        <bdi>{name}</bdi>
      </h2>
      {blurb && (
        <p className="mt-[1cqw] line-clamp-2 max-w-lg text-[clamp(9px,1.25cqw,15px)] leading-relaxed text-ink-2">
          <bdi>{blurb}</bdi>
        </p>
      )}

      {chips.length > 0 && (
        <ul className="no-scrollbar mt-[1.4cqw] flex items-center gap-[0.8cqw] overflow-x-auto">
          {chips.map((c) => (
            <li
              key={c}
              className="shrink-0 rounded-full bg-sunken px-3 py-1.5 text-[12px] font-medium text-ink-2"
            >
              {c}
            </li>
          ))}
        </ul>
      )}

      {/* The price, in the "was … now …" the cards use. */}
      <div className="mt-[1.2cqw] flex items-baseline gap-x-[1cqw]">
        {onOffer && (
          <span className="font-display text-base font-semibold text-ink-3 line-through decoration-rose/70 decoration-[1.5px] tabular-nums">
            {num(pkg.old_price as number)}
          </span>
        )}
        <p
          className={`font-display text-[clamp(13px,2.4cqw,30px)] font-semibold tracking-tight tabular-nums ${
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

      <div className="mt-[1.8cqw] flex items-center gap-[1cqw]">
        <button
          onClick={() => onAdd(pkg)}
          className="group flex h-[clamp(30px,4.4cqw,56px)] items-center gap-[0.8cqw] rounded-full bg-brand px-[2.6cqw] text-[clamp(10px,1.3cqw,16px)] font-semibold text-on-brand transition hover:bg-brand-deep active:scale-[0.98]"
        >
          {t("pkg.addToCart")}
          <ArrowRight className="h-4 w-4 flip-rtl transition-transform group-hover:translate-x-0.5" />
        </button>
        <button
          onClick={() => onOpen(pkg)}
          className="flex h-[clamp(30px,4.4cqw,56px)] items-center gap-[0.8cqw] rounded-full border border-line-strong px-[2cqw] text-[clamp(10px,1.3cqw,16px)] font-semibold text-ink transition hover:bg-sunken active:scale-[0.98]"
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

/**
 * The ground the two banner slides stand on: a blush wash in the shop's
 * pinks, or a photograph the shop uploaded under a wash of the same colour.
 *
 * The wash is what makes an uploaded photograph safe to put dark copy on.
 * Nobody vets what gets uploaded, and a headline that turns unreadable over
 * somebody's dark photo is worse than one that sits on a plain ground.
 */
function BlushGround({ photo }: { photo?: string }) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 72% 15%, #fdeef1 0%, #f8e2e6 42%, #f1d2d8 72%, #ebc4cc 100%)",
        }}
      />
      {photo && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#fbe6ea]/75" />
        </>
      )}
    </>
  );
}

/**
 * A frosted stand for one product photograph, echoing the stone plinths the
 * shop's own photography uses.
 *
 * The catalogue is shot on real surfaces - beige, grey, lavender - as opaque
 * JPEGs, so a product cannot be cut out and floated on the blush the way a
 * studio composite would. A plinth is the honest way to stand one of those on
 * a coloured ground, and it matches the photography rather than fighting it.
 */
function Plinth({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`flex items-center justify-center overflow-hidden rounded-2xl bg-white/70 p-2.5 shadow-[0_20px_34px_-20px_rgba(27,39,51,0.55)] ring-1 ring-white/70 backdrop-blur-sm ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * What the shop is: the brief the deck opens on.
 *
 * Built to the same blush banner as the discount slide, so the two read as
 * one piece of work rather than two designs sharing a carousel. Where they
 * differ is what stands on the ground: the discount slide has to show the
 * products it is discounting, while this one is about the shop as a whole, so
 * an uploaded photograph replaces the arrangement entirely rather than
 * sitting behind it.
 */
function AboutSlide({
  slide,
  products,
  categories,
  brandCount,
  categoryCount,
  onShopAll,
  onBrowse,
}: {
  slide: HomeDeck["brief"];
  products: Product[];
  /** Names the pills - what the shop actually sells, from the catalogue. */
  categories: ProductCategory[];
  brandCount: number;
  categoryCount: number;
  onShopAll: () => void;
  onBrowse: () => void;
}) {
  const { t, lang } = useI18n();

  // The shop's own wording where it has written any, the shipped translation
  // where it has not. See HomeDeck.
  const eyebrow = localized(slide, "eyebrow", lang) || t("shop.eyebrow");
  const headline =
    localized(slide, "title", lang) ||
    `${t("shop.headline1")}\n${t("shop.headline2")}`;
  const lede = localized(slide, "body", lang) || t("shop.lede");

  // Real products stand in for the catalogue - ones with a picture only,
  // since an empty plinth says nothing about what is in the shop.
  const shelf = products.filter((p) => p.image_url).slice(0, 3);

  const pills = categories.slice(0, PILL_ICONS.length);

  // A count nobody has filled in yet is left off rather than shown as zero.
  const stats = [
    { n: products.length, label: t("home.statProducts") },
    { n: brandCount, label: t("home.statBrands") },
    { n: categoryCount, label: t("home.statCategories") },
  ].filter((s) => s.n > 0);
  const showStats = slide.stats && stats.length > 0;

  return (
    // h-full so the blush reaches the bottom of the deck: the track sizes
    // every slide to the tallest, and a ground that stopped short of that
    // would show the surface behind it.
    <div className="relative flex h-full flex-col justify-center overflow-hidden">
      <BlushGround photo={slide.image_url || undefined} />

      <div className="relative grid h-full grid-cols-2 items-center gap-[3cqw] p-[3.5cqw]">
        {/* ── Copy. First in the source, so it takes the start side: the right
            in Arabic, the left in English, without either being hard-coded. */}
        <div className="min-w-0">
          <span className="label-caps inline-flex flex-col items-start gap-[0.6cqw] text-[clamp(8px,0.95cqw,12px)] text-[#c62a6c]">
            {eyebrow}
            {/* The rule under the eyebrow, as in the artwork. */}
            <span className="h-px w-10 bg-[#c62a6c]/50" />
          </span>

          <h2 className="mt-[1cqw] line-clamp-2 whitespace-pre-line font-display text-[clamp(15px,3.4cqw,44px)] font-bold leading-[1.08] tracking-tight text-[#1b2733]">
            <bdi>{headline}</bdi>
          </h2>

          <p className="mt-[1cqw] line-clamp-2 max-w-md whitespace-pre-line text-[clamp(9px,1.25cqw,15px)] leading-relaxed text-[#5b6b7c]">
            <bdi>{lede}</bdi>
          </p>

          {pills.length > 0 && (
            <ul className="no-scrollbar mt-[1.4cqw] flex items-center gap-[0.8cqw] overflow-x-auto">
              {pills.map((c, i) => {
                const Icon = PILL_ICONS[i % PILL_ICONS.length];
                return (
                  <li
                    key={c.id}
                    className="flex shrink-0 items-center gap-[0.5cqw] rounded-full bg-white/70 px-[1.2cqw] py-[0.6cqw] text-[clamp(8px,1cqw,12px)] font-medium text-[#96436a] ring-1 ring-white/70"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <bdi>{localized(c, "name", lang)}</bdi>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-[1.8cqw] flex items-center gap-[1cqw]">
            <button
              onClick={onShopAll}
              className="group flex h-[clamp(30px,4.4cqw,56px)] items-center gap-[0.8cqw] rounded-full bg-[#c62a6c] px-[2.6cqw] text-[clamp(10px,1.3cqw,16px)] font-semibold text-white shadow-[0_14px_28px_-12px_rgba(198,42,108,0.75)] transition hover:bg-[#a51f57] active:scale-[0.98]"
            >
              {t("shop.ctaShop")}
              <ChevronRight className="h-4 w-4 flip-rtl transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={onBrowse}
              className="flex h-[clamp(30px,4.4cqw,56px)] items-center gap-[0.8cqw] rounded-full bg-white/85 px-[2cqw] text-[clamp(10px,1.3cqw,16px)] font-semibold text-[#96436a] ring-1 ring-white/80 transition hover:bg-white active:scale-[0.98]"
            >
              <LayoutGrid className="h-4 w-4" />
              {t("shop.ctaBrowse")}
            </button>
          </div>

          {/* The counts, as the quiet line the artwork closes on rather than a
              row of chips competing with the pills above. */}
          {showStats && (
            <p className="mt-[1.4cqw] hidden text-[clamp(7px,0.8cqw,11px)] font-semibold uppercase tracking-[0.16em] text-[#c0879b] @[34rem]:block">
              {stats.map((s) => `${num(s.n)} ${s.label}`).join("  ·  ")}
            </p>
          )}
        </div>

        {/* ── The arrangement. Dropped entirely when the shop has uploaded a
            photograph: that photograph is already a picture of the shop, and
            standing more products on top of it would be a second one. */}
        {!slide.image_url && shelf.length > 0 && (
          <div className="flex min-w-0 items-end justify-center gap-[1.5cqw]">
            {shelf.map((p, i) => (
              <Plinth
                key={p.id}
                className={
                  i % 2 === 1
                    ? "h-[38cqw] max-h-[85%] flex-1"
                    : "h-[31cqw] max-h-[70%] flex-1"
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image_url}
                  alt={localized(p, "name", lang)}
                  loading="lazy"
                  className="max-h-full max-w-full object-contain"
                />
              </Plinth>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
