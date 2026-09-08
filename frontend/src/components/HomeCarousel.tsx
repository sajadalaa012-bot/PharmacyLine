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
  ResponsivePhoto,
  photoPair,
  hasPhoto,
} from "@/types";
import BannerPhoto from "./BannerPhoto";
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
/**
 * The snap after a finger lets go. It carries on at about the speed the
 * finger left it at, between these two bounds, so a flick lands fast and a
 * slow drag settles slowly.
 */
const SNAP_MIN_MS = 180;
const SNAP_MAX_MS = 460;
/** The pace of a turn nobody threw, an arrow key or a dot: a whole slide of
 *  travel in this long. */
const SNAP_REST_MS = 420;
/** Decelerates hard, so the track settles rather than coasting to a stop. */
const SNAP_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** A flick: this fast at the moment of release turns the slide however short
 *  the swipe was, in px per ms. */
const FLICK_SPEED = 0.4;
/** A finger that has been still this long before lifting threw nothing,
 *  whatever it was doing before that. */
const FLICK_STALE_MS = 90;
/** Speed is measured over a window this wide. The gap between two touch
 *  events is sometimes a fraction of a millisecond, and dividing by it gives
 *  a number that says more about the touchscreen than about the hand. */
const SPEED_WINDOW_MS = 24;
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
  //
  // The finger's movement is written straight to the track's own style, once
  // a frame, and never held in state. A drag is sixty renders a second
  // otherwise, and this deck carries a slide per package: re-rendering that
  // lot between one frame and the next is what made a swipe stutter on a
  // phone. State holds where the deck has come to rest, and nothing else.
  const forward = rtl ? 1 : -1;
  const track = useRef<HTMLDivElement | null>(null);

  /** Where the track sits when no finger is on it. */
  const restAt = useCallback(
    (i: number) => `translate3d(${rtl ? "" : "-"}${i * 100}%, 0, 0)`,
    [rtl],
  );

  const dragFrom = useRef<{
    id: number;
    x: number;
    y: number;
    /** Locked on the first real movement and never revisited. */
    axis: "undecided" | "x" | "y";
    /** Where the speed was last measured from, and when. */
    lastX: number;
    lastAt: number;
    /** How fast the finger is going, px per ms, signed. */
    speed: number;
  } | null>(null);

  /** The frame the next paint is waiting on, and how far the finger has
   *  carried the track when it comes. */
  const frame = useRef(0);
  const carried = useRef(0);

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  // Neither end has anything to bring on, so a drag past them is resisted:
  // the track follows the finger part of the way and springs back, the deck
  // saying "that is the end" by feel.
  const resisted = useCallback(
    (dx: number) => {
      const straining =
        (index === 0 && dx * forward < 0) ||
        (index === count - 1 && dx * forward > 0);
      return straining ? dx * EDGE_RESISTANCE : dx;
    },
    [index, count, forward],
  );

  /** Puts the track under the finger. Runs once a frame at most. */
  const paint = useCallback(() => {
    frame.current = 0;
    const el = track.current;
    if (!el || !dragFrom.current) return;
    const offset = resisted(carried.current);
    // Built by hand rather than interpolated: calc() will not take "+ -12px".
    const nudge = `${offset < 0 ? "-" : "+"} ${Math.abs(offset)}px`;
    el.style.transitionDuration = "0ms";
    // translate3d, not translateX: it keeps the track on a layer of its own,
    // so following a finger is the compositor's job rather than a repaint.
    el.style.transform = `translate3d(calc(${rtl ? "" : "-"}${
      index * 100
    }% ${nudge}), 0, 0)`;
  }, [index, resisted, rtl]);

  /**
   * Sends the track to where it is going, at about the speed the finger left
   * it at. A flick with most of a slide still to cross gets there quickly; a
   * slow drag let go an inch from home ambles the last inch. One fixed
   * duration for every snap is what makes a deck feel rubbery: the less there
   * is left to travel, the more plainly it is ignoring the hand that threw it.
   */
  const glide = useCallback(
    (next: number, offset: number, speed: number) => {
      const el = track.current;
      if (!el) return;
      const width = el.clientWidth || 1;
      const left = Math.abs(offset - (next - index) * width * forward);
      const pace = Math.max(
        width / SNAP_REST_MS,
        Math.min(Math.abs(speed), width / SNAP_MIN_MS),
      );
      const ms = still
        ? 0
        : Math.round(Math.min(SNAP_MAX_MS, Math.max(SNAP_MIN_MS, left / pace)));
      el.style.transitionDuration = `${ms}ms`;
      el.style.transform = restAt(next);
    },
    [index, forward, still, restAt],
  );

  /**
   * A snap borrows the track's transition for its own duration. This hands it
   * back once the track has landed, so that a dot or an arrow pressed
   * afterwards moves at the resting pace rather than at the pace of whatever
   * the last finger did.
   */
  const onTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
    e.currentTarget.style.transitionDuration = still
      ? "0ms"
      : `${SNAP_REST_MS}ms`;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    dragFrom.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      axis: "undecided",
      lastX: e.clientX,
      lastAt: e.timeStamp,
      speed: 0,
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
    if (from.axis !== "x") return;

    const gap = e.timeStamp - from.lastAt;
    if (gap >= SPEED_WINDOW_MS) {
      from.speed = (e.clientX - from.lastX) / gap;
      from.lastX = e.clientX;
      from.lastAt = e.timeStamp;
    }

    carried.current = dx;
    if (!frame.current) frame.current = requestAnimationFrame(paint);
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
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
    if (!from || from.id !== e.pointerId || from.axis !== "x") return;
    draggedAt.current = Date.now();

    const dx = e.clientX - from.x;
    const speed = e.timeStamp - from.lastAt > FLICK_STALE_MS ? 0 : from.speed;
    // Two ways to turn a slide: carry it far enough that the next one is
    // already coming into view, or throw it. The throw is what a thumb
    // actually does, and making it travel the full 48px first is what made
    // the deck feel like it was arguing with the hand.
    const flick =
      Math.abs(speed) >= FLICK_SPEED && Math.abs(dx) >= AXIS_LOCK_PX;
    const turn = flick || Math.abs(dx) >= SWIPE_PX;
    const step = (flick ? speed : dx) * forward > 0 ? 1 : -1;
    // Clamped, not wrapped, the same as `go`.
    const next = turn ? Math.min(count - 1, Math.max(0, index + step)) : index;

    // Sent on its way here rather than left to the render: a swipe that turns
    // no slide changes no state at all, and the track still has to be brought
    // home.
    glide(next, resisted(dx), speed);
    setWanted(next);
  };

  // The browser takes the gesture over the moment it decides the page is
  // being scrolled, and says so by cancelling the pointer. Whatever the
  // finger did after that belongs to the scroll, not to us.
  const onPointerCancel = () => {
    const from = dragFrom.current;
    dragFrom.current = null;
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
    if (from?.axis === "x") glide(index, resisted(carried.current), 0);
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
          ref={track}
          className="flex"
          onTransitionEnd={onTransitionEnd}
          style={{
            // translate3d, not translateX: it puts the track on a layer of
            // its own, so a turn is the compositor's job rather than a
            // repaint per frame.
            transform: restAt(index),
            transitionProperty: "transform",
            // What a dot or an arrow key gets. A finger overwrites this on
            // the element itself, and the snap that follows hands it back.
            transitionDuration: still ? "0ms" : `${SNAP_REST_MS}ms`,
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
    <div className="grid gap-5 p-5 sm:grid-cols-2 sm:items-center sm:gap-8 sm:p-8 lg:p-10">
      <div className="order-2 sm:order-1">{children}</div>
      <div className="order-1 sm:order-2">{aside}</div>
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
  photo: ResponsivePhoto;
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
    <div className="relative flex h-full min-h-64 flex-col justify-end sm:min-h-96">
      <BannerPhoto
        photo={photo}
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

      <div className="relative p-5 sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-caps flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-white backdrop-blur-sm">
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {eyebrow}
          </span>
          {badge}
        </div>

        <h2 className="mt-3 whitespace-pre-line font-display text-[26px] font-semibold leading-[1.12] tracking-tight text-white drop-shadow-sm sm:text-4xl lg:text-5xl">
          <bdi>{title}</bdi>
        </h2>
        {body && (
          <p className="mt-2.5 line-clamp-3 max-w-lg whitespace-pre-line text-[13px] leading-relaxed text-white/80 sm:text-[15px]">
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
      <BlushGround photo={photoPair(slide)} />

      <div className="relative grid items-center gap-4 p-4 sm:grid-cols-2 sm:gap-8 sm:p-8 lg:gap-10 lg:p-10">
        {/* ── Copy. First in the source, so it takes the start side: the right
            in Arabic, the left in English, without either being hard-coded. */}
        <div className="order-2 sm:order-1">
          <span className="label-caps flex items-center gap-1.5 text-[#c62a6c]">
            <Tag className="h-3.5 w-3.5" />
            {eyebrow}
          </span>

          <h2 className="mt-2.5 whitespace-pre-line font-display text-[26px] font-bold leading-[1.08] tracking-tight text-[#1b2733] sm:text-4xl lg:text-[44px]">
            <bdi>
              {headline.before}
              {headline.figure && (
                <span className="text-[#c62a6c]">{headline.figure}</span>
              )}
              {headline.after}
            </bdi>
          </h2>

          <p className="mt-2.5 line-clamp-2 max-w-md whitespace-pre-line text-[13px] leading-relaxed text-[#5b6b7c] sm:mt-4 sm:line-clamp-none sm:text-[15px]">
            <bdi>{body}</bdi>
          </p>

          {pills.length > 0 && (
            <ul className="no-scrollbar mt-3.5 flex items-center gap-2 overflow-x-auto sm:mt-5 sm:flex-wrap sm:overflow-visible">
              {pills.map((c, i) => {
                const Icon = PILL_ICONS[i % PILL_ICONS.length];
                return (
                  <li
                    key={c.id}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-[12px] font-medium text-[#96436a] ring-1 ring-white/70"
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
            className="group mt-4 flex h-11 items-center gap-2 rounded-full bg-[#c62a6c] px-5 text-[13px] font-semibold text-white shadow-[0_14px_28px_-12px_rgba(198,42,108,0.75)] transition hover:bg-[#a51f57] active:scale-[0.98] sm:mt-6 sm:h-14 sm:gap-2.5 sm:px-8 sm:text-base"
          >
            {t("promo.cta")}
            <ArrowRight className="h-4 w-4 flip-rtl transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* ── What is actually reduced. Above the copy on a phone, beside it
            from `sm` up - the arrangement is the hook, the words are the
            argument, and on a narrow screen the hook comes first. */}
        <div className="order-1 flex items-end justify-center gap-3 sm:order-2 sm:gap-4">
          {shown.map((p, i) => {
            const name = localized(p, "name", lang);
            // Staggered, so three bottles read as an arrangement rather than a
            // row of boxes: the middle one stands tallest.
            const height =
              i === 1 ? "h-24 sm:h-44 lg:h-52" : "h-24 sm:h-36 lg:h-44";
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
  if (hasPhoto(pkg)) {
    return (
      <PhotoSlide
        photo={photoPair(pkg)}
        alt={name}
        icon={Boxes}
        eyebrow={t("pkg.eyebrow")}
        badge={
          onOffer ? (
            <span className="label-caps rounded-full bg-rose px-2.5 py-1 text-paper shadow-sm">
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
          <ul className="no-scrollbar mt-3.5 flex items-center gap-2 overflow-x-auto sm:mt-4 sm:flex-wrap sm:overflow-visible">
            {chips.map((c) => (
              <li
                key={c}
                className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-sm"
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

        <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-6 sm:gap-2.5">
          <button
            onClick={() => onAdd(pkg)}
            className="group flex h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-on-brand transition hover:bg-brand-deep active:scale-[0.98] sm:h-12 sm:px-7"
          >
            {t("pkg.addToCart")}
            <ArrowRight className="h-4 w-4 flip-rtl transition-transform group-hover:translate-x-0.5" />
          </button>
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
      </PhotoSlide>
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
        <ul className="no-scrollbar mt-3.5 flex items-center gap-2 overflow-x-auto sm:mt-4 sm:flex-wrap sm:overflow-visible">
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

      <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-6 sm:gap-2.5">
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

/**
 * The ground the two banner slides stand on: a blush wash in the shop's
 * pinks, or a photograph the shop uploaded under a wash of the same colour.
 *
 * The wash is what makes an uploaded photograph safe to put dark copy on.
 * Nobody vets what gets uploaded, and a headline that turns unreadable over
 * somebody's dark photo is worse than one that sits on a plain ground.
 */
function BlushGround({ photo }: { photo?: ResponsivePhoto }) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 72% 15%, #fdeef1 0%, #f8e2e6 42%, #f1d2d8 72%, #ebc4cc 100%)",
        }}
      />
      {photo?.wide && (
        <>
          <BannerPhoto
            photo={photo}
            alt=""
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
      <BlushGround photo={photoPair(slide)} />

      <div className="relative grid items-center gap-4 p-4 sm:grid-cols-2 sm:gap-8 sm:p-8 lg:gap-10 lg:p-10">
        {/* ── Copy. First in the source, so it takes the start side: the right
            in Arabic, the left in English, without either being hard-coded. */}
        <div className="order-2 sm:order-1">
          <span className="label-caps inline-flex flex-col items-start gap-1.5 text-[#c62a6c]">
            {eyebrow}
            {/* The rule under the eyebrow, as in the artwork. */}
            <span className="h-px w-10 bg-[#c62a6c]/50" />
          </span>

          <h2 className="mt-3 whitespace-pre-line font-display text-[26px] font-bold leading-[1.08] tracking-tight text-[#1b2733] sm:text-4xl lg:text-[44px]">
            <bdi>{headline}</bdi>
          </h2>

          <p className="mt-2.5 line-clamp-2 max-w-md whitespace-pre-line text-[13px] leading-relaxed text-[#5b6b7c] sm:mt-4 sm:line-clamp-none sm:text-[15px]">
            <bdi>{lede}</bdi>
          </p>

          {pills.length > 0 && (
            <ul className="no-scrollbar mt-3.5 flex items-center gap-2 overflow-x-auto sm:mt-5 sm:flex-wrap sm:overflow-visible">
              {pills.map((c, i) => {
                const Icon = PILL_ICONS[i % PILL_ICONS.length];
                return (
                  <li
                    key={c.id}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-[12px] font-medium text-[#96436a] ring-1 ring-white/70"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <bdi>{localized(c, "name", lang)}</bdi>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-6 sm:gap-3">
            <button
              onClick={onShopAll}
              className="group flex h-11 items-center gap-2 rounded-full bg-[#c62a6c] px-5 text-[13px] font-semibold text-white shadow-[0_14px_28px_-12px_rgba(198,42,108,0.75)] transition hover:bg-[#a51f57] active:scale-[0.98] sm:h-14 sm:gap-2.5 sm:px-8 sm:text-base"
            >
              {t("shop.ctaShop")}
              <ChevronRight className="h-4 w-4 flip-rtl transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={onBrowse}
              className="flex h-11 items-center gap-2 rounded-full bg-white/85 px-4 text-[13px] font-semibold text-[#96436a] ring-1 ring-white/80 transition hover:bg-white active:scale-[0.98] sm:h-14 sm:gap-2.5 sm:px-7 sm:text-base"
            >
              <LayoutGrid className="h-4 w-4" />
              {t("shop.ctaBrowse")}
            </button>
          </div>

          {/* The counts, as the quiet line the artwork closes on rather than a
              row of chips competing with the pills above. */}
          {showStats && (
            <p className="mt-4 hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c0879b] sm:block">
              {stats.map((s) => `${num(s.n)} ${s.label}`).join("  ·  ")}
            </p>
          )}
        </div>

        {/* ── The arrangement. Dropped entirely when the shop has uploaded a
            photograph: that photograph is already a picture of the shop, and
            standing more products on top of it would be a second one. */}
        {!hasPhoto(slide) && shelf.length > 0 && (
          <div className="order-1 flex items-end justify-center gap-2.5 sm:order-2 sm:gap-3">
            {shelf.map((p, i) => (
              <Plinth
                key={p.id}
                className={
                  i % 2 === 1
                    ? "h-24 flex-1 sm:h-44 lg:h-52"
                    : "h-24 flex-1 sm:h-36 lg:h-44"
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
