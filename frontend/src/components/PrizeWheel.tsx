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

import { useCallback, useEffect, useRef, useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import { OrderPrize, OrderWheel } from "@/types";
import { fetchOrderWheel, spinOrderWheel } from "@/lib/api";
import { useI18n } from "@/lib/LanguageProvider";
import { localized } from "@/lib/i18n";
import {
  WHEEL_COLORS,
  landingAngle,
  segmentsFor,
  shortLabel,
  wedgePath,
} from "@/lib/wheel";

/** How long the wheel turns for, and how many times round it goes. */
const SPIN_MS = 4600;
const TURNS = 5;

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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      }
    });
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [orderId, token]);

  const segments = segmentsFor(offer?.prizes ?? []);
  const step = segments.length ? 360 / segments.length : 0;

  const spin = useCallback(async () => {
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
      const index =
        landing[Math.floor(Math.random() * landing.length)] ?? 0;
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
          reduced ? 0 : TURNS,
          Math.random() - 0.5,
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
  }, [orderId, token, segments, spinning, prize, t]);

  // No wheel for this order: the shop has it switched off, or this total
  // matches no price range. Nothing is said about it - an order that was never
  // offered a spin should not learn it missed one.
  if (!offer || segments.length === 0) return null;

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const prizePhoto = prize
    ? offer.prizes.find((p) => p.id === prize.id)?.image_url
    : undefined;

  return (
    <div className="mt-6 rounded-xl border border-line bg-sunken/40 p-4">
      <div className="flex items-center justify-center gap-2">
        <Gift className="h-4 w-4 text-brand" />
        <h2 className="font-display text-base font-semibold tracking-tight text-ink">
          {prize ? t("wheel.alreadySpun") : t("wheel.title")}
        </h2>
      </div>
      {!prize && (
        <p className="mt-1 text-center text-xs leading-relaxed text-ink-3">
          {t("wheel.subtitle")}
        </p>
      )}

      {/* The wheel. The pointer sits outside the turning part, at the top. */}
      <div className="relative mx-auto mt-4 aspect-square w-full max-w-[17rem]">
        <div
          className="absolute inset-x-0 -top-1 z-10 mx-auto h-0 w-0"
          style={{
            borderInlineStart: "9px solid transparent",
            borderInlineEnd: "9px solid transparent",
            borderTop: "16px solid var(--color-brand)",
          }}
          aria-hidden
        />
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full drop-shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
          style={{
            transform: `rotate(${angle}deg)`,
            transition: spinning
              ? `transform ${reducedMotion ? 200 : SPIN_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`
              : undefined,
          }}
          role="img"
          aria-label={t("wheel.title")}
        >
          <circle cx="100" cy="100" r="99" fill="#ffffff" />
          {segments.map((seg, i) => {
            const from = i * step;
            const mid = from + step / 2;
            return (
              <g key={`${seg.id}-${i}`}>
                <path
                  d={wedgePath(from, from + step)}
                  fill={WHEEL_COLORS[i % WHEEL_COLORS.length]}
                  stroke="#ffffff"
                  strokeWidth="1"
                />
                {/* Along the wedge, centred between the hub and the rim.
                    Anchored in the middle rather than at one end on purpose:
                    an end-anchored label would be laid out from the other
                    side in Arabic and run inward over the hub. */}
                <text
                  transform={`rotate(${mid} 100 100) translate(100 100) rotate(-90) translate(58 0)`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ffffff"
                  fontSize={segments.length > 10 ? 7.5 : 8.5}
                  fontWeight="700"
                >
                  {shortLabel(localized(seg, "name", lang))}
                </text>
              </g>
            );
          })}
        </svg>

        {/* The hub. Outside the turning part, or the shop's name would end up
            on its side every time the wheel stopped. */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 flex h-[19%] w-[19%] -translate-x-1/2 -translate-y-1/2
                     items-center justify-center rounded-full border border-[#ecd9e3] bg-white
                     shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
          aria-hidden
        >
          <span className="font-display text-[10px] font-semibold tracking-tight text-[#c62a6c]">
            {t("common.brand")}
          </span>
        </div>
      </div>

      {prize ? (
        <div className="pop mt-4 rounded-lg border border-brand/30 bg-brand/[0.07] p-4 text-center">
          <p className="label-caps text-brand">{t("wheel.youWon")}</p>
          {/* The photo comes from the wheel rather than the order: the order
              records what was won, not a copy of its picture. */}
          {prizePhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={prizePhoto}
              alt=""
              className="mx-auto mt-3 h-24 w-24 rounded-lg border border-line bg-surface object-cover"
            />
          )}
          <p className="mt-1.5 font-display text-lg font-semibold tracking-tight text-ink">
            <bdi>{localized(prize, "name", lang)}</bdi>
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
            {t("wheel.claim")}
          </p>
        </div>
      ) : (
        <>
          {error && (
            <p className="mt-3 text-center text-xs text-rose">{error}</p>
          )}
          <button
            type="button"
            onClick={spin}
            disabled={spinning}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand text-sm font-semibold
                       tracking-[0.01em] text-on-brand shadow-[0_10px_24px_-10px_var(--color-brand)]
                       transition hover:bg-brand-deep active:scale-[0.99] disabled:opacity-60"
          >
            {spinning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("wheel.spinning")}
              </>
            ) : (
              <>
                <Gift className="h-4 w-4" />
                {t("wheel.spin")}
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
