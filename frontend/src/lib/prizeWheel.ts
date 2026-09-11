// The prize wheel: the shop's configuration, and the one spin each order gets.
//
// Two halves, and they meet on the orders table:
//
//   the configuration  one row in app_settings holding JSON - the prizes and
//                      the price ranges that win them. Read and written whole,
//                      exactly like the home deck. See lib/settings.ts.
//
//   the spin           decided here, on the server, and written onto the order
//                      in the same statement that claims it. The browser is
//                      told what it won and plays the animation that lands
//                      there; it never picks. That is what makes one spin per
//                      order enforceable and a reload harmless.

import { getSetting, setSetting } from "./settings";
import { ensureSchema, query } from "./db";
import { mapPrize } from "./orders";
import {
  DEFAULT_WHEEL,
  OrderPrize,
  WheelConfig,
  WheelPrize,
  WheelTier,
  drawPrize,
  wheelPrizesFor,
} from "@/types";

export class WheelError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const KEY = "prize_wheel";

/** A prize name is a label on a wheel segment, not a paragraph. */
const MAX_NAME = 120;
/** Enough to fill a wheel several times over; past this it stops being one. */
const MAX_PRIZES = 24;
/** More ranges than this is a pricing table, not a promotion. */
const MAX_TIERS = 12;
/** The photo ceiling every other uploaded picture here answers to. */
const MAX_IMAGE_URL = 3_000_000;
/** Weights are relative, so the scale only has to be wide enough to express
 *  "a hundred times rarer". */
const MAX_WEIGHT = 1000;

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Dropped whole when it is too big rather than sliced: half a data URL is a
 *  broken image, not a small one. saveWheel refuses an over-long one first. */
function image(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > MAX_IMAGE_URL ? "" : s;
}

function money(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}

function weight(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_WEIGHT, Math.max(0, Math.round(n)));
}

/** An id the shop's own editor generates; anything unusable gets a new one. */
function id(v: unknown, fallback: string): string {
  const s = text(v, 64).replace(/[^\w-]/g, "");
  return s || fallback;
}

function prize(v: unknown, index: number): WheelPrize | null {
  const r = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const name = text(r.name, MAX_NAME);
  const name_ar = text(r.name_ar, MAX_NAME);
  // A prize with no name at all is a blank segment. Dropped rather than
  // stored, so an empty row left behind in the editor never reaches a wheel.
  if (!name && !name_ar) return null;
  return {
    id: id(r.id, `p${index + 1}`),
    // Either language on its own is enough; localized() falls back to `name`,
    // so an Arabic-only prize needs the Arabic in both fields.
    name: name || name_ar,
    name_ar: name_ar || undefined,
    image_url: image(r.image_url) || undefined,
    weight: weight(r.weight),
  };
}

function tier(v: unknown, index: number, prizeIds: Set<string>): WheelTier {
  const r = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const min_total = money(r.min_total);
  const rawMax = r.max_total;
  const max_total =
    rawMax == null || rawMax === "" ? null : Math.max(min_total, money(rawMax));
  const ids = Array.isArray(r.prize_ids) ? r.prize_ids : [];
  return {
    id: id(r.id, `t${index + 1}`),
    min_total,
    max_total,
    // Only prizes that still exist, and each of them once: a duplicate would
    // be a second segment for the same thing with no way to tell them apart.
    prize_ids: [...new Set(ids.map((v) => text(v, 64)))].filter((pid) =>
      prizeIds.has(pid),
    ),
  };
}

/**
 * Reads whatever is stored and returns a wheel that can be drawn.
 *
 * Never throws and never returns a partial record: a malformed row - hand
 * edited, or written by an older build - degrades into "no wheel" rather than
 * taking the confirmation screen down with it.
 */
export function parseWheel(raw: unknown): WheelConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const prizes = (Array.isArray(r.prizes) ? r.prizes : [])
    .slice(0, MAX_PRIZES)
    .map(prize)
    .filter((p): p is WheelPrize => p !== null);

  // Two prizes sharing an id would make "what did this order win" ambiguous.
  const seen = new Set<string>();
  const unique = prizes.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  const tiers = (Array.isArray(r.tiers) ? r.tiers : [])
    .slice(0, MAX_TIERS)
    .map((v, i) => tier(v, i, seen))
    // Lowest range first, which is the order they are read in and the order
    // the editor shows them in.
    .sort((a, b) => a.min_total - b.min_total);

  return { enabled: r.enabled === true, prizes: unique, tiers };
}

