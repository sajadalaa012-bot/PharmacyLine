"use client";

// The wheel a customer spins once, on the screen that confirms their order.
//
// It does not decide anything. The server picks the prize, records it on the
// order and answers with it (see lib/prizeWheel.ts); this plays the spin that
// lands there. Which is why a reload cannot re-roll a prize, why a slow
// connection cannot lose one, and why the odds never leave the shop.
//
// What is on the wheel depends on what the order came to: the shop writes the
// prizes and says which price range wins which of them, on /admin/wheel.
//
// It takes the whole screen. A spin is the one moment in the shop that is
// pure theatre, and theatre inside a 17rem card between a receipt and a Back
// button is not theatre - so the wheel opens onto a stage of its own: its own
// pink ground, the shop's mark above it, and nothing else to look at. The
// stage carries its own colours rather than the theme's, for the same reason
// the wedges do: a wheel is an object, not a surface.
//
// It can be shut at any point. A customer who does not want to play keeps a
// small card on the confirmation with the spin still waiting for them, and
// one who has played keeps the card that says what they won.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Gift, Loader2, X } from "lucide-react";
import { OrderPrize, OrderWheel } from "@/types";
import { fetchOrderWheel, spinOrderWheel } from "@/lib/api";
import { useI18n } from "@/lib/LanguageProvider";
import { localized } from "@/lib/i18n";
import {
  WHEEL_WEDGES,
  landingAngle,
  rimStud,
  segmentsFor,
  wrapLabel,
  wedgePath,
} from "@/lib/wheel";

/** How long the wheel turns for, and how many times round it goes. */
const SPIN_MS = 4600;
const TURNS = 5;

/** Degrees a millisecond: under this the hand was resting on the wheel, not
 *  throwing it. About a fifth of a turn a second. */
const FLICK = 0.2;

/** Where the paint stops and the rim begins, in the 200×200 box. */
const WEDGE_R = 85;

/* The lipstick standing on its disc, cut from the poster the shop asked for.
   The sprite is 452×700 and the disc inside it is 436 across with its middle
   at 50.3% of the height; the disc is meant to cover 32% of the wheel, and
   these three numbers are what that works out to. They are what keeps the
   disc concentric with the wheel turning under it. */
const HUB = { width: 0.332, left: 0.334, top: 0.2415 };

interface PrizeWheelProps {
  orderId: number;
  /** The order's secret token, as handed back when it was placed. It is what
   *  authorises this spin - an order number on its own is not enough. */
  token: string;
}

