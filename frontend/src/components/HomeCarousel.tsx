"use client";

import { useCallback, useEffect, useState } from "react";
import { Boxes, ChevronLeft, ChevronRight, Package } from "lucide-react";
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
import useEmblaCarousel from "embla-carousel-react";
import BannerPhoto from "./BannerPhoto";
import SlideDetailModal, { SlideDetail } from "./SlideDetailModal";
import { useI18n } from "@/lib/LanguageProvider";
import { format, localized } from "@/lib/i18n";
import { num } from "@/lib/format";

/** How far a finger travels before it is dragging the deck rather than
 *  pressing what it came down on, in px. */
const DRAG_THRESHOLD = 8;
/** The pace of a turn nobody threw: an arrow, a dot, an arrow key. Embla's
 *  own unit, where higher is slower and 25 is its default. A thrown slide
 *  ignores this and travels at the speed it was thrown.
 *
 *  Above the default on purpose. At 22 a slide arrived before the eye had
 *  followed it across, which reads as a cut rather than a turn; the deck is
 *  a big thing to move and a longer glide lets it be seen moving. */
const SNAP_DURATION = 30;
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

  // The slide a shopper has pressed to read. The deck advertises; this is
  // where the advertisement explains itself. See SlideDetailModal.
  const [detail, setDetail] = useState<SlideDetail | null>(null);

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

  // ── Swipe ─────────────────────────────────────────────────────────
  //
  // Embla drives the track rather than a swipe written here. The one written
  // here read pointer events off the deck's frame, and a finger that came
  // down on a button, a pill or a bottle - which is most of what a slide is -
  // had its swipe swallowed by whatever it landed on: only the bare
  // photograph could be dragged. Embla listens for the touch at the root and
  // decides for itself whether it became a drag or stayed a tap, so the whole
  // slide is draggable and the buttons on it still take their presses.
  //
  // Clamped, not wrapped. Wrapping looked like the deck lurching backwards
  // through every slide it had just come forward through, which with a
  // package apiece is a long way to lurch.
  const [deckRef, embla] = useEmblaCarousel({
    direction: rtl ? "rtl" : "ltr",
    align: "start",
    containScroll: "trimSnaps",
    dragThreshold: DRAG_THRESHOLD,
    duration: SNAP_DURATION,
    // Nothing to drag between when there is one slide.
    watchDrag: count > 1,
  });

  // A finger on this page arrives with its touch events already marked
  // uncancellable, which is Chrome saying "this gesture is mine, scrolling":
  // Embla reads that and lets go, so the deck sat still under every swipe.
  // The storefront scrolls inside `.app-body` rather than the window on a
  // phone, and inside a scroller like that Chrome decides the question before
  // it looks at the deck's own handlers. What changes its mind is a blocking
  // touch listener on the document itself, even one that does nothing: the
  // gesture then waits to be told, the events arrive cancellable, and the
  // deck can act on them.
  //
  // Measured on the live site in Chrome with a touch screen: without this the
  // track never moves, with it a swipe turns the slide. The cost is that a
  // scroll starting anywhere on the page waits one main-thread turn before it
  // begins, which is a listener that returns immediately.
  useEffect(() => {
    const wake = () => undefined;
    document.addEventListener("touchstart", wake, { passive: false });
    return () => document.removeEventListener("touchstart", wake);
  }, []);

  // Where the deck has come to rest. Embla is the one that knows: a thrown
  // slide can carry past its neighbour, and the dots have to say which slide
  // is actually being shown rather than which one was asked for.
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!embla) return;
    const sync = () => setIndex(embla.selectedScrollSnap());
    sync();
    embla.on("select", sync).on("reInit", sync);
    return () => {
      embla.off("select", sync).off("reInit", sync);
    };
  }, [embla]);

  /** A turn asked for rather than thrown. Reduced motion gets the cut. */
  const go = useCallback(
    (next: number) => embla?.scrollTo(next, still),
    [embla, still],
  );

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
      {/* The window the track runs behind, and the frame Embla watches for a
          touch. It watches the whole of it, so a drag can start on anything
          the slide is made of.

          The frame itself - the border, the ground, the rounded corners - has
          moved onto the slides, so what travels is a card rather than a strip
          of wallpaper: turning the deck now shows a gutter opening between
          two edges instead of one picture sliding into the next.

          The padding is the room the cards' shadow needs. Overflow clips at
          the padding edge, so a few pixels of it keep the drop shadow from
          being sliced off along the bottom; the negative margin gives the
          space back to the page. */}
      <div ref={deckRef} className="-mb-7 overflow-hidden pb-7">
        {/* `touch-pan-y` leaves a vertical scroll of the page to the browser
            while a sideways drag belongs to the deck.

            `will-change-transform` asks the browser for a layer of the track's
            own before the first frame rather than during it, which is what
            keeps a drag on a phone from stuttering as it starts.

            The gutter between the cards is a plain flex gap, so each card
            still fills the frame exactly when the deck is at rest and the gap
            is only ever seen while it is moving. Embla measures the slides
            where they actually are, so the snaps come out right either way -
            and a gap costs no sliver of empty frame, which a start-side
            padding would leave showing at one edge. */}
        <div className="flex touch-pan-y gap-3 will-change-transform sm:gap-4">
          {slides.map((slide, i) => (
            <div
              key={slideKey(slide)}
              className="min-w-0 shrink-0 grow-0 basis-full"
              aria-hidden={i !== index}
              inert={i !== index}
            >
              <div className="h-full overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_20px_50px_-32px_rgba(27,39,51,0.5)]">
                {slide.kind === "promo" ? (
                  <PromoSlide
                    slide={deck.offer}
                    offers={offers}
                    categories={productCategories}
                    onOpenProduct={onOpenProduct}
                    onOpenDetail={setDetail}
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
                    onOpenDetail={setDetail}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Announced politely, so a screen reader is told the slide changed
          without having the sentence it is reading cut off. */}
      <p className="sr-only" aria-live="polite">
        {t("home.slideOf", { n: index + 1, total: count })}
      </p>

      {detail && (
        <SlideDetailModal {...detail} onClose={() => setDetail(null)} />
      )}

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
  onPress,
  pressLabel,
}: {
  children: React.ReactNode;
  aside: React.ReactNode;
  /** Pressing the slide anywhere its own controls are not. */
  onPress?: () => void;
  pressLabel?: string;
}) {
  return (
    <div className="relative grid gap-5 p-5 sm:grid-cols-2 sm:items-center sm:gap-8 sm:p-8 lg:p-10">
      {/* Under everything, so a button or a plate on the slide still takes
          its own press - and a swipe that happens to end here is swallowed by
          the deck rather than counted as a press. See how the copy marks the
          parts of itself that are only there to be read. */}
      {onPress && (
        <button
          type="button"
          onClick={onPress}
          aria-label={pressLabel}
          className="absolute inset-0 z-10 cursor-pointer"
        />
      )}
      <div className="order-2 sm:order-1">{children}</div>
      <div className="relative z-20 order-1 sm:order-2">{aside}</div>
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
  eyebrow,
  badge,
  title,
  onPress,
  pressLabel,
  children,
}: {
  photo: ResponsivePhoto;
  alt: string;
  eyebrow: string;
  /** A second pill beside the eyebrow - the discount figure, usually. */
  badge?: React.ReactNode;
  title: string;
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
          <span className="label-caps rounded-full bg-white/15 px-2.5 py-1 text-white backdrop-blur-sm">
            {eyebrow}
          </span>
          {badge}
        </div>

        <h2 className="mt-3 whitespace-pre-line font-display text-[26px] font-semibold leading-[1.12] tracking-tight text-white drop-shadow-sm sm:text-4xl lg:text-5xl">
          <bdi>{title}</bdi>
        </h2>

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

/** How many types a slide names in its pills before it stops. */
const SLIDE_PILLS = 4;

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
  onOpenProduct,
  onOpenDetail,
}: {
  slide: HomeDeck["offer"];
  offers: Product[];
  /** Names the benefit pills - the types the reduced products actually are. */
  categories: ProductCategory[];
  onOpenProduct: (product: Product) => void;
  /** Opens the slide's own words, in full. */
  onOpenDetail: (detail: SlideDetail) => void;
}) {
  const { t, lang } = useI18n();
  const shown = offers.slice(0, OFFER_PHOTOS);

  // {n} is filled in whether the wording is the shop's or the shipped one, so
  // a headline it writes can still carry the figure without retyping it.
  const n = slide.percent;
  const eyebrow = localized(slide, "eyebrow", lang) || t("promo.eyebrow");
  const written = localized(slide, "title", lang);
  const headline = splitOnFigure(written || t("promo.title"), n);
  // The paragraph the slide no longer carries: it is read on the sheet the
  // slide opens into, where there is room for it.
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
  ].slice(0, SLIDE_PILLS);

  const detail = (): SlideDetail => ({
    photo: photoPair(slide),
    eyebrow,
    title: `${headline.before}${headline.figure}${headline.after}`,
    body,
    chips: pills.map((c) => localized(c, "name", lang)),
    badge: t("offer.percentOff", { n }),
  });

  const chips = (
    <>
      {pills.length > 0 && (
        <ul className="no-scrollbar mt-3.5 flex items-center gap-2 overflow-x-auto sm:mt-4 sm:flex-wrap sm:overflow-visible">
          {pills.map((c) => (
            <li
              key={c.id}
              className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-sm"
            >
              <bdi>{localized(c, "name", lang)}</bdi>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  // A photograph the shop uploaded is the slide, the way a package's own
  // photograph is: edge to edge, the copy on a scrim over the foot of it.
  // The pink wash this slide used to put over the picture was there to keep
  // dark copy readable, and it cost the photograph most of itself.
  if (hasPhoto(slide)) {
    return (
      <PhotoSlide
        photo={photoPair(slide)}
        alt={`${headline.before}${headline.figure}${headline.after}`}
        eyebrow={eyebrow}
        badge={
          <span className="label-caps rounded-full bg-rose px-2.5 py-1 text-paper shadow-sm">
            {t("offer.percentOff", { n })}
          </span>
        }
        title={`${headline.before}${headline.figure}${headline.after}`}
        onPress={() => onOpenDetail(detail())}
        pressLabel={t("home.slideDetails")}
      >
        {chips}
      </PhotoSlide>
    );
  }

  return (
    // h-full so the blush reaches the bottom of the deck: the track sizes
    // every slide to the tallest, and a ground that stopped short of that
    // would show the surface behind it.
    <div className="relative flex h-full flex-col justify-center overflow-hidden">
      <BlushGround />

      {/* The whole slide is the way in to what it says. Under the copy in the
          stack, so the plates on the other side still open their own product,
          and the copy passes its presses down rather than swallowing them. */}
      <button
        type="button"
        onClick={() => onOpenDetail(detail())}
        aria-label={t("home.slideDetails")}
        className="absolute inset-0 z-10 cursor-pointer"
      />

      <div className="relative grid items-center gap-4 p-4 sm:grid-cols-2 sm:gap-8 sm:p-8 lg:gap-10 lg:p-10">
        {/* ── Copy. First in the source, so it takes the start side: the right
            in Arabic, the left in English, without either being hard-coded.
            Nothing here is interactive any more, so it lets a press through
            to the slide underneath. */}
        <div className="pointer-events-none order-2 sm:order-1">
          <span className="label-caps text-[#c62a6c]">{eyebrow}</span>

          <h2 className="mt-2.5 whitespace-pre-line font-display text-[26px] font-bold leading-[1.08] tracking-tight text-[#1b2733] sm:text-4xl lg:text-[44px]">
            <bdi>
              {headline.before}
              {headline.figure && (
                <span className="text-[#c62a6c]">{headline.figure}</span>
              )}
              {headline.after}
            </bdi>
          </h2>

          {pills.length > 0 && (
            <ul className="no-scrollbar mt-3.5 flex items-center gap-2 overflow-x-auto sm:mt-5 sm:flex-wrap sm:overflow-visible">
              {pills.map((c) => (
                <li
                  key={c.id}
                  className="shrink-0 rounded-full bg-white/70 px-3 py-1.5 text-[12px] font-medium text-[#96436a] ring-1 ring-white/70"
                >
                  <bdi>{localized(c, "name", lang)}</bdi>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── What is actually reduced. Above the copy on a phone, beside it
            from `sm` up - the arrangement is the hook, the words are the
            argument, and on a narrow screen the hook comes first. */}
        <div className="relative z-20 order-1 flex items-end justify-center gap-3 sm:order-2 sm:gap-4">
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
        eyebrow={t("pkg.eyebrow")}
        badge={
          onOffer ? (
            <span className="label-caps rounded-full bg-rose px-2.5 py-1 text-paper shadow-sm">
              {t("offer.percentOff", { n: off })}
            </span>
          ) : undefined
        }
        title={name}
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
      onPress={() => onOpen(pkg)}
      pressLabel={t("pkg.viewDetails", { name })}
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
      <div className="pointer-events-none">
        <span className="label-caps text-brand">{t("pkg.eyebrow")}</span>
        <h2 className="mt-2 font-display text-[26px] font-semibold leading-[1.12] tracking-tight text-ink sm:text-4xl lg:text-5xl">
          <bdi>{name}</bdi>
        </h2>
      </div>

      {chips.length > 0 && (
        <ul className="no-scrollbar pointer-events-none mt-3.5 flex items-center gap-2 overflow-x-auto sm:mt-4 sm:flex-wrap sm:overflow-visible">
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
      <div className="pointer-events-none mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
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

      <div className="relative z-20 mt-4 flex flex-wrap items-center gap-2 sm:mt-6 sm:gap-2.5">
        <button
          onClick={() => onAdd(pkg)}
          className="group flex h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-on-brand transition hover:bg-brand-deep active:scale-[0.98] sm:h-12 sm:px-7"
        >
          {t("pkg.addToCart")}
        </button>
        <button
          onClick={() => onOpen(pkg)}
          className="flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-sm font-semibold text-ink transition hover:bg-sunken active:scale-[0.98] sm:h-12 sm:px-6"
        >
          {t("pkg.whatsInside")}
        </button>
      </div>

      {qty > 0 && (
        <p className="pointer-events-none mt-2.5 text-[12px] font-semibold text-brand">
          {t("pkg.inCart", { n: qty })}
        </p>
      )}
    </SlideFrame>
  );
}

/**
 * The ground the two banner slides stand on: a blush wash in the shop's own
 * pinks, for a slide with no photograph of its own.
 *
 * It used to take the photograph too, under a sheet of the same pink heavy
 * enough to keep dark copy readable over anything anyone might upload - which
 * left the picture as a ghost of itself. A slide with a photograph is drawn
 * as a photograph now, white copy on a scrim, the way a package is.
 */
function BlushGround() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 72% 15%, #fdeef1 0%, #f8e2e6 42%, #f1d2d8 72%, #ebc4cc 100%)",
        }}
      />
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
  onOpenDetail,
}: {
  slide: HomeDeck["brief"];
  products: Product[];
  /** Names the pills - what the shop actually sells, from the catalogue. */
  categories: ProductCategory[];
  brandCount: number;
  categoryCount: number;
  /** Opens the slide's own words, in full. */
  onOpenDetail: (detail: SlideDetail) => void;
}) {
  const { t, lang } = useI18n();

  // The shop's own wording where it has written any, the shipped translation
  // where it has not. See HomeDeck.
  const eyebrow = localized(slide, "eyebrow", lang) || t("shop.eyebrow");
  const headline =
    localized(slide, "title", lang) ||
    `${t("shop.headline1")}\n${t("shop.headline2")}`;
  // The lede the slide no longer carries - read on the sheet it opens into.
  const lede = localized(slide, "body", lang) || t("shop.lede");

  // Real products stand in for the catalogue - ones with a picture only,
  // since an empty plinth says nothing about what is in the shop.
  const shelf = products.filter((p) => p.image_url).slice(0, 3);

  // Named, not marked: the opening slide names what the shop sells and
  // leaves the little icons to the offer slide, where they mark a benefit
  // rather than decorate a word that already says it.
  const pills = categories.slice(0, SLIDE_PILLS);

  // A count nobody has filled in yet is left off rather than shown as zero.
  const stats = [
    { n: products.length, label: t("home.statProducts") },
    { n: brandCount, label: t("home.statBrands") },
    { n: categoryCount, label: t("home.statCategories") },
  ].filter((s) => s.n > 0);
  const showStats = slide.stats && stats.length > 0;

  const detail = (): SlideDetail => ({
    photo: photoPair(slide),
    eyebrow,
    title: headline,
    body: lede,
    chips: pills.map((c) => localized(c, "name", lang)),
    footnote: showStats
      ? stats.map((st) => `${num(st.n)} ${st.label}`).join("  ·  ")
      : undefined,
  });

  // A photograph the shop uploaded is the slide, the way a package's own
  // photograph is - see the offer slide above.
  if (hasPhoto(slide)) {
    return (
      <PhotoSlide
        photo={photoPair(slide)}
        alt={headline.replace(/\n/g, " ")}
        eyebrow={eyebrow}
        title={headline}
        onPress={() => onOpenDetail(detail())}
        pressLabel={t("home.slideDetails")}
      >
        {pills.length > 0 && (
          <ul className="no-scrollbar mt-3.5 flex items-center gap-2 overflow-x-auto sm:mt-4 sm:flex-wrap sm:overflow-visible">
            {pills.map((c) => (
              <li
                key={c.id}
                className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-sm"
              >
                <bdi>{localized(c, "name", lang)}</bdi>
              </li>
            ))}
          </ul>
        )}
        {showStats && (
          <p className="mt-4 hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 sm:block">
            {stats.map((st) => `${num(st.n)} ${st.label}`).join("  ·  ")}
          </p>
        )}
      </PhotoSlide>
    );
  }

  return (
    // h-full so the blush reaches the bottom of the deck: the track sizes
    // every slide to the tallest, and a ground that stopped short of that
    // would show the surface behind it.
    <div className="relative flex h-full flex-col justify-center overflow-hidden">
      <BlushGround />

      {/* The whole slide is the way in to what it says. */}
      <button
        type="button"
        onClick={() => onOpenDetail(detail())}
        aria-label={t("home.slideDetails")}
        className="absolute inset-0 z-10 cursor-pointer"
      />

      <div className="relative grid items-center gap-4 p-4 sm:grid-cols-2 sm:gap-8 sm:p-8 lg:gap-10 lg:p-10">
        {/* ── Copy. First in the source, so it takes the start side: the right
            in Arabic, the left in English, without either being hard-coded.
            Nothing here is interactive, so it lets a press through to the
            slide underneath. */}
        <div className="pointer-events-none order-2 sm:order-1">
          <span className="label-caps inline-flex flex-col items-start gap-1.5 text-[#c62a6c]">
            {eyebrow}
            {/* The rule under the eyebrow, as in the artwork. */}
            <span className="h-px w-10 bg-[#c62a6c]/50" />
          </span>

          <h2 className="mt-3 whitespace-pre-line font-display text-[26px] font-bold leading-[1.08] tracking-tight text-[#1b2733] sm:text-4xl lg:text-[44px]">
            <bdi>{headline}</bdi>
          </h2>

          {pills.length > 0 && (
            <ul className="no-scrollbar mt-3.5 flex items-center gap-2 overflow-x-auto sm:mt-5 sm:flex-wrap sm:overflow-visible">
              {pills.map((c) => (
                <li
                  key={c.id}
                  className="shrink-0 rounded-full bg-white/70 px-3 py-1.5 text-[12px] font-medium text-[#96436a] ring-1 ring-white/70"
                >
                  <bdi>{localized(c, "name", lang)}</bdi>
                </li>
              ))}
            </ul>
          )}

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