export async function getWheel(): Promise<WheelConfig> {
  const stored = await getSetting(KEY);
  if (!stored) return DEFAULT_WHEEL;
  try {
    return parseWheel(JSON.parse(stored));
  } catch {
    return DEFAULT_WHEEL;
  }
}

/** Validates through parseWheel, so only a well-formed wheel is ever stored. */
export async function saveWheel(input: unknown): Promise<WheelConfig> {
  // Checked before parsing, because parseWheel would quietly drop an oversized
  // photo and the editor would report a save that lost the picture.
  const r = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >;
  for (const raw of Array.isArray(r.prizes) ? r.prizes : []) {
    const url = (raw as Record<string, unknown> | null)?.image_url;
    if (typeof url === "string" && url.length > MAX_IMAGE_URL)
      throw new WheelError(
        "That image is too large. Pick a smaller one and try again.",
        413,
      );
  }
  const wheel = parseWheel(input);
  await setSetting(KEY, JSON.stringify(wheel));
  return wheel;
}

// ── One order's spin ─────────────────────────────────────────────────

/** What the confirmation screen needs to draw a wheel: no weights, because
 *  the odds are the shop's business and the browser never draws on them. */
export interface WheelOffer {
  /** The segments, in the order the shop arranged them. Empty means no wheel:
   *  the wheel is off, or this total matches no range. */
  prizes: { id: string; name: string; name_ar?: string; image_url?: string }[];
  /** Already won, on a screen that has been reloaded or reopened. */
  prize: OrderPrize | null;
}

/**
 * The order behind an id + its secret token, or null if they do not match.
 * Same secret the tracking page uses - see trackOrder in lib/orders.ts.
 *
 * ensureSchema first, and not as ceremony: the prize columns are newer than
 * the orders table, so on an instance that has not bootstrapped yet this
 * select is for columns that do not exist. Every other entry point into the
 * database does the same.
 */
async function orderFor(
  id: number,
  token: string,
): Promise<Record<string, unknown> | null> {
  await ensureSchema();
  const res = await query<Record<string, unknown>>(
    `SELECT grand_total, prize_id, prize_name, prize_name_ar, prize_won_at
       FROM orders WHERE id = $1 AND track_token = $2`,
    [id, token],
  );
  return res.rows[0] ?? null;
}

/**
 * What this order is playing for, and whether it has already played.
 * Returns null when the id and token do not belong together.
 */
export async function wheelFor(
  orderId: number,
  token: string,
): Promise<WheelOffer | null> {
  const row = await orderFor(orderId, token);
  if (!row) return null;
  const won = mapPrize(row) ?? null;
  // An order that has already spun keeps its wheel on screen, so the result
  // card has the segments it landed on behind it.
  const config = await getWheel();
  const prizes = wheelPrizesFor(config, Number(row.grand_total ?? 0)).map((p) => ({
    id: p.id,
    name: p.name,
    name_ar: p.name_ar,
    image_url: p.image_url,
  }));
  return { prizes, prize: won };
}

/**
 * Spin, once.
 *
 * The draw and the claim are one statement: the UPDATE only writes where no
 * prize has been recorded yet, so two taps that arrive together cannot produce
 * two prizes - the second finds nothing to update and is answered with what
 * the first won. A wheel that is off, or a total that matches no range,
 * returns null and nothing is written.
 */
export async function spinOrder(
  orderId: number,
  token: string,
): Promise<{ prize: OrderPrize | null; fresh: boolean } | null> {
  const row = await orderFor(orderId, token);
  if (!row) return null;

  const already = mapPrize(row);
  if (already) return { prize: already, fresh: false };

  const config = await getWheel();
  const prizes = wheelPrizesFor(config, Number(row.grand_total ?? 0));
  const won = drawPrize(prizes);
  if (!won) return { prize: null, fresh: false };

  const res = await query<Record<string, unknown>>(
    `UPDATE orders
        SET prize_id = $3, prize_name = $4, prize_name_ar = $5, prize_won_at = now()
      WHERE id = $1 AND track_token = $2 AND prize_won_at IS NULL
      RETURNING prize_id, prize_name, prize_name_ar, prize_won_at`,
    [orderId, token, won.id, won.name, won.name_ar ?? null],
  );

  if (res.rows[0]) {
    const prize = mapPrize(res.rows[0]) ?? null;
    return { prize, fresh: true };
  }

  // Lost the race: somebody else's tap claimed the spin between the read and
  // the write. Their prize is this order's prize.
  const after = await orderFor(orderId, token);
  return { prize: (after && mapPrize(after)) || null, fresh: false };
}
