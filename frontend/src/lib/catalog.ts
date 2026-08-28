// Server-side catalog data access: categories and products in the shared
// Postgres database, so what an admin edits is what every visitor sees.
//
// The database is the source of truth. `data/catalog.json` is only the seed
// for an empty database — once a row exists, the JSON is never read again and
// editing it changes nothing. To start over from the JSON, empty both tables
// (`TRUNCATE products, categories RESTART IDENTITY;`) and reload.

import seedData from "@/data/catalog.json";
import { getPool, ensureSchema, query } from "./db";
import { backfillProductCategories } from "./classifyProducts";
import {
  Category,
  Product,
  ProductInput,
  ProductVariant,
  ProductCategory,
} from "@/types";

export class CatalogError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

// ── Field limits ────────────────────────────────────────────────────
// Long enough for real copy, short enough that a column can't be used as a
// dumping ground. `image_url` is the outlier: uploads arrive as base64 data
// URLs, which the admin downscales before sending (see ProductModal).
const MAX_NAME = 300;
const MAX_TEXT = 5000;
const MAX_IMAGE_URL = 3_000_000;
/** Enough for every size, shade or flavour a real product comes in. */
const MAX_VARIANTS = 40;

function text(v: unknown, max = MAX_TEXT): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

// ── Row mapping ─────────────────────────────────────────────────────

type Row = Record<string, unknown>;

/** Empty strings are absent copy — the storefront falls back on them. */
function opt(v: unknown): string | undefined {
  const s = typeof v === "string" ? v : "";
  return s === "" ? undefined : s;
}

function mapProduct(r: Row): Product {
  return {
    id: Number(r.id),
    name: String(r.name),
    code: String(r.code),
    price: num(r.price),
    old_price: r.old_price == null ? undefined : num(r.old_price),
    image_url: String(r.image_url ?? ""),
    category_id: Number(r.category_id),
    description: opt(r.description),
    benefits: opt(r.benefits),
    ingredients: opt(r.ingredients),
    usage: opt(r.usage),
    name_ar: opt(r.name_ar),
    description_ar: opt(r.description_ar),
    benefits_ar: opt(r.benefits_ar),
    ingredients_ar: opt(r.ingredients_ar),
    usage_ar: opt(r.usage_ar),
    stock: r.stock == null ? undefined : Number(r.stock),
    variants: mapVariants(r.variants),
    product_category_id:
      r.product_category_id == null ? undefined : Number(r.product_category_id),
  };
}

function mapProductCategory(r: Row): ProductCategory {
  return {
    id: Number(r.id),
    name: String(r.name),
    name_ar: opt(r.name_ar),
    display_order: Number(r.display_order),
  };
}

/**
 * The stored options, defensively. `jsonb` comes back already parsed, but a
 * row written before the column existed — or by hand — could hold anything,
 * and a malformed option must not take the whole catalog down.
 */
function mapVariants(v: unknown): ProductVariant[] | undefined {
  if (!Array.isArray(v) || v.length === 0) return undefined;
  const out: ProductVariant[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : "";
    const name = typeof r.name === "string" ? r.name : "";
    if (!id || !name) continue;
    out.push({
      id,
      name,
      name_ar: opt(r.name_ar),
      code: opt(r.code),
      price: r.price == null ? undefined : num(r.price),
      old_price: r.old_price == null ? undefined : num(r.old_price),
      stock: r.stock == null ? undefined : Number(r.stock),
    });
  }
  return out.length > 0 ? out : undefined;
}

// The order of the columns every product query selects and every write sets.
const PRODUCT_FIELDS = [
  "name",
  "code",
  "price",
  "old_price",
  "image_url",
  "category_id",
  "description",
  "benefits",
  "ingredients",
  '"usage"',
  "name_ar",
  "description_ar",
  "benefits_ar",
  "ingredients_ar",
  "usage_ar",
  "stock",
  "variants",
  "product_category_id",
] as const;

const PRODUCT_COLUMNS = `id, ${PRODUCT_FIELDS.join(", ")}`;

