// Server-side read and write for the home deck — the slideshow's own copy.
//
// One row in app_settings holding JSON, rather than a table: it is a single
// record that is always read and written whole, and it is configuration
// rather than catalogue. See lib/settings.ts.

import { getSetting, setSetting } from "./settings";
import { DeckSlide, DEFAULT_DECK, HomeDeck } from "@/types";

const KEY = "home_deck";

/** Long enough for a real headline, short enough to stay a headline. */
const MAX_LINE = 300;
/** The lede under it — a sentence or two, not an essay. */
const MAX_BODY = 1000;

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Anything unreadable falls back to the field's default rather than failing. */
function slide(v: unknown, fallback: DeckSlide): DeckSlide {
  const r = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    // Only an explicit false switches a slide off, so a stored record written
    // before this field existed keeps the slide.
    enabled: r.enabled !== false,
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
 * throws and never returns a partial record: a malformed row — hand-edited,
 * or written by an older build — has to degrade into today's deck rather
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
  const deck = parseDeck(input);
  await setSetting(KEY, JSON.stringify(deck));
  return deck;
}
