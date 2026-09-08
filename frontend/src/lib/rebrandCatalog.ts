// One-time: take AL-MASA out of the product copy the shop was seeded with.
//
// Every product description was generated with the shop's name in it —
// "Authentic skincare product from AL-MASA catalog: …", and the Arabic twin
// "منتج عالي الجودة من كتالوج مكتب الماسة: …". The rename rewrote
// data/catalog.json, but that file only ever seeds an EMPTY database (see
// seedCatalog in lib/catalog.ts), so every row seeded before the rename still
// reads AL-MASA no matter what the file says.
//
// scripts/rebrand-catalog.mjs does this by hand against a DATABASE_URL. This
// does the same thing on the next deploy, so finishing a rename does not
// depend on somebody having the connection string.
//
// Two guarantees, the pair backfillProductCategories makes as well:
//
//   • It only rewrites the exact phrases below, only in the two description
//     columns, and only in rows that still contain one. Everything else in a
//     description — including one an admin has rewritten by hand — comes
//     through untouched, because REPLACE leaves what it does not match.
//   • It runs once. A marker in app_settings records that it has happened, so
//     a shop that deliberately types the old name somewhere later — a note
//     about what it used to be called — does not have it taken back out on
//     the next deploy.

import { query } from "./db";
import { getSetting, setSetting } from "./settings";

const DONE_FLAG = "catalog_rebranded_velina";

/**
 * Longest first. The order is load-bearing: "AL-MASA catalog" has to be
 * matched before the bare "AL-MASA" sitting inside it, or the first rule
 * would never see the phrase it is for.
 */
const PHRASES: [string, string][] = [
  ["AL-MASA catalog", "velina catalog"],
  ["مكتب الماسة", "فيلينا"],
  ["AL-MASA", "velina"],
];

/** The only columns that ever carried the name — 160 products, one each. */
const COLUMNS = ["description", "description_ar"] as const;

/** REPLACE() chained over every phrase, the first pair applied innermost. */
function rewritten(column: string): string {
  return PHRASES.reduce(
    (expr, _pair, i) => `REPLACE(${expr}, $${i * 2 + 1}, $${i * 2 + 2})`,
    column,
  );
}

export async function rebrandCatalogCopy(): Promise<void> {
  if (await getSetting(DONE_FLAG)) return;

  const params = PHRASES.flat();
  const set = COLUMNS.map((c) => `${c} = ${rewritten(c)}`).join(", ");
  // Restricted to the rows the rewrite would actually change, so a shop whose
  // copy is already clean writes nothing at all.
  const stale = COLUMNS.map((c) => `${c} <> ${rewritten(c)}`).join(" OR ");

  const res = await query(`UPDATE products SET ${set} WHERE ${stale}`, params);
  if (res.rowCount > 0) {
    console.log(`Rebranded ${res.rowCount} product description(s) to velina.`);
  }
  await setSetting(DONE_FLAG, new Date().toISOString());
}