/** The values for PRODUCT_FIELDS, in the same order. */
function productValues(p: ProductInput): unknown[] {
  return [
    p.name,
    p.code,
    p.price,
    p.old_price ?? null,
    p.image_url,
    p.category_id,
    p.description ?? "",
    p.benefits ?? "",
    p.ingredients ?? "",
    p.usage ?? "",
    p.name_ar ?? "",
    p.description_ar ?? "",
    p.benefits_ar ?? "",
    p.ingredients_ar ?? "",
    p.usage_ar ?? "",
    p.stock ?? null,
    // pg serialises this into the jsonb column; an empty array is the
    // "sold as itself" case and matches the column default.
    JSON.stringify(p.variants ?? []),
    p.product_category_id ?? null,
  ];
}

// ── Validation ──────────────────────────────────────────────────────

/**
 * An uploaded image is a base64 data URL living in the product row. Slicing an
 * over-long one to fit — the way every other field is handled — would store a
 * truncated, unreadable image, so this refuses instead of trimming.
 */
function imageUrl(v: unknown): string {
  if (typeof v !== "string") return "";
  const s = v.trim();
  if (s.length > MAX_IMAGE_URL)
    throw new CatalogError(
      "That image is too large. Pick a smaller one and try again.",
      413,
    );
  return s;
}

