// Server-side read and write for the home deck - the slideshow's own copy.
//
// One row in app_settings holding JSON, rather than a table: it is a single
// record that is always read and written whole, and it is configuration
// rather than catalogue. See lib/settings.ts.

import { getSetting, setSetting } from "./settings";
import { DeckSlide, DEFAULT_DECK, HomeDeck } from "@/types";

export class DeckError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const KEY = "home_deck";

/** Long enough for a real headline, short enough to stay a headline. */
const MAX_LINE = 300;
/** The lede under it - a sentence or two, not an essay. */
const MAX_BODY = 1000;
/** An uploaded photo arrives as a base64 data URL, downscaled by the editor.
 *  Matches the ceiling a product image gets - see lib/catalog.ts. */
const MAX_IMAGE_URL = 3_000_000;

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/**
 * A stored photo. Dropped whole when it is too big rather than sliced to fit:
 * half a data URL is a broken image, not a small one. saveHomeDeck refuses an
 * over-long one outright first, so this only catches a row already on disk.
 */
function image(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > MAX_IMAGE_URL ? "" : s;
}

/** Anything unreadable falls back to the field's default rather than failing. */
function slide(v: unknown, fallback: DeckSlide): DeckSlide {
  const r = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    // Only an explicit false switches a slide off, so a stored record written
    // before this field existed keeps the slide.
    enabled: r.enabled !== false,
    image_url: image(r.image_url) || fallback.image_url,
    image_url_mobile:
      image(r.image_url_mobile) || fallback.image_url_mobile,
    eyebrow: text(r.eyebrow, MAX_LINE) || fallback.eyebrow,
    eyebrow_ar: text(r.eyebrow_ar, MAX_LINE) || fallback.eyebrow_ar,
    title: text(r.title, MAX_LINE) || fallback.title,
    title_ar: text(r.title_ar, MAX_LINE) || fallback.title_ar,
    body: text(r.body, MAX_BODY) || fallback.body,
    body_ar: text(r.body_ar, MAX_BODY) || fallback.body_ar,
  };
}

function percent(v: unknown): number {
  const n = typeof v === "string" ? parseInt(v, 10) : (v as number);
  if (!Number.isFinite(n)) return DEFAULT_DECK.offer.percent;
  // A discount of 0% is not an advertisement and one of 100% is not a shop.
  return Math.min(99, Math.max(1, Math.round(n)));
}

/**
 * Reads whatever is stored and fills in the rest from the defaults. Never
 * throws and never returns a partial record: a malformed row - hand-edited,
 * or written by an older build - has to degrade into today's deck rather
 * than take the storefront down.
 */
export function parseDeck(raw: unknown): HomeDeck {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const brief = (r.brief ?? {}) as Record<string, unknown>;
  const offer = (r.offer ?? {}) as Record<string, unknown>;
  return {
    brief: {
      ...slide(brief, DEFAULT_DECK.brief),
      stats: brief.stats !== false,
    },
    offer: {
      ...slide(offer, DEFAULT_DECK.offer),
      percent: percent(offer.percent),
    },
  };
}

export async function getHomeDeck(): Promise<HomeDeck> {
  const stored = await getSetting(KEY);
  if (!stored) return DEFAULT_DECK;
  try {
    return parseDeck(JSON.parse(stored));
  } catch {
    // Unparseable JSON is the same case as a malformed record.
    return DEFAULT_DECK;
  }
}

/** Validates through parseDeck, so only a well-formed record is ever stored. */
export async function saveHomeDeck(input: unknown): Promise<HomeDeck> {
  // Checked before parsing, because parseDeck would quietly drop an oversized
  // photo and the editor would report a save that lost the picture.
  const r = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >;
  for (const key of ["brief", "offer"] as const) {
    const slide = r[key] as Record<string, unknown> | undefined;
    for (const field of ["image_url", "image_url_mobile"] as const) {
      const url = slide?.[field];
      if (typeof url === "string" && url.length > MAX_IMAGE_URL)
        throw new DeckError(
          "That image is too large. Pick a smaller one and try again.",
          413,
        );
    }
  }
  const deck = parseDeck(input);
  await setSetting(KEY, JSON.stringify(deck));
  return deck;
}
