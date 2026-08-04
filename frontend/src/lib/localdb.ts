// Browser-only data store. Replaces the backend API: products, categories,
// and orders live in the visitor's browser via IndexedDB, seeded once from
// the bundled catalog. No server is involved.

import catalog from "@/data/catalog.json";
import { Category, Product } from "@/types";

const DB_NAME = "pharmacy_pos";
const DB_VERSION = 2;

export const STORE = {
  categories: "categories",
  products: "products",
  orders: "orders",
  pharmacies: "pharmacies",
  meta: "meta",
} as const;

type StoreName = (typeof STORE)[keyof typeof STORE];

interface SeedCategory {
  id: number;
  name: string;
  name_ar?: string;
  display_order: number;
  products: Product[];
}

/** Shopper-facing product copy — the fields that have an Arabic twin. */
const CONTENT_FIELDS = [
  "description",
  "benefits",
  "ingredients",
  "usage",
  "name_ar",
  "description_ar",
  "benefits_ar",
  "ingredients_ar",
  "usage_ar",
] as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE.categories))
        db.createObjectStore(STORE.categories, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE.products))
        db.createObjectStore(STORE.products, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE.orders))
        db.createObjectStore(STORE.orders, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE.pharmacies))
        db.createObjectStore(STORE.pharmacies, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE.meta))
        db.createObjectStore(STORE.meta, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function request<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(db.transaction(store, mode).objectStore(store));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }),
  );
}

export function getAll<T>(store: StoreName): Promise<T[]> {
  return request<T[]>(store, "readonly", (s) => s.getAll());
}
export function getOne<T>(store: StoreName, key: number): Promise<T | undefined> {
  return request<T | undefined>(store, "readonly", (s) => s.get(key));
}
export function putOne<T>(store: StoreName, value: T): Promise<void> {
  return request<IDBValidKey>(store, "readwrite", (s) => s.put(value)).then(
    () => undefined,
  );
}
export function deleteOne(store: StoreName, key: number): Promise<void> {
  return request<undefined>(store, "readwrite", (s) => s.delete(key)).then(
    () => undefined,
  );
}

interface MetaRow {
  key: string;
  value: number | boolean;
}

function getMeta(key: string): Promise<MetaRow | undefined> {
  return request<MetaRow | undefined>(STORE.meta, "readonly", (s) => s.get(key));
}

// ── Seeding (runs once per browser) ─────────────────────────────────

let initPromise: Promise<void> | null = null;

async function seed(): Promise<void> {
  const seeded = await getMeta("seeded");
  if (seeded?.value) return;

  const cats = catalog as SeedCategory[];
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(
      [STORE.categories, STORE.products, STORE.meta],
      "readwrite",
    );
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);

    const cStore = t.objectStore(STORE.categories);
    const pStore = t.objectStore(STORE.products);
    let maxCat = 0;
    let maxProd = 0;

    for (const c of cats) {
      cStore.put({
        id: c.id,
        name: c.name,
        name_ar: c.name_ar,
        display_order: c.display_order,
      });
      maxCat = Math.max(maxCat, c.id);
      for (const p of c.products) {
        pStore.put({
          id: p.id,
          name: p.name,
          code: p.code,
          price: p.price,
          image_url: p.image_url,
          category_id: p.category_id,
          description: p.description,
          benefits: p.benefits,
          ingredients: p.ingredients,
          usage: p.usage,
          name_ar: p.name_ar,
          description_ar: p.description_ar,
          benefits_ar: p.benefits_ar,
          ingredients_ar: p.ingredients_ar,
          usage_ar: p.usage_ar,
          // Deliberately absent from the backfill below: stock is a live count
          // the admin owns, and 0 is a meaningful value that a "fill the empty
          // fields" pass would happily overwrite.
          stock: p.stock,
        });
        maxProd = Math.max(maxProd, p.id);
      }
    }

    const mStore = t.objectStore(STORE.meta);
    mStore.put({ key: "nextCategoryId", value: maxCat + 1 });
    mStore.put({ key: "nextProductId", value: maxProd + 1 });
    mStore.put({ key: "nextOrderId", value: 1 });
    mStore.put({ key: "seeded", value: true });
  });
}

// ── Details backfill (runs once per browser) ────────────────────────
// Existing visitors were seeded before products carried detail fields, and
// again before they carried Arabic copy. This one-time pass copies the
// shopper-facing fields from the bundled catalog onto stored products that
// don't already have them, without touching prices, admin edits, or orders.
// Bump the flag key to re-run — v2 added the Arabic twins, v3 filled them in
// with the actual translated catalog copy.
const DETAILS_FLAG = "detailsBackfilled_v3";

async function backfillDetails(): Promise<void> {
  const done = await getMeta(DETAILS_FLAG);
  if (done?.value) return;

  const cats = catalog as SeedCategory[];
  // Content fields from the catalog, keyed by product id.
  const byId = new Map<number, Partial<Product>>();
  const catNameAr = new Map<number, string | undefined>();
  for (const c of cats) {
    catNameAr.set(c.id, c.name_ar);
    for (const p of c.products) {
      const fields: Partial<Product> = {};
      for (const k of CONTENT_FIELDS) fields[k] = p[k];
      byId.set(p.id, fields);
    }
  }

  const stored = await getAll<Product>(STORE.products);
  const storedCats = await getAll<Omit<Category, "products">>(STORE.categories);
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(
      [STORE.products, STORE.categories, STORE.meta],
      "readwrite",
    );
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    const pStore = t.objectStore(STORE.products);

    for (const prod of stored) {
      const details = byId.get(prod.id);
      if (!details) continue;
      // Only fill fields that are currently empty — never clobber admin edits.
      const merged: Product = { ...prod };
      let changed = false;
      for (const k of CONTENT_FIELDS) {
        if (!merged[k] && details[k]) {
          merged[k] = details[k];
          changed = true;
        }
      }
      if (changed) pStore.put(merged);
    }

    const cStore = t.objectStore(STORE.categories);
    for (const cat of storedCats) {
      const nameAr = catNameAr.get(cat.id);
      if (!cat.name_ar && nameAr) cStore.put({ ...cat, name_ar: nameAr });
    }

    t.objectStore(STORE.meta).put({ key: DETAILS_FLAG, value: true });
  });
}

/** Ensures the store is seeded before any read/write. Idempotent. */
export function ensureSeeded(): Promise<void> {
  if (!initPromise) initPromise = seed().then(backfillDetails);
  return initPromise;
}

/** Atomically allocate the next id for an entity. */
export async function nextId(
  kind: "Category" | "Product" | "Order" | "Pharmacy",
): Promise<number> {
  const key = `next${kind}Id`;
  const db = await openDB();
  return new Promise<number>((resolve, reject) => {
    const t = db.transaction(STORE.meta, "readwrite");
    const store = t.objectStore(STORE.meta);
    const get = store.get(key);
    get.onsuccess = () => {
      const current = (get.result as MetaRow | undefined)?.value;
      const id = typeof current === "number" ? current : 1;
      store.put({ key, value: id + 1 });
      t.oncomplete = () => resolve(id);
    };
    get.onerror = () => reject(get.error);
    t.onerror = () => reject(t.error);
  });
}
