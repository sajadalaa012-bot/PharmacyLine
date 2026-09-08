// Server-side data access and validation for packages - a set of catalog
// products sold together for one price the shop sets by hand.
//
// Nothing the client sends is trusted: copy is trimmed and capped, the price
// has to be a real number, and the contents are reduced to {product_id,
// quantity} pairs whatever shape they arrived in. Product ids are NOT checked
// against the catalog here on purpose: a package points at the catalog rather
// than owning any of it, and a line whose product has since been deleted is
// dropped when the contents are resolved (see packageContents in types).

import { connect, ensureSchema, query } from "./db";
import { Package, PackageInput, PackageItem } from "@/types";

export class PackageError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

// ── Field limits ────────────────────────────────────────────────────
// Mirrors lib/catalog.ts: long enough for real copy, short enough that a
// column can't be used as a dumping ground. image_url is the outlier -
// uploads arrive as base64 data URLs, downscaled by the admin before sending.
const MAX_NAME = 300;
const MAX_TEXT = 5000;
const MAX_IMAGE_URL = 3_000_000;
/** More than any real kit holds, and a ceiling on what one row can carry. */
const MAX_ITEMS = 60;
/** Nobody sells sixty of one thing inside a package; a typo, not an order. */
const MAX_ITEM_QTY = 99;

function text(v: unknown, max = MAX_TEXT): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

/** Empty strings are absent copy - the storefront falls back on them. */
function opt(v: unknown): string | undefined {
  const s = typeof v === "string" ? v : "";
  return s === "" ? undefined : s;
}

// ── Row mapping ─────────────────────────────────────────────────────

type Row = Record<string, unknown>;

/**
 * The stored contents, defensively. `jsonb` comes back already parsed, but a
 * row written by hand could hold anything, and one malformed line must not
 * take the whole storefront down.
 */
function mapItems(v: unknown): PackageItem[] {
  if (!Array.isArray(v)) return [];
  const out: PackageItem[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const product_id = Math.floor(num(r.product_id, 0));
    if (!product_id) continue;
    out.push({
      product_id,
      quantity: Math.min(MAX_ITEM_QTY, Math.max(1, Math.floor(num(r.quantity, 1)))),
    });
  }
  return out;
}

function mapPackage(r: Row): Package {
  return {
    id: Number(r.id),
    name: String(r.name),
    name_ar: opt(r.name_ar),
    description: opt(r.description),
    description_ar: opt(r.description_ar),
    image_url: String(r.image_url ?? ""),
    image_url_mobile: opt(r.image_url_mobile),
    price: num(r.price),
    old_price: r.old_price == null ? undefined : num(r.old_price),
    active: r.active === true,
    display_order: Number(r.display_order ?? 0),
    items: mapItems(r.items),
  };
}

// The order of the columns every package query selects and every write sets.
const PACKAGE_FIELDS = [
  "name",
  "name_ar",
  "description",
  "description_ar",
  "image_url",
  "image_url_mobile",
  "price",
  "old_price",
  "active",
  "display_order",
  "items",
] as const;

const PACKAGE_COLUMNS = `id, ${PACKAGE_FIELDS.join(", ")}`;

/** The values for PACKAGE_FIELDS, in the same order. */
function packageValues(p: PackageInput): unknown[] {
  return [
    p.name,
    p.name_ar ?? "",
    p.description ?? "",
    p.description_ar ?? "",
    p.image_url,
    p.image_url_mobile ?? "",
    p.price,
    p.old_price ?? null,
    p.active,
    p.display_order,
    // pg serialises this into the jsonb column.
    JSON.stringify(p.items),
  ];
}

// ── Validation ──────────────────────────────────────────────────────

/**
 * An uploaded image is a base64 data URL living in the package row. Slicing
 * an over-long one to fit - the way every other field is handled - would
 * store a truncated, unreadable image, so this refuses instead of trimming.
 */
function imageUrl(v: unknown): string {
  if (typeof v !== "string") return "";
  const s = v.trim();
  if (s.length > MAX_IMAGE_URL)
    throw new PackageError(
      "That image is too large. Pick a smaller one and try again.",
      413,
    );
  return s;
}

/**
 * The contents an admin submitted. Lines without a product are dropped rather
 * than rejected - the editor lets you add a row before picking what goes in
 * it, and saving with one still empty is not an error. A product listed twice
 * is merged into one line, because two lines for the same thing would show
 * the shopper the same item twice.
 */
function validateItems(v: unknown): PackageItem[] {
  if (!Array.isArray(v)) return [];
  const merged = new Map<number, number>();
  for (const raw of v.slice(0, MAX_ITEMS)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const product_id = Math.floor(num(r.product_id, 0));
    if (product_id <= 0) continue;
    const quantity = Math.max(1, Math.floor(num(r.quantity, 1)));
    merged.set(
      product_id,
      Math.min(MAX_ITEM_QTY, (merged.get(product_id) ?? 0) + quantity),
    );
  }
  return [...merged].map(([product_id, quantity]) => ({ product_id, quantity }));
}

