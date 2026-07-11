// Browser-only data store. Replaces the backend API: products, categories,
// and orders live in the visitor's browser via IndexedDB, seeded once from
// the bundled catalog. No server is involved.

import catalog from "@/data/catalog.json";
import { Product } from "@/types";

const DB_NAME = "pharmacy_pos";
const DB_VERSION = 1;

export const STORE = {
  categories: "categories",
  products: "products",
  orders: "orders",
  meta: "meta",
} as const;

type StoreName = (typeof STORE)[keyof typeof STORE];

interface SeedCategory {
  id: number;
  name: string;
  display_order: number;
  products: Product[];
}

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
      cStore.put({ id: c.id, name: c.name, display_order: c.display_order });
      maxCat = Math.max(maxCat, c.id);
      for (const p of c.products) {
        pStore.put({
          id: p.id,
          name: p.name,
          code: p.code,
          price: p.price,
          image_url: p.image_url,
          category_id: p.category_id,
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

/** Ensures the store is seeded before any read/write. Idempotent. */
export function ensureSeeded(): Promise<void> {
  if (!initPromise) initPromise = seed();
  return initPromise;
}

/** Atomically allocate the next id for an entity. */
export async function nextId(
  kind: "Category" | "Product" | "Order",
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