/** A number field on an option: blank / absent / unparseable all mean "inherit". */
function optionalNum(v: unknown): number | undefined {
  if (v === "" || v == null) return undefined;
  const n = num(v, NaN);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * The options an admin submitted. Nameless rows are dropped rather than
 * rejected — the editor keeps a blank row at the bottom for the next one, and
 * saving with it still empty is not an error. Ids are generated for rows that
 * arrive without one and de-duplicated, because a repeated id would make two
 * options share a cart line.
 */
function validateVariants(v: unknown): ProductVariant[] {
  if (!Array.isArray(v)) return [];
  const out: ProductVariant[] = [];
  const seen = new Set<string>();
  for (const raw of v.slice(0, MAX_VARIANTS)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const name = text(r.name, MAX_NAME);
    if (!name) continue;

    let id = text(r.id, 64);
    if (!id || seen.has(id)) id = `v${out.length + 1}-${Date.now().toString(36)}`;
    seen.add(id);

    const price = optionalNum(r.price);
    const old_price = optionalNum(r.old_price);
    const stock = optionalNum(r.stock);
    if (price !== undefined && price < 0)
      throw new CatalogError(`The price for "${name}" is invalid.`);
    if (old_price !== undefined && old_price < 0)
      throw new CatalogError(`The old price for "${name}" is invalid.`);

    out.push({
      id,
      name,
      name_ar: text(r.name_ar, MAX_NAME) || undefined,
      code: text(r.code, 60).toUpperCase() || undefined,
      price,
      old_price,
      stock: stock === undefined ? undefined : Math.max(0, Math.floor(stock)),
    });
  }
  return out;
}

export function validateProduct(body: unknown): ProductInput {
  if (!body || typeof body !== "object")
    throw new CatalogError("Invalid request body.");
  const b = body as Record<string, unknown>;

  const name = text(b.name, MAX_NAME);
  if (!name) throw new CatalogError("Product name is required.");
  const code = text(b.code, 60).toUpperCase();
  if (!code) throw new CatalogError("Product code is required.");
  const price = num(b.price, NaN);
  if (!Number.isFinite(price) || price < 0)
    throw new CatalogError("Product price is invalid.");

  // The "was" price of an offer. Blank / absent / unparseable all mean "no
  // offer"; so does a number that isn't above the price actually charged,
  // since a struck-through price no higher than the real one says nothing.
  const oldPriceRaw = num(b.old_price, NaN);
  const old_price =
    b.old_price === "" || b.old_price == null || !Number.isFinite(oldPriceRaw)
      ? undefined
      : oldPriceRaw;
  if (old_price !== undefined && old_price < 0)
    throw new CatalogError("The old price is invalid.");
  const category_id = Math.floor(num(b.category_id, 0));
  if (category_id < 1) throw new CatalogError("Pick a category.");

  // Absent / blank / non-numeric all mean "not tracked"; a real number is
  // clamped at zero so stock can never go negative.
  const stock =
    b.stock === "" || b.stock == null || !Number.isFinite(num(b.stock, NaN))
      ? undefined
      : Math.max(0, Math.floor(num(b.stock, 0)));

  return {
    name,
    code,
    price,
    old_price,
    image_url: imageUrl(b.image_url),
    category_id,
    description: text(b.description),
    benefits: text(b.benefits),
    ingredients: text(b.ingredients),
    usage: text(b.usage),
    name_ar: text(b.name_ar, MAX_NAME),
    description_ar: text(b.description_ar),
    benefits_ar: text(b.benefits_ar),
    ingredients_ar: text(b.ingredients_ar),
    usage_ar: text(b.usage_ar),
    stock,
    variants: validateVariants(b.variants),
    // Absent / blank / 0 all mean "not typed yet", which is a normal state.
    product_category_id: Math.floor(num(b.product_category_id, 0)) || undefined,
  };
}

export interface CategoryInput {
  name: string;
  name_ar: string;
  display_order?: number;
}

export function validateCategory(body: unknown): CategoryInput {
  if (!body || typeof body !== "object")
    throw new CatalogError("Invalid request body.");
  const b = body as Record<string, unknown>;
  const name = text(b.name, MAX_NAME);
  if (!name) throw new CatalogError("Category name is required.");
  const display_order = Math.floor(num(b.display_order, 0));
  return {
    name,
    name_ar: text(b.name_ar, MAX_NAME),
    display_order: display_order > 0 ? display_order : undefined,
  };
}

// ── Seeding (once per database) ─────────────────────────────────────

interface SeedCategory {
  id: number;
  name: string;
  name_ar?: string;
  display_order: number;
  products: Product[];
}

let seedPromise: Promise<void> | null = null;

/**
 * Fills an empty catalog from the bundled JSON. Takes an advisory lock so two
 * cold serverless instances starting at once can't both seed, and does
 * nothing at all once a single category row exists.
 */
async function seedCatalog(): Promise<void> {
  const probe = await query<{ n: string }>("SELECT COUNT(*) AS n FROM categories");
  if (Number(probe.rows[0].n) > 0) return;

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    // Any constant works as long as every instance uses the same one.
    await client.query("SELECT pg_advisory_xact_lock(724301)");
    const again = await client.query("SELECT COUNT(*) AS n FROM categories");
    if (Number(again.rows[0].n) > 0) {
      await client.query("ROLLBACK");
      return;
    }

    for (const c of seedData as SeedCategory[]) {
      await client.query(
        `INSERT INTO categories (id, name, name_ar, display_order)
         VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
        [c.id, c.name, c.name_ar ?? "", c.display_order],
      );
      for (const p of c.products) {
        const values = productValues({ ...p, category_id: c.id });
        const placeholders = values.map((_, i) => `$${i + 2}`).join(",");
        await client.query(
          `INSERT INTO products (id, ${PRODUCT_FIELDS.join(", ")})
           VALUES ($1,${placeholders}) ON CONFLICT (id) DO NOTHING`,
          [p.id, ...values],
        );
      }
    }

    // The rows above carry explicit ids, which leaves both identity sequences
    // still at 1 — the next insert would collide. Move them past the seed.
    for (const t of ["categories", "products"]) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('${t}', 'id'),
                       (SELECT COALESCE(MAX(id), 0) + 1 FROM ${t}), false)`,
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Schema + seed. Every catalog call goes through this first. */
export function ensureCatalog(): Promise<void> {
  if (!seedPromise) {
    seedPromise = ensureSchema()
      .then(seedCatalog)
      .then(backfillProductCategories)
      .catch((err) => {
        // Don't cache a failure — a transient database blip would otherwise
        // leave this instance permanently unable to serve the catalog.
        seedPromise = null;
        throw err;
      });
  }
  return seedPromise;
}

// ── Reads ───────────────────────────────────────────────────────────

/** The whole catalog: categories in display order, each with its products. */
export async function listCatalog(): Promise<Category[]> {
  await ensureCatalog();
  const [cats, prods] = await Promise.all([
    query<Row>(
      "SELECT id, name, name_ar, display_order FROM categories ORDER BY display_order, id",
    ),
    query<Row>(`SELECT ${PRODUCT_COLUMNS} FROM products ORDER BY id`),
  ]);
  const byCategory = new Map<number, Product[]>();
  for (const r of prods.rows) {
    const p = mapProduct(r);
    const list = byCategory.get(p.category_id);
    if (list) list.push(p);
    else byCategory.set(p.category_id, [p]);
  }
  return cats.rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    name_ar: opt(r.name_ar),
    display_order: Number(r.display_order),
    products: byCategory.get(Number(r.id)) ?? [],
  }));
}

// ── Product writes ──────────────────────────────────────────────────

async function assertCategoryExists(id: number): Promise<void> {
  const res = await query("SELECT 1 FROM categories WHERE id = $1", [id]);
  if (res.rowCount === 0) throw new CatalogError("That category no longer exists.");
}

async function assertCodeFree(code: string, exceptId?: number): Promise<void> {
  const res = await query<Row>(
    "SELECT id FROM products WHERE code = $1 AND ($2::int IS NULL OR id <> $2)",
    [code, exceptId ?? null],
  );
  if (res.rowCount > 0)
    throw new CatalogError(`Product code "${code}" is already in use.`, 409);
}

export async function createProduct(input: ProductInput): Promise<Product> {
  await ensureCatalog();
  await assertCategoryExists(input.category_id);
  await assertCodeFree(input.code);
  const values = productValues(input);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(",");
  const res = await query<Row>(
    `INSERT INTO products (${PRODUCT_FIELDS.join(", ")})
     VALUES (${placeholders}) RETURNING ${PRODUCT_COLUMNS}`,
    values,
  );
  return mapProduct(res.rows[0]);
}

/** Replaces every field of a product — the admin form always sends them all. */
export async function updateProduct(
  id: number,
  input: ProductInput,
): Promise<Product | null> {
  await ensureCatalog();
  await assertCategoryExists(input.category_id);
  await assertCodeFree(input.code, id);
  const values = productValues(input);
  const assignments = PRODUCT_FIELDS.map((f, i) => `${f} = $${i + 2}`).join(", ");
  const res = await query<Row>(
    `UPDATE products SET ${assignments} WHERE id = $1 RETURNING ${PRODUCT_COLUMNS}`,
    [id, ...values],
  );
  return res.rows[0] ? mapProduct(res.rows[0]) : null;
}

export async function deleteProduct(id: number): Promise<boolean> {
  await ensureCatalog();
  const res = await query("DELETE FROM products WHERE id = $1", [id]);
  return res.rowCount > 0;
}

// ── Product categories (the product type: Serum, Cleanser, …) ───────

export async function listProductCategories(): Promise<ProductCategory[]> {
  await ensureCatalog();
  const res = await query<Row>(
    "SELECT id, name, name_ar, display_order FROM product_categories ORDER BY display_order, id",
  );
  return res.rows.map(mapProductCategory);
}

export async function createProductCategory(
  input: CategoryInput,
): Promise<ProductCategory> {
  await ensureCatalog();
  const clash = await query(
    "SELECT 1 FROM product_categories WHERE lower(name) = lower($1)",
    [input.name],
  );
  if (clash.rowCount > 0)
    throw new CatalogError(`Category "${input.name}" already exists.`, 409);

  let order = input.display_order;
  if (!order) {
    const max = await query<Row>(
      "SELECT COALESCE(MAX(display_order), 0) AS m FROM product_categories",
    );
    order = Number(max.rows[0].m) + 1;
  }
  const res = await query<Row>(
    `INSERT INTO product_categories (name, name_ar, display_order)
     VALUES ($1,$2,$3) RETURNING id, name, name_ar, display_order`,
    [input.name, input.name_ar, order],
  );
  return mapProductCategory(res.rows[0]);
}

export async function updateProductCategory(
  id: number,
  input: CategoryInput,
): Promise<ProductCategory | null> {
  await ensureCatalog();
  const clash = await query(
    "SELECT 1 FROM product_categories WHERE lower(name) = lower($1) AND id <> $2",
    [input.name, id],
  );
  if (clash.rowCount > 0)
    throw new CatalogError(`Category "${input.name}" already exists.`, 409);

  const res = await query<Row>(
    `UPDATE product_categories SET name = $2, name_ar = $3,
            display_order = COALESCE($4, display_order)
     WHERE id = $1 RETURNING id, name, name_ar, display_order`,
    [id, input.name, input.name_ar, input.display_order ?? null],
  );
  return res.rows[0] ? mapProductCategory(res.rows[0]) : null;
}

/**
 * Deleting a category does not delete its products — the column is
 * ON DELETE SET NULL, so they simply go back to being untyped.
 */
export async function deleteProductCategory(id: number): Promise<boolean> {
  await ensureCatalog();
  const res = await query("DELETE FROM product_categories WHERE id = $1", [id]);
  return res.rowCount > 0;
}

// ── Category writes ─────────────────────────────────────────────────

export async function createCategory(input: CategoryInput): Promise<Category> {
  await ensureCatalog();
  const clash = await query("SELECT 1 FROM categories WHERE lower(name) = lower($1)", [
    input.name,
  ]);
  if (clash.rowCount > 0)
    throw new CatalogError(`Category "${input.name}" already exists.`, 409);

  let order = input.display_order;
  if (!order) {
    const max = await query<Row>(
      "SELECT COALESCE(MAX(display_order), 0) AS m FROM categories",
    );
    order = Number(max.rows[0].m) + 1;
  }
  const res = await query<Row>(
    `INSERT INTO categories (name, name_ar, display_order)
     VALUES ($1,$2,$3) RETURNING id, name, name_ar, display_order`,
    [input.name, input.name_ar, order],
  );
  const r = res.rows[0];
  return {
    id: Number(r.id),
    name: String(r.name),
    name_ar: opt(r.name_ar),
    display_order: Number(r.display_order),
    products: [],
  };
}

export async function updateCategory(
  id: number,
  input: CategoryInput,
): Promise<Category | null> {
  await ensureCatalog();
  const clash = await query(
    "SELECT 1 FROM categories WHERE lower(name) = lower($1) AND id <> $2",
    [input.name, id],
  );
  if (clash.rowCount > 0)
    throw new CatalogError(`Category "${input.name}" already exists.`, 409);

  const res = await query<Row>(
    `UPDATE categories SET name = $2, name_ar = $3,
            display_order = COALESCE($4, display_order)
     WHERE id = $1 RETURNING id, name, name_ar, display_order`,
    [id, input.name, input.name_ar, input.display_order ?? null],
  );
  const r = res.rows[0];
  if (!r) return null;
  const prods = await query<Row>(
    `SELECT ${PRODUCT_COLUMNS} FROM products WHERE category_id = $1 ORDER BY id`,
    [id],
  );
  return {
    id: Number(r.id),
    name: String(r.name),
    name_ar: opt(r.name_ar),
    display_order: Number(r.display_order),
    products: prods.rows.map(mapProduct),
  };
}

export async function deleteCategory(id: number): Promise<boolean> {
  await ensureCatalog();
  const held = await query("SELECT 1 FROM products WHERE category_id = $1 LIMIT 1", [
    id,
  ]);
  if (held.rowCount > 0)
    throw new CatalogError("Move or delete its products first.", 409);
  const res = await query("DELETE FROM categories WHERE id = $1", [id]);
  return res.rowCount > 0;
}
