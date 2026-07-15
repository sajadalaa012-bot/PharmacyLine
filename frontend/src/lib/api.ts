// Data layer.
//   • Products & categories: browser-local (IndexedDB) — unchanged.
//   • Orders: the shared Postgres database via the /api routes, so orders
//     appear in the admin on every device.

import {
  Category,
  Product,
  Order,
  OrderCreate,
  Pharmacy,
  PharmacyFolder,
} from "@/types";
import {
  STORE,
  getAll,
  getOne,
  putOne,
  deleteOne,
  nextId,
  ensureSeeded,
} from "./localdb";
import { saveMyOrder } from "./myOrders";

// ── Products & Categories (local) ───────────────────────────────────

export async function fetchProducts(): Promise<Category[]> {
  await ensureSeeded();
  const [cats, products] = await Promise.all([
    getAll<Omit<Category, "products">>(STORE.categories),
    getAll<Product>(STORE.products),
  ]);
  return cats
    .sort((a, b) => a.display_order - b.display_order)
    .map((c) => ({
      ...c,
      products: products
        .filter((p) => p.category_id === c.id)
        .sort((a, b) => a.id - b.id),
    }));
}

export async function createProduct(productData: {
  name: string;
  code: string;
  price: number;
  image_url: string;
  category_id: number;
}): Promise<Product> {
  await ensureSeeded();
  const existing = await getAll<Product>(STORE.products);
  if (existing.some((p) => p.code === productData.code)) {
    throw new Error(`Product code '${productData.code}' already exists.`);
  }
  const product: Product = { id: await nextId("Product"), ...productData };
  await putOne(STORE.products, product);
  return product;
}

export async function updateProduct(
  productId: number,
  productData: {
    name: string;
    code: string;
    price: number;
    image_url: string;
    category_id: number;
  },
): Promise<Product> {
  await ensureSeeded();
  const product = await getOne<Product>(STORE.products, productId);
  if (!product) throw new Error("Product not found.");
  if (productData.code !== product.code) {
    const all = await getAll<Product>(STORE.products);
    if (all.some((p) => p.code === productData.code && p.id !== productId)) {
      throw new Error(`Product code '${productData.code}' is already in use.`);
    }
  }
  const updated: Product = { id: productId, ...productData };
  await putOne(STORE.products, updated);
  return updated;
}

export async function deleteProduct(productId: number): Promise<void> {
  await ensureSeeded();
  await deleteOne(STORE.products, productId);
}

export async function createCategory(categoryData: {
  name: string;
  display_order?: number;
}): Promise<Category> {
  await ensureSeeded();
  const cats = await getAll<Omit<Category, "products">>(STORE.categories);
  if (cats.some((c) => c.name === categoryData.name)) {
    throw new Error(`Category name '${categoryData.name}' already exists.`);
  }
  let display_order = categoryData.display_order ?? 0;
  if (!display_order) {
    display_order = cats.reduce((m, c) => Math.max(m, c.display_order), 0) + 1;
  }
  const category = {
    id: await nextId("Category"),
    name: categoryData.name,
    display_order,
  };
  await putOne(STORE.categories, category);
  return { ...category, products: [] };
}

export async function updateCategory(
  categoryId: number,
  categoryData: { name: string; display_order: number },
): Promise<Category> {
  await ensureSeeded();
  const category = await getOne<Omit<Category, "products">>(
    STORE.categories,
    categoryId,
  );
  if (!category) throw new Error("Category not found.");
  const updated = { id: categoryId, ...categoryData };
  await putOne(STORE.categories, updated);
  const products = (await getAll<Product>(STORE.products)).filter(
    (p) => p.category_id === categoryId,
  );
  return { ...updated, products };
}

export async function deleteCategory(categoryId: number): Promise<void> {
  await ensureSeeded();
  const products = await getAll<Product>(STORE.products);
  if (products.some((p) => p.category_id === categoryId)) {
    throw new Error("Cannot delete category containing products.");
  }
  await deleteOne(STORE.categories, categoryId);
}

// ── Pharmacies & folders (shared database via /api) ─────────────────
// The admin directory board lives server-side so it appears on every device.

export interface PharmacyData {
  folder_id: number | null;
  name: string;
  phone: string;
  location: string;
  notes: string;
}

export async function fetchPharmacies(): Promise<Pharmacy[]> {
  const res = await fetch("/api/pharmacies");
  bounceIfUnauthorized(res);
  if (!res.ok)
    throw new Error(await readError(res, "Failed to load pharmacies."));
  return res.json();
}

