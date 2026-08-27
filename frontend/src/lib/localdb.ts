// Read-only access to this device's legacy IndexedDB.
//
// Products, categories and orders all used to live here, which meant an
// admin's edits never left the browser that made them. They now live in the
// shared database behind /api (see lib/api.ts and lib/catalog.ts). What is
// left in this store is whatever the last browser-only build wrote, and two
// recovery paths read it so that work isn't lost: migrateLocalOrders for
// orders, and lib/recoverLocalCatalog for catalog edits.

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

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    // A device that never ran the old version has nothing to read, but the
    // stores still have to exist for the transaction below to open.
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of Object.values(STORE)) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, {
            keyPath: name === STORE.meta ? "key" : "id",
          });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export function getAll<T>(store: StoreName): Promise<T[]> {
  return openDB().then(
    (db) =>
      new Promise<T[]>((resolve, reject) => {
        const req = db.transaction(store, "readonly").objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error);
      }),
  );
}
