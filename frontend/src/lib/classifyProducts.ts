// One-time backfill: give every product a type (Serum, Cleanser, Sunscreen…)
// worked out from its own name.
//
// The catalogue was built grouped by brand alone, so when the category filter
// arrived all 160 products had no type. Asking someone to set them one by one
// before the filter did anything useful would be a poor trade, so this makes
// the first pass and the admin corrects whatever it got wrong.
//
// Two guarantees, both of which matter more than the classifying itself:
//
//   • It only ever fills a NULL. A product an admin has already typed is
//     never touched, so re-running cannot undo anyone's work.
//   • It runs once. A marker in app_settings records that it has happened,
//     so a product deliberately cleared back to "no category" stays cleared
//     rather than being re-guessed on the next deploy.

import { query } from "./db";
import { getSetting, setSetting } from "./settings";

const DONE_FLAG = "product_categories_backfilled";

/**
 * The types, in the order they are tried and the order they are shown.
 *
 * Order is load-bearing: a "Sun Cream" is a sunscreen, not a moisturiser, so
 * sunscreen is tested first. The broad ones — cream, serum — come last, after
 * every more specific reading has had its chance.
 */
const TYPES: { name: string; name_ar: string; match: RegExp }[] = [
  {
    name: "Sunscreen",
    name_ar: "واقي شمس",
    match: /sun\s?screen|sun\s?block|\bspf\b|\buv\b|anthelios|relief sun|\bsun\b/i,
  },
  { name: "Hair care", name_ar: "العناية بالشعر", match: /hair|shampoo|scalp|conditioner|dercos/i },
  { name: "Cleanser", name_ar: "غسول", match: /cleans|foam|micellar|face wash|wash gel|purifying gel|\bsoap\b|cleaning/i },
  { name: "Toner", name_ar: "تونر", match: /toner|toning|tonic/i },
  { name: "Mask", name_ar: "ماسك", match: /mask|patch/i },
  { name: "Peeling", name_ar: "مقشر", match: /peel|exfoliat|scrub/i },
  { name: "Eye care", name_ar: "العناية بالعين", match: /\beye\b/i },
  { name: "Lip care", name_ar: "العناية بالشفاه", match: /\blip\b/i },
  // Says outright what it is.
  { name: "Serum", name_ar: "سيروم", match: /serum|ampoule|essence/i },
  // Then the things that name their form. This has to come before the
  // ingredient hints below, or a "Niacinamide Capsule Cream" reads as a serum
  // on the strength of the ingredient and never reaches "cream".
  { name: "Moisturiser", name_ar: "مرطب", match: /cream|moistur|lotion|\bbalm\b|butter|\bgel\b|emulsion|\bfluid\b|\boil\b/i },
  // Last resort: a product named only for what is in it. Anything that got
  // this far has already failed every reading of its form.
  { name: "Serum", name_ar: "سيروم", match: /\bsolution\b|niacinamide|\bacid\b|\bdrops\b/i },
];

/** The type a product name reads as, or null when nothing matches. */
export function classify(name: string): string | null {
  return TYPES.find((t) => t.match.test(name))?.name ?? null;
}

/**
 * Creates the type list and fills in the products that have none. Safe to
 * call on every boot: it does nothing at all after the first run, and never
 * overwrites a type someone has set by hand.
 */
export async function backfillProductCategories(): Promise<void> {
  if (await getSetting(DONE_FLAG)) return;

  // Only ever add to the list — a category the admin renamed or deleted is
  // their decision, so an existing name is left exactly as it is. This also
  // handles TYPES naming a type twice (Serum has a strong pass and a
  // last-resort one): the second mention finds the first already there.
  const existing = await query<{ id: number; name: string }>(
    "SELECT id, name FROM product_categories",
  );
  const byName = new Map(existing.rows.map((r) => [r.name.toLowerCase(), r.id]));

  for (const [i, type] of TYPES.entries()) {
    if (byName.has(type.name.toLowerCase())) continue;
    const res = await query<{ id: number }>(
      `INSERT INTO product_categories (name, name_ar, display_order)
       VALUES ($1,$2,$3) RETURNING id`,
      [type.name, type.name_ar, i + 1],
    );
    byName.set(type.name.toLowerCase(), res.rows[0].id);
  }

  const untyped = await query<{ id: number; name: string }>(
    "SELECT id, name FROM products WHERE product_category_id IS NULL",
  );
  let filled = 0;
  for (const p of untyped.rows) {
    const type = classify(p.name);
    if (!type) continue;
    const categoryId = byName.get(type.toLowerCase());
    if (!categoryId) continue;
    // The NULL check is repeated here on purpose: it is the guarantee that
    // this can never clobber a product typed between the read and the write.
    await query(
      "UPDATE products SET product_category_id = $2 WHERE id = $1 AND product_category_id IS NULL",
      [p.id, categoryId],
    );
    filled++;
  }

  await setSetting(DONE_FLAG, new Date().toISOString());
  console.log(
    `Product categories: created ${TYPES.length} types, typed ${filled} of ${untyped.rowCount} untyped products.`,
  );
}
