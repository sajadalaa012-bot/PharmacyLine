// One-time recovery of catalog edits stranded in this device's browser.
//
// Until the catalog moved into the shared database, the admin wrote products
// and categories to IndexedDB. Edits made in that era — new photos, deleted
// items, price changes — never reached a server, so they are invisible to
// every other device and to the storefront now that it reads the database.
//
// This reads what that build left behind and works out what it would take to
// make the database match. Nothing is written until the admin has seen the
// plan and confirmed it: the local copy is treated as the intended catalog,
// which means it can delete server rows, and a stale device must never be
// able to do that by accident.

import { Category, Product, ProductInput } from "@/types";
import { getAll, STORE } from "./localdb";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  downscaleImage,
} from "./api";

type LocalCategory = Omit<Category, "products">;

/** What this device still holds. Empty when there is nothing to recover. */
export interface LocalCatalog {
  categories: LocalCategory[];
  products: Product[];
}

export async function readLocalCatalog(): Promise<LocalCatalog> {
  if (typeof window === "undefined" || !("indexedDB" in window))
    return { categories: [], products: [] };
  try {
    const [categories, products] = await Promise.all([
      getAll<LocalCategory>(STORE.categories),
      getAll<Product>(STORE.products),
    ]);
    return {
      categories: (categories ?? []).filter((c) => c && typeof c.id === "number"),
      products: (products ?? []).filter((p) => p && typeof p.id === "number"),
    };
  } catch {
    return { categories: [], products: [] };
  }
}

// ── Planning ────────────────────────────────────────────────────────

export interface RecoveryPlan {
  /** On this device but not in the database — will be added. */
  createProducts: Product[];
  /** In both, but the local copy differs — will overwrite the database. */
  updateProducts: { local: Product; server: Product; changed: string[] }[];
  /** In the database but not on this device — will be removed. */
  deleteProducts: Product[];
  /** Local products whose category no longer exists, so they can't be added. */
  skipped: Product[];
  /** True when there is nothing worth confirming. */
  empty: boolean;
}

/**
 * The product fields a recovery carries over.
 *
 * `category_id` is deliberately absent, and categories themselves are never
 * created, renamed or deleted here. A device that predates the brand-by-brand
 * regrouping still holds the old combined categories, and "make the server
 * match this device" would then quietly undo that regrouping — which is not
 * what anyone publishing a photo change is asking for. Each product keeps the
 * category the live shop already has it in.
 */
const COMPARED = [
  "name",
  "code",
  "price",
  "image_url",
  "description",
  "benefits",
  "ingredients",
  "usage",
  "name_ar",
  "description_ar",
  "benefits_ar",
  "ingredients_ar",
  "usage_ar",
  "stock",
] as const;

function differing(local: Product, server: Product): string[] {
  return COMPARED.filter((k) => {
    const a = local[k] ?? "";
    const b = server[k] ?? "";
    return String(a) !== String(b);
  });
}

/** Works out what would have to change for the database to match this device. */
export async function planRecovery(): Promise<{
  local: LocalCatalog;
  server: Category[];
  plan: RecoveryPlan;
}> {
  const [local, server] = await Promise.all([readLocalCatalog(), fetchProducts()]);
  const serverProducts = server.flatMap((c) => c.products);
  const serverCategoryIds = new Set(server.map((c) => c.id));

  // Ids line up because both stores were seeded from the same catalog file;
  // the code is the fallback for anything added on one side only.
  const serverById = new Map(serverProducts.map((p) => [p.id, p]));
  const serverByCode = new Map(serverProducts.map((p) => [p.code, p]));
  const matched = new Set<number>();

  const createProducts: Product[] = [];
  const updateProducts: RecoveryPlan["updateProducts"] = [];
  const skipped: Product[] = [];

  for (const lp of local.products) {
    const sp = serverById.get(lp.id) ?? serverByCode.get(lp.code);
    if (!sp) {
      // A new product needs a category that exists in the live shop. Since
      // recovery never creates categories, one pointing at a category this
      // device invented has nowhere to go.
      if (serverCategoryIds.has(lp.category_id)) createProducts.push(lp);
      else skipped.push(lp);
      continue;
    }
    matched.add(sp.id);
    const changed = differing(lp, sp);
    if (changed.length > 0) updateProducts.push({ local: lp, server: sp, changed });
  }

  const deleteProducts = serverProducts.filter((sp) => !matched.has(sp.id));

  const plan: RecoveryPlan = {
    createProducts,
    updateProducts,
    deleteProducts,
    skipped,
    empty: false,
  };
  plan.empty =
    createProducts.length === 0 &&
    updateProducts.length === 0 &&
    deleteProducts.length === 0;

  return { local, server, plan };
}

// ── Applying ────────────────────────────────────────────────────────

function toInput(p: Product, image_url: string, category_id: number): ProductInput {
  // Spelt out rather than spread so `id` can't be smuggled into the payload.
  return {
    name: p.name,
    code: p.code,
    price: p.price,
    image_url,
    category_id,
    description: p.description,
    benefits: p.benefits,
    ingredients: p.ingredients,
    usage: p.usage,
    name_ar: p.name_ar,
    description_ar: p.description_ar,
    benefits_ar: p.benefits_ar,
    ingredients_ar: p.ingredients_ar,
    usage_ar: p.usage_ar,
    stock: p.stock,
  };
}

/**
 * Photos uploaded by the browser-only build were stored at full size — it had
 * no reason to shrink them, since they never left the device. They do now, to
 * every shopper on every page load, so each one is downscaled on the way up.
 */
async function shrink(p: Product): Promise<string> {
  if (!p.image_url.startsWith("data:")) return p.image_url;
  return downscaleImage(p.image_url);
}

export interface RecoveryResult {
  created: number;
  updated: number;
  deleted: number;
  /** One line per failure — the rest of the plan still goes through. */
  failures: string[];
}

export async function applyRecovery(plan: RecoveryPlan): Promise<RecoveryResult> {
  const result: RecoveryResult = {
    created: 0,
    updated: 0,
    deleted: 0,
    failures: [],
  };
  const note = (what: string, err: unknown) =>
    result.failures.push(`${what}: ${err instanceof Error ? err.message : err}`);

  // Deletions before creations, so a product re-added under a code that a
  // deleted row still holds doesn't collide on the unique code. Everything
  // runs in sequence so a failure is attributable to one product.
  for (const p of plan.deleteProducts) {
    try {
      await deleteProduct(p.id);
      result.deleted++;
    } catch (err) {
      note(p.code, err);
    }
  }
  for (const { local, server } of plan.updateProducts) {
    try {
      // The live shop's category wins — recovery carries content, not
      // structure. See COMPARED.
      await updateProduct(
        server.id,
        toInput(local, await shrink(local), server.category_id),
      );
      result.updated++;
    } catch (err) {
      note(local.code, err);
    }
  }
  for (const p of plan.createProducts) {
    try {
      await createProduct(toInput(p, await shrink(p), p.category_id));
      result.created++;
    } catch (err) {
      note(p.code, err);
    }
  }

  return result;
}