export function validatePackage(body: unknown): PackageInput {
  if (!body || typeof body !== "object")
    throw new PackageError("Invalid request body.");
  const b = body as Record<string, unknown>;

  const name = text(b.name, MAX_NAME);
  if (!name) throw new PackageError("A package name is required.");

  const price = num(b.price, NaN);
  if (!Number.isFinite(price) || price < 0)
    throw new PackageError("The package price must be a valid positive number.");

  // Blank = no offer. A "was" price is only a saving when it is above what
  // the package actually sells for; anything else is a typo, not a discount.
  const rawOld = b.old_price;
  const old_price =
    rawOld === "" || rawOld == null ? undefined : num(rawOld, NaN);
  if (old_price !== undefined) {
    if (!Number.isFinite(old_price) || old_price < 0)
      throw new PackageError("The old price must be a valid positive number.");
    if (old_price <= price)
      throw new PackageError(
        "The old price has to be higher than the package price.",
      );
  }

  return {
    name,
    name_ar: text(b.name_ar, MAX_NAME) || undefined,
    description: text(b.description) || undefined,
    description_ar: text(b.description_ar) || undefined,
    image_url: imageUrl(b.image_url),
    image_url_mobile: imageUrl(b.image_url_mobile) || undefined,
    price,
    old_price,
    active: b.active === true,
    display_order: Math.max(0, Math.floor(num(b.display_order, 0))),
    items: validateItems(b.items),
  };
}

// ── Seeding (once per database) ─────────────────────────────────────

/**
 * The packages a new shop opens with - ready to sell rather than blank, so
 * the home page has something on it the day the feature lands.
 *
 * `old_price` is each kit's contents at the catalogue's own prices, and the
 * price under it is the shop's. The product ids are the seeded catalogue's
 * (data/catalog.json), which carries explicit ids, so they are stable; an id
 * that has since been deleted simply drops out of the contents rather than
 * breaking the package. Everything here is the shop's to re-price, re-fill or
 * delete - this is a starting point, not a fixture.
 */
const STARTER_PACKAGES: (Omit<PackageInput, "display_order"> & {
  name_ar: string;
})[] = [
  {
    // Teenage skin, four steps: wash, patch, spot-treat, protect.
    name: "Back to School",
    name_ar: "العودة إلى المدرسة",
    description: "A simple morning and night routine for teenage skin.",
    description_ar: "روتين بسيط صباحاً ومساءً لبشرة المراهقين.",
    image_url: "",
    price: 37000,
    old_price: 44250,
    active: true,
    items: [
      { product_id: 98, quantity: 1 }, // COSRX Low pH Good Morning Cleanser
      { product_id: 95, quantity: 1 }, // COSRX Acne Pimple Master Patch
      { product_id: 52, quantity: 1 }, // La Roche-Posay Effaclar Duo+ M
      { product_id: 99, quantity: 1 }, // COSRX Aloe Soothing Sun SPF 50+
    ],
  },
  {
    // Busy adult skin: pores and oil under control, and never skip the SPF.
    name: "College",
    name_ar: "الجامعة",
    description: "Clear pores, steady hydration, and sunscreen every day.",
    description_ar: "مسام نظيفة، ترطيب ثابت، وواقٍ شمسي كل يوم.",
    image_url: "",
    price: 55000,
    old_price: 66000,
    active: true,
    items: [
      { product_id: 69, quantity: 1 }, // SKIN1004 Centella Ampoule Foam
      { product_id: 124, quantity: 1 }, // The Ordinary Niacinamide 10% + Zinc
      { product_id: 100, quantity: 1 }, // COSRX Snail 96 Mucin Essence
      { product_id: 59, quantity: 1 }, // Beauty of Joseon Relief Sun
      { product_id: 95, quantity: 1 }, // COSRX Acne Pimple Master Patch
    ],
  },
  {
    // The routine the shop gets asked for by name, in one box.
    name: "Glass Skin Starter",
    name_ar: "بداية البشرة الصافية",
    description: "The full K-beauty routine, from double cleanse to SPF.",
    description_ar: "روتين الكيبيوتي الكامل، من التنظيف المزدوج حتى واقي الشمس.",
    image_url: "",
    price: 63000,
    old_price: 76500,
    active: true,
    items: [
      { product_id: 63, quantity: 1 }, // Beauty of Joseon Cleansing Oil
      { product_id: 69, quantity: 1 }, // SKIN1004 Centella Ampoule Foam
      { product_id: 62, quantity: 1 }, // Beauty of Joseon Ginseng Toner
      { product_id: 100, quantity: 1 }, // COSRX Snail 96 Mucin Essence
      { product_id: 59, quantity: 1 }, // Beauty of Joseon Relief Sun
    ],
  },
];