export default function PrizeWheel({ orderId, token }: PrizeWheelProps) {
  const { t, lang } = useI18n();
  const [offer, setOffer] = useState<OrderWheel | null>(null);
  const [prize, setPrize] = useState<OrderPrize | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // The stage. Open of its own accord when there is a spin waiting, because
  // that is the moment it is for; shut for good by the customer, or by Done.
  const [onStage, setOnStage] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const gradientId = useId();

  useEffect(() => {
    let alive = true;
    fetchOrderWheel(orderId, token).then((data) => {
      if (!alive) return;
      setOffer(data);
      // Already spun, on a screen that has been reopened: show the prize
      // rather than a wheel that cannot be turned again, with the wheel
      // already resting on the wedge it landed on.
      if (data.prize) {
        setPrize(data.prize);
        const segs = segmentsFor(data.prizes);
        const index = segs.findIndex((s) => s.id === data.prize?.id);
        if (index >= 0) {
          const step = 360 / segs.length;
          setAngle(-(index * step + step / 2));
        }
      } else if (data.prizes.length > 0) {
        setOnStage(true);
      }
    });
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [orderId, token]);

  // While the stage is up, the page behind it does not scroll and Escape
  // leaves. Both are the document's business rather than React's, so they are
  // set here and unset on the way out.
  useEffect(() => {
    if (!onStage) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOnStage(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onStage]);

  const segments = segmentsFor(offer?.prizes ?? []);
  const step = segments.length ? 360 / segments.length : 0;

  /**
   * Spin, and land on whatever the server says.
   *
   * `turns` and `direction` are the only things the customer's hand decides:
   * a hard flick sends it round more times, and the wheel carries on the way
   * it was pushed. Where it stops was settled before it moved.
   */
  const spin = useCallback(
    async (turns = TURNS, direction: 1 | -1 = 1) => {
      if (spinning || prize) return;
      setSpinning(true);
      setError(null);
      try {
        const won = await spinOrderWheel(orderId, token);
        if (!won) {
          // Nothing to win: the shop turned the wheel off between placing the
          // order and spinning it. Leave the screen as it was.
          setOffer({ prizes: [], prize: null });
          setSpinning(false);
          return;
        }

        // Land on one of the wedges showing what was won - any of them, since
        // they are the same prize - and stop a little off centre, because a
        // wheel that always stops dead centre looks like what it is.
        const landing = segments
          .map((seg, i) => (seg.id === won.id ? i : -1))
          .filter((i) => i >= 0);
        const index = landing[Math.floor(Math.random() * landing.length)] ?? 0;
        const reduced =
          typeof window !== "undefined" &&
          window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

        // A reader who has asked for less motion still gets the answer, just
        // without five revolutions of it.
        setAngle((current) =>
          landingAngle(
            current,
            index,
            segments.length,
            reduced ? 0 : turns,
            Math.random() - 0.5,
            direction,
          ),
        );
        timer.current = setTimeout(
          () => {
            setPrize(won);
            setSpinning(false);
          },
          reduced ? 200 : SPIN_MS,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : t("wheel.failed"));
        setSpinning(false);
      }
    },
    [orderId, token, segments, spinning, prize, t],
  );

  /* ── Turning it by hand ────────────────────────────────────────────
     The wheel follows the finger, and a flick lets go of it: how hard
     decides how many times it goes round, and which way decides which way it
     carries on. A nudge is not a flick - the wheel stays where it was pushed
     and the spin is still there to take. */
  const drag = useRef<{
    id: number;
    /** Where the wheel stood when the finger landed. */
    from: number;
    /** The last raw pointer bearing, for unwrapping across the ±180 seam. */
    raw: number;
    /** Turned so far, and when: the tail of it is the flick's speed. */
    path: { turned: number; at: number }[];
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  /** The finger's bearing from the middle of the wheel, in degrees. */
  const bearing = (e: React.PointerEvent) => {
    const box = wheelRef.current?.getBoundingClientRect();
    if (!box) return 0;
    return (
      (Math.atan2(
        e.clientY - (box.top + box.height / 2),
        e.clientX - (box.left + box.width / 2),
      ) *
        180) /
      Math.PI
    );
  };

  const takeHold = (e: React.PointerEvent) => {
    if (spinning || prize) return;
    drag.current = {
      id: e.pointerId,
      from: angle,
      raw: bearing(e),
      path: [{ turned: 0, at: e.timeStamp }],
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const turnWithFinger = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const raw = bearing(e);
    // The bearing jumps 360 as the finger crosses due west, so each step is
    // taken as the short way round and added up.
    let stepped = raw - d.raw;
    if (stepped > 180) stepped -= 360;
    else if (stepped < -180) stepped += 360;
    d.raw = raw;
    const turned = (d.path[d.path.length - 1]?.turned ?? 0) + stepped;
    d.path.push({ turned, at: e.timeStamp });
    if (d.path.length > 8) d.path.shift();
    setAngle(d.from + turned);
  };

  const letGo = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    setDragging(false);

    // Speed over the tail of the gesture, in degrees a millisecond.
    const last = d.path[d.path.length - 1];
    const first = d.path.find((p) => last.at - p.at < 180) ?? d.path[0] ?? last;
    const ms = last.at - first.at;
    const speed = ms > 0 ? (last.turned - first.turned) / ms : 0;

    if (Math.abs(speed) < FLICK) return;
    spin(Math.min(9, 3 + Math.round(Math.abs(speed) * 6)), speed > 0 ? 1 : -1);
  };

  // No wheel for this order: the shop has it switched off, or this total
  // matches no price range. Nothing is said about it - an order that was never
  // offered a spin should not learn it missed one.
  if (!offer || segments.length === 0) return null;

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  /* The photo comes from the wheel rather than the order: the order records
     what was won, not a copy of its picture. */
  const prizePhoto = prize
    ? offer.prizes.find((p) => p.id === prize.id)?.image_url
    : undefined;

  /* ── The wheel itself ──────────────────────────────────────────────
     A rim with studs on it, the paint inside, the pointer above and the hub
     over the middle. Only the paint turns: the hub carries the shop's mark,
     and a mark that ends up on its side every time the wheel stops is not a
     mark. */
  const wheel = (
    <div
      ref={wheelRef}
      onPointerDown={takeHold}
      onPointerMove={turnWithFinger}
      onPointerUp={letGo}
      onPointerCancel={letGo}
      className={`relative mx-auto aspect-square w-full max-w-[20rem] select-none sm:max-w-[22rem] ${
        spinning || prize ? "" : dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      // The finger turns the wheel here, so it must not also scroll the page.
      style={{ touchAction: spinning || prize ? "auto" : "none" }}
    >
      <svg
        className="absolute inset-x-0 -top-1 z-10 mx-auto h-9 w-8 drop-shadow-[0_3px_5px_rgba(140,50,80,0.35)]"
        viewBox="0 0 28 34"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f8d9c4" />
            <stop offset="45%" stopColor="#e0a888" />
            <stop offset="100%" stopColor="#c07f61" />
          </linearGradient>
        </defs>
        {/* A rounded cap that tapers to a point, like the one on the poster */}
        <path
          d="M14 33 L1.5 9 A13 13 0 0 1 26.5 9 Z"
          fill={`url(#${gradientId})`}
          stroke="#ffffff"
          strokeWidth="1.2"
        />
      </svg>

      <svg
        viewBox="0 0 200 200"
        className="h-full w-full drop-shadow-[0_18px_38px_rgba(150,50,90,0.25)]"
        style={{
          transform: `rotate(${angle}deg)`,
          transition: spinning
            ? `transform ${reducedMotion ? 200 : SPIN_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`
            : undefined,
        }}
        role="img"
        aria-label={t("wheel.title")}
      >
        {/* The rim: the pale band the studs sit in, and a hairline outside it */}
        <circle cx="100" cy="100" r="99" fill="#f6d7de" />
        <circle cx="100" cy="100" r="96" fill="#fdf0f2" />
        <circle
          cx="100"
          cy="100"
          r="99"
          fill="none"
          stroke="#eec3ce"
          strokeWidth="1.5"
        />

        {segments.map((seg, i) => {
          const from = i * step;
          const mid = from + step / 2;
          const { fill, ink } = WHEEL_WEDGES[i % WHEEL_WEDGES.length];
          const lines = wrapLabel(localized(seg, "name", lang), 11);
          const size = segments.length > 10 ? 6.6 : 7.4;
          const leading = size * 1.25;
          return (
            <g key={`${seg.id}-${i}`}>
              <path
                d={wedgePath(from, from + step, WEDGE_R)}
                fill={fill}
                stroke="#fdf0f2"
                strokeWidth="1"
              />
              {/* Along the wedge, centred between the hub and the rim, and
                  one <text> per line rather than stacked tspans: a line
                  placed by its own transform lands where it is put in every
                  renderer.

                  Anchored in the middle rather than at one end on purpose:
                  an end-anchored label would be laid out from the other
                  side in Arabic and run inward over the hub. Wedges on the
                  way back up the wheel are turned over, so a name is never
                  read upside down - which is also why the line offsets flip
                  with them, or the last line would come out on top. */}
              {lines.map((line, l) => {
                const off = (l - (lines.length - 1) / 2) * leading;
                // Past the half turn the wedge's outward direction points
                // back up the page, and a label written along it would be
                // read upside down. Those are turned over to read inward.
                const upended = mid > 180;
                return (
                  <text
                    key={l}
                    transform={`rotate(${mid} 100 100) translate(100 100) rotate(-90) translate(59 ${
                      upended ? -off : off
                    })${upended ? " rotate(180)" : ""}`}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={ink}
                    fontSize={size}
                    fontWeight="700"
                  >
                    {line}
                  </text>
                );
              })}
            </g>
          );
        })}

        {segments.map((_, i) => {
          const { cx, cy } = rimStud(i, segments.length);
          return (
            <circle
              key={`stud-${i}`}
              cx={cx}
              cy={cy}
              r="2.6"
              fill="#ffffff"
              stroke="#eec3ce"
              strokeWidth="0.8"
            />
          );
        })}
      </svg>

      {/* The hub: the lipstick on its disc, standing still while the paint
          turns under it. Sized and placed so the disc is concentric with the
          wheel, and left transparent to pointers so it can be dragged too. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/wheel-hub.png"
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute max-w-none drop-shadow-[0_10px_18px_rgba(150,50,90,0.28)]"
        style={{
          width: `${HUB.width * 100}%`,
          left: `${HUB.left * 100}%`,
          top: `${HUB.top * 100}%`,
        }}
      />
    </div>
  );

  /* The card that announces the win. Shown on the stage the moment the wheel
     stops, and kept on the confirmation afterwards. */
  const wonCard = (big: boolean) =>
    prize && (
      <div
        className={
          big
            ? "pop mx-auto w-full max-w-sm rounded-2xl border border-[#f0c3cf] bg-white/80 p-5 text-center shadow-[0_18px_40px_-22px_rgba(150,50,90,0.6)] backdrop-blur"
            : "pop mt-4 rounded-lg border border-brand/30 bg-brand/[0.07] p-4 text-center"
        }
      >
        <p className={`label-caps ${big ? "text-[#b01b57]" : "text-brand"}`}>
          {t("wheel.youWon")}
        </p>
        {prizePhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prizePhoto}
            alt=""
            className={`mx-auto mt-3 rounded-xl object-cover ${
              big
                ? "h-28 w-28 border border-[#f0c3cf] bg-white"
                : "h-24 w-24 border border-line bg-surface"
            }`}
          />
        )}
        <p
          className={`mt-1.5 font-display font-semibold tracking-tight ${
            big ? "text-xl text-[#5e1030]" : "text-lg text-ink"
          }`}
        >
          <bdi>{localized(prize, "name", lang)}</bdi>
        </p>
        <p
          className={`mt-2 text-[11px] leading-relaxed ${
            big ? "text-[#8d1b4b]/75" : "text-ink-3"
          }`}
        >
          {t("wheel.claim")}
        </p>
      </div>
    );

  /* ── The stage ──────────────────────────────────────────────────────
     Hung on <body> rather than left where it is written. The confirmation
     sits inside the cart, and the cart arrives with an animation that leaves
     a transform behind it; a transformed ancestor is what `position: fixed`
     measures itself against, so a stage left in place would be pinned to the
     cart panel instead of the screen. */
  const stage = onStage && (
    <div
      className="wheel-stage fade-in fixed inset-0 z-[70] overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-label={t("wheel.title")}
    >
      <button
        type="button"
        onClick={() => setOnStage(false)}
        aria-label={t("common.close")}
        className="absolute end-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full
                       border border-white/70 bg-white/70 text-[#8d1b4b] backdrop-blur transition
                       hover:bg-white active:scale-95"
        style={{ marginTop: "env(safe-area-inset-top)" }}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col items-center justify-center gap-5 px-5 py-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/velina-logo.png"
          alt={t("common.brand")}
          className="h-12 w-auto sm:h-14"
        />

        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[#b01b57] sm:text-4xl">
            {prize ? t("wheel.alreadySpun") : t("wheel.title")}
          </h2>
          {!prize && (
            <p className="mt-1.5 text-sm leading-relaxed text-[#8d1b4b]/80">
              {t("wheel.subtitle")}
            </p>
          )}
        </div>

        {wheel}

        {prize ? (
          <>
            {wonCard(true)}
            <button
              type="button"
              onClick={() => setOnStage(false)}
              className="h-12 w-full max-w-sm rounded-full border border-[#d94b7d]/40 bg-white/70 text-sm
                             font-semibold text-[#b01b57] backdrop-blur transition hover:bg-white active:scale-[0.99]"
            >
              {t("wheel.done")}
            </button>
          </>
        ) : (
          <>
            {/* The wheel can be thrown by hand, which nothing about a wheel
                on a screen says out loud. */}
            {!spinning && !error && (
              <p className="-mt-1 text-center text-xs text-[#8d1b4b]/70">
                {t("wheel.flick")}
              </p>
            )}
            {error && (
              <p className="text-center text-xs font-semibold text-[#b01b57]">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => spin()}
              disabled={spinning}
              className="flex h-14 w-full max-w-sm items-center justify-center gap-3 rounded-full
                             bg-gradient-to-b from-[#d92e72] to-[#a8134f] text-lg font-semibold text-white
                             shadow-[0_16px_30px_-14px_rgba(168,19,79,0.9)] transition
                             hover:from-[#c92467] hover:to-[#95103f] active:scale-[0.99] disabled:opacity-70"
            >
              {spinning ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t("wheel.spinning")}
                </>
              ) : (
                <>
                  <Gift className="h-5 w-5" />
                  <span className="h-5 w-px bg-white/40" aria-hidden />
                  <span className="font-display tracking-tight">
                    {t("wheel.spin")}
                  </span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {stage && createPortal(stage, document.body)}

      {/* ── What is left on the confirmation ──────────────────────────
          The prize, once it is won; otherwise the spin, still waiting. */}
      <div className="mt-6 rounded-xl border border-line bg-sunken/40 p-4">
        <div className="flex items-center justify-center gap-2">
          <Gift className="h-4 w-4 text-brand" />
          <h2 className="font-display text-base font-semibold tracking-tight text-ink">
            {prize ? t("wheel.alreadySpun") : t("wheel.title")}
          </h2>
        </div>

        {prize ? (
          wonCard(false)
        ) : (
          <>
            <p className="mt-1 text-center text-xs leading-relaxed text-ink-3">
              {t("wheel.subtitle")}
            </p>
            <button
              type="button"
              onClick={() => setOnStage(true)}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand text-sm font-semibold
                         tracking-[0.01em] text-on-brand shadow-[0_10px_24px_-10px_var(--color-brand)]
                         transition hover:bg-brand-deep active:scale-[0.99]"
            >
              <Gift className="h-4 w-4" />
              {t("wheel.spin")}
            </button>
          </>
        )}
      </div>
    </>
  );
}