export async function createPharmacy(data: PharmacyData): Promise<Pharmacy> {
  const res = await fetch("/api/pharmacies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  bounceIfUnauthorized(res);
  if (!res.ok)
    throw new Error(await readError(res, "Failed to save pharmacy."));
  return res.json();
}

export async function updatePharmacy(
  pharmacyId: number,
  data: PharmacyData,
): Promise<Pharmacy> {
  const res = await fetch(`/api/pharmacies/${pharmacyId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  bounceIfUnauthorized(res);
  if (!res.ok)
    throw new Error(await readError(res, "Failed to update pharmacy."));
  return res.json();
}

export async function deletePharmacy(pharmacyId: number): Promise<void> {
  const res = await fetch(`/api/pharmacies/${pharmacyId}`, {
    method: "DELETE",
  });
  bounceIfUnauthorized(res);
  if (!res.ok && res.status !== 204)
    throw new Error(await readError(res, "Failed to delete pharmacy."));
}

export async function fetchPharmacyFolders(): Promise<PharmacyFolder[]> {
  const res = await fetch("/api/pharmacy-folders");
  bounceIfUnauthorized(res);
  if (!res.ok)
    throw new Error(await readError(res, "Failed to load folders."));
  return res.json();
}

export async function createPharmacyFolder(
  name: string,
): Promise<PharmacyFolder> {
  const res = await fetch("/api/pharmacy-folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  bounceIfUnauthorized(res);
  if (!res.ok)
    throw new Error(await readError(res, "Failed to create folder."));
  return res.json();
}

export async function renamePharmacyFolder(
  folderId: number,
  name: string,
): Promise<PharmacyFolder> {
  const res = await fetch(`/api/pharmacy-folders/${folderId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  bounceIfUnauthorized(res);
  if (!res.ok)
    throw new Error(await readError(res, "Failed to rename folder."));
  return res.json();
}

export async function deletePharmacyFolder(folderId: number): Promise<void> {
  const res = await fetch(`/api/pharmacy-folders/${folderId}`, {
    method: "DELETE",
  });
  bounceIfUnauthorized(res);
  if (!res.ok && res.status !== 204)
    throw new Error(await readError(res, "Failed to delete folder."));
}

export async function uploadProductImage(
  file: File,
): Promise<{ image_url: string }> {
  const image_url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  return { image_url };
}

// ── Orders (shared database via /api) ───────────────────────────────

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return (data as { error?: string }).error || fallback;
}

/** On an expired/absent admin session, bounce back to the login screen. */
function bounceIfUnauthorized(res: Response) {
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.reload();
    throw new Error("Session expired. Please sign in again.");
  }
}

/** Place an order (public). Also remembers it on this device for "My Orders". */
export async function createOrder(order: OrderCreate): Promise<Order> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to place order."));
  const saved = (await res.json()) as Order & { track_token: string };
  saveMyOrder({
    id: saved.id,
    token: saved.track_token,
    created_at: saved.created_at,
    grand_total: saved.grand_total,
  });
  return saved;
}

/** All orders (admin). */
export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch("/api/orders");
  bounceIfUnauthorized(res);
  if (!res.ok) throw new Error(await readError(res, "Failed to load orders."));
  return res.json();
}

/** Single order (admin). */
export async function fetchOrder(orderId: number): Promise<Order> {
  const res = await fetch(`/api/orders/${orderId}`);
  bounceIfUnauthorized(res);
  if (!res.ok) throw new Error(await readError(res, "Failed to load order."));
  return res.json();
}

/** Replace an order — used to approve or edit (admin). */
export async function updateOrder(
  orderId: number,
  order: OrderCreate,
): Promise<Order> {
  const res = await fetch(`/api/orders/${orderId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  bounceIfUnauthorized(res);
  if (!res.ok) throw new Error(await readError(res, "Failed to update order."));
  return res.json();
}

/** Delete an order (admin). */
export async function deleteOrder(orderId: number): Promise<void> {
  const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
  bounceIfUnauthorized(res);
  if (!res.ok && res.status !== 204) {
    throw new Error(await readError(res, "Failed to delete order."));
  }
}

/** Public lookup of a customer's own full order (id + secret token). */
export async function trackOrder(
  id: number,
  token: string,
): Promise<Order | null> {
  const params = new URLSearchParams({ id: String(id), token });
  const res = await fetch(`/api/orders/track?${params.toString()}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await readError(res, "Lookup failed."));
  return res.json();
}
