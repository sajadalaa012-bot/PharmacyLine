// Data layer.
//   • Products & categories: browser-local (IndexedDB) — unchanged.
//   • Orders: the real Postgres database via the /api routes.

import {
  Category,
  Product,
  Order,
  OrdersPage,
  CreateOrderInput,
  OrderStatus,
  PaymentStatus,
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

// ── Orders (real database via /api) ─────────────────────────────────

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return (data as { error?: string }).error || fallback;
}

/** Signals an expired/absent admin session so the UI can show the login. */
export class UnauthorizedError extends Error {
  constructor() {
    super("Your session has expired. Please sign in again.");
  }
}

/** Place an order (public). */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to place order."));
  return res.json();
}

export interface OrdersQuery {
  search?: string;
  order_status?: string;
  payment_status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

/** List orders (admin). */
export async function fetchOrdersPage(
  query: OrdersQuery = {},
): Promise<OrdersPage> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const res = await fetch(`/api/orders?${params.toString()}`);
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(await readError(res, "Failed to load orders."));
  return res.json();
}

/** Single order (admin). */
export async function fetchOrder(orderId: number): Promise<Order> {
  const res = await fetch(`/api/orders/${orderId}`);
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(await readError(res, "Failed to load order."));
  return res.json();
}

/** Update order status and/or payment status (admin). */
export async function updateOrderStatus(
  orderId: number,
  updates: { order_status?: OrderStatus; payment_status?: PaymentStatus },
): Promise<Order> {
  const res = await fetch(`/api/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(await readError(res, "Failed to update order."));
  return res.json();
}

/** Delete an order (admin). */
export async function deleteOrder(orderId: number): Promise<void> {
  const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok && res.status !== 204) {
    throw new Error(await readError(res, "Failed to delete order."));
  }
}

export interface OrderTracking {
  order_number: string;
  created_at: string;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  total: number;
}

/** Public live-status lookup for a customer's own order. */
export async function trackOrder(
  orderNumber: string,
  email: string,
): Promise<OrderTracking | null> {
  const params = new URLSearchParams({ number: orderNumber, email });
  const res = await fetch(`/api/orders/track?${params.toString()}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await readError(res, "Lookup failed."));
  return res.json();
}
