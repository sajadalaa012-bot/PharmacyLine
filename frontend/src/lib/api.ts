// Browser-only data layer. Keeps the exact same function signatures the app
// already uses, but reads/writes IndexedDB instead of a backend API.

import { Category, Product, OrderCreate, Order, OrderItem } from "@/types";
import {
  STORE,
  getAll,
  getOne,
  putOne,
  deleteOne,
  nextId,
  ensureSeeded,
} from "./localdb";

// ── Products & Categories ───────────────────────────────────────────

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
  const category = { id: await nextId("Category"), name: categoryData.name, display_order };
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

// ── Orders ───────────────────────────────────────────────────────────

export async function createOrder(order: OrderCreate): Promise<Order> {
  await ensureSeeded();
  if (!order.items.length) {
    throw new Error("Order must have at least one item.");
  }
  const items: OrderItem[] = order.items.map((it, i) => ({ id: i + 1, ...it }));
  const saved: Order = {
    id: await nextId("Order"),
    created_at: new Date().toISOString(),
    notes: order.notes,
    discount: order.discount ?? 0,
    grand_total: order.grand_total,
    status: order.status ?? "pending",
    items,
  };
  await putOne(STORE.orders, saved);
  return saved;
}

export async function fetchOrders(): Promise<Order[]> {
  await ensureSeeded();
  const orders = await getAll<Order>(STORE.orders);
  return orders.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function fetchOrder(orderId: number): Promise<Order> {
  await ensureSeeded();
  const order = await getOne<Order>(STORE.orders, orderId);
  if (!order) throw new Error("Order not found.");
  return order;
}

export async function updateOrder(
  orderId: number,
  order: OrderCreate,
): Promise<Order> {
  await ensureSeeded();
  const existing = await getOne<Order>(STORE.orders, orderId);
  if (!existing) throw new Error("Order not found.");
  if (!order.items.length) {
    throw new Error("Order must have at least one item.");
  }
  const items: OrderItem[] = order.items.map((it, i) => ({ id: i + 1, ...it }));
  const updated: Order = {
    ...existing,
    notes: order.notes,
    discount: order.discount ?? 0,
    grand_total: order.grand_total,
    status: order.status ?? existing.status,
    items,
  };
  await putOne(STORE.orders, updated);
  return updated;
}

export async function deleteOrder(orderId: number): Promise<void> {
  await ensureSeeded();
  await deleteOne(STORE.orders, orderId);
}

// ── Image "upload" — stored inline as a data URL (no server) ─────────

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