/**
 * Set once the starters have been offered, so deleting one is permanent.
 *
 * Bumped to v2 when the starters went from empty placeholders to real,
 * priced kits. The v1 flag is left in place; nothing reads it any more.
 */
const SEED_FLAG = "packages_seeded_v2";

/** The v1 starters, which were seeded blank. Cleared by seedPackages below. */
const V1_STARTER_NAMES = ["Back to School", "College"];

let seedPromise: Promise<void> | null = null;

/**
 * Puts the starter packages in an empty table, exactly once per database.
 *
 * Guarded by a flag in app_settings rather than by the table being empty: an
 * admin who deletes them all should get an empty Packages page, not the set
 * back on the next cold start. The advisory lock is there because cold starts
 * arrive in bursts and two instances must not both seed.
 */
async function seedPackages(): Promise<void> {
  const probe = await query<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = $1",
    [SEED_FLAG],
  );
  if (probe.rows.length > 0) return;

  const client = await connect();
  try {
    await client.query("BEGIN");
    // Any constant works as long as every instance uses the same one.
    await client.query("SELECT pg_advisory_xact_lock(724303)");
    const again = await client.query(
      "SELECT value FROM app_settings WHERE key = $1",
      [SEED_FLAG],
    );
    if (again.rows.length > 0) {
      await client.query("ROLLBACK");
      return;
    }

    // v1 seeded "Back to School" and "College" as blank placeholders. If they
    // are still exactly as they were seeded - no price, nothing in them, never
    // switched on - they are this code's own leftovers rather than anything
    // the shop typed, and the priced versions below replace them. Every
    // condition has to hold, so a placeholder somebody has started filling in
    // is left alone and blocks the seed on the count check that follows.
    await client.query(
      `DELETE FROM packages
       WHERE name = ANY($1::text[])
         AND price = 0
         AND old_price IS NULL
         AND NOT active
         AND items = '[]'::jsonb
         AND image_url = ''
         AND description = ''`,
      [V1_STARTER_NAMES],
    );

    // Never overwrite a table someone has already put packages in - the flag
    // could be missing on a database that predates it.
    const count = await client.query<{ n: string }>(
      "SELECT COUNT(*) AS n FROM packages",
    );
    if (Number(count.rows[0].n) === 0) {
      for (const [i, p] of STARTER_PACKAGES.entries()) {
        const values = packageValues({ ...p, display_order: i + 1 });
        const placeholders = values.map((_, n) => `$${n + 1}`).join(",");
        await client.query(
          `INSERT INTO packages (${PACKAGE_FIELDS.join(", ")})
           VALUES (${placeholders})`,
          values,
        );
      }
    }

    await client.query(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ($1, 'true', now())
       ON CONFLICT (key) DO NOTHING`,
      [SEED_FLAG],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Schema + seed. Every package call goes through this first. */
function ensurePackages(): Promise<void> {
  if (!seedPromise) {
    seedPromise = ensureSchema()
      .then(seedPackages)
      .catch((err) => {
        // Don't cache a failure - a transient database blip would otherwise
        // leave this instance permanently unable to serve packages.
        seedPromise = null;
        throw err;
      });
  }
  return seedPromise;
}

// ── Reads ───────────────────────────────────────────────────────────

/** Every package in display order. `activeOnly` is what the storefront asks for. */
export async function listPackages(activeOnly = false): Promise<Package[]> {
  await ensurePackages();
  const { rows } = await query<Row>(
    `SELECT ${PACKAGE_COLUMNS} FROM packages
     ${activeOnly ? "WHERE active" : ""}
     ORDER BY display_order, id`,
  );
  return rows.map(mapPackage);
}

// ── Writes ──────────────────────────────────────────────────────────

export async function createPackage(input: PackageInput): Promise<Package> {
  await ensurePackages();
  const values = packageValues(input);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(",");
  const { rows } = await query<Row>(
    `INSERT INTO packages (${PACKAGE_FIELDS.join(", ")})
     VALUES (${placeholders})
     RETURNING ${PACKAGE_COLUMNS}`,
    values,
  );
  return mapPackage(rows[0]);
}

export async function updatePackage(
  id: number,
  input: PackageInput,
): Promise<Package | null> {
  await ensurePackages();
  const values = packageValues(input);
  const assignments = PACKAGE_FIELDS.map((f, i) => `${f} = $${i + 2}`).join(", ");
  const { rows } = await query<Row>(
    `UPDATE packages SET ${assignments}
     WHERE id = $1
     RETURNING ${PACKAGE_COLUMNS}`,
    [id, ...values],
  );
  return rows[0] ? mapPackage(rows[0]) : null;
}

export async function deletePackage(id: number): Promise<boolean> {
  await ensurePackages();
  const { rowCount } = await query("DELETE FROM packages WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}
