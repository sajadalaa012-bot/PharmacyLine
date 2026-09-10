"use client";

import { useEffect } from "react";
import { ResponsivePhoto } from "@/types";
import BannerPhoto from "./BannerPhoto";
import { useI18n } from "@/lib/LanguageProvider";
import { X } from "lucide-react";

/** Somewhere for the sheet to send a shopper who has read it. */
export interface SlideAction {
  label: string;
  onClick: () => void;
  /** The one thing the sheet is really for. One per sheet. */
  primary?: boolean;
}

/** Everything a slide can say about itself once there is room to say it. */
export interface SlideDetail {
  /** The slide's own photograph, when it has one. */
  photo?: ResponsivePhoto;
  eyebrow: string;
  title: string;
  /** The paragraph the slide itself no longer carries. */
  body: string;
  /** The pills from the slide - what is in it, named. */
  chips?: string[];
  /** A figure worth putting beside the eyebrow, e.g. "40% off". */
  badge?: string;
  /** The quiet line the slide closes on - the shop's counts. */
  footnote?: string;
  /** Where the slide leads. Shown as buttons along the foot of the sheet. */
  actions?: SlideAction[];
}

interface SlideDetailModalProps extends SlideDetail {
  onClose: () => void;
}

/**
 * A slide, opened up.
 *
 * The deck is an advertisement: a picture, a headline, and what is in it.
 * Anything longer would compete with the picture, so the paragraph that
 * explains the slide lives here instead - reached by pressing the slide, the
 * way a package opens into its own view. Nothing is clamped here, because
 * this is the place the words were actually going to be read.
 */
export default function SlideDetailModal({
  photo,
  eyebrow,
  title,
  body,
  chips = [],
  badge,
  footnote,
  actions = [],
  onClose,
}: SlideDetailModalProps) {
  const { t } = useI18n();

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock background scroll while the sheet is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-[2px] p-3 sm:p-4">
      {/* Backdrop click closes */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Centred, and measured in dvh.
          It used to sit on the floor of the screen at 92vh, and vh on a phone
          counts the browser chrome as part of the screen - so the foot of the
          sheet, and the buttons on it, could be below anything the reader
          could actually see. Centred it is clear of both edges, and dvh is
          the height that is really there. */}
      <div className="pop relative flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-sunken/50 px-5 py-3.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="label-caps truncate rounded-sm border border-brand/25 bg-brand/[0.08] px-1.5 py-0.5 text-brand">
              <bdi>{eyebrow}</bdi>
            </span>
            {badge && (
              <span className="label-caps rounded-full bg-rose px-2.5 py-1 text-paper">
                {badge}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-2 transition hover:bg-sunken hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* The slide's own picture, as wide as the sheet - it was composed
              for a banner, so it is shown as one rather than shrunk onto a
              square plate. */}
          {photo?.wide && (
            <div className="relative h-36 w-full overflow-hidden sm:h-56">
              <BannerPhoto
                photo={photo}
                alt={title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="p-5">
            <h3 className="whitespace-pre-line font-display text-xl font-semibold leading-snug tracking-tight text-ink">
              <bdi>{title}</bdi>
            </h3>

            {body && (
              <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-ink-2 sm:text-sm">
                <bdi>{body}</bdi>
              </p>
            )}

            {chips.length > 0 && (
              <ul className="mt-4 flex flex-wrap items-center gap-2">
                {chips.map((c) => (
                  <li
                    key={c}
                    className="rounded-full bg-sunken px-3 py-1.5 text-[12px] font-medium text-ink-2"
                  >
                    <bdi>{c}</bdi>
                  </li>
                ))}
              </ul>
            )}

            {footnote && (
              <p className="label-caps mt-4 border-t border-line pt-3 text-ink-3">
                {footnote}
              </p>
            )}
          </div>
        </div>

        {/* Where the slide leads.
            Pinned to the foot of the sheet rather than left at the end of the
            words, so the way on is in the same place whether the paragraph is
            a line or a page. Each one shuts the sheet on its way: every
            action here moves the shopper into the catalogue, and a sheet left
            standing over it would be covering the thing it just sent them
            to. */}
        {actions.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line bg-sunken/50 px-5 py-3.5">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => {
                  onClose();
                  a.onClick();
                }}
                className={
                  a.primary
                    ? "h-11 flex-1 rounded-full bg-brand px-6 text-sm font-semibold text-on-brand transition hover:bg-brand-deep active:scale-[0.98]"
                    : "h-11 flex-1 rounded-full border border-line-strong px-5 text-sm font-semibold text-ink transition hover:bg-sunken active:scale-[0.98]"
                }
              >
                <bdi>{a.label}</bdi>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
