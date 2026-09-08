// Data layer. Everything lives in the shared Postgres database behind the
// /api routes: products, categories and orders alike. That is the point —
// what an admin edits on one device is what every visitor sees on theirs.

import {
  Category,
  Product,
  ProductInput,
  ProductCategory,
  Order,
  OrderCreate,
  Consultation,
  ConsultationCreate,
  ConsultationStatus,
  Package,
  PackageInput,
  HomeDeck,
} from "@/types";
import { tt } from "./i18n";
import { saveMyOrder } from "./myOrders";

// ── Shared request helpers ──────────────────────────────────────────

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return (data as { error?: string }).error || fallback;
}

/** On an expired/absent admin session, bounce back to the login screen. */
function bounceIfUnauthorized(res: Response) {
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.reload();
    throw new Error(tt("auth.expired"));
  }
}

/** A write from the admin: JSON in, JSON out, session-aware. */
async function adminWrite<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  fallback: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  bounceIfUnauthorized(res);
  if (!res.ok && res.status !== 204) {
    throw new Error(await readError(res, fallback));
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

// ── Products & Categories (shared database) ─────────────────────────

/** The whole shop. Public — the storefront calls this on every load. */
export async function fetchProducts(): Promise<Category[]> {
  const res = await fetch("/api/catalog", { cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res, tt("err.loadProducts")));
  return res.json();
}

// ── Product categories (the product type, not the brand) ────────────

/** Public — the storefront's category filter reads this alongside the catalog. */
export async function fetchProductCategories(): Promise<ProductCategory[]> {
  const res = await fetch("/api/product-categories", { cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res, tt("err.loadProducts")));
  return res.json();
}

export async function createProductCategory(
  input: { name: string; name_ar: string },
): Promise<ProductCategory> {
  return adminWrite<ProductCategory>(
    "/api/product-categories",
    "POST",
    tt("err.saveCategory"),
    input,
  );
}

export async function updateProductCategory(
  id: number,
  input: { name: string; name_ar: string },
): Promise<ProductCategory> {
  return adminWrite<ProductCategory>(
    `/api/product-categories/${id}`,
    "PUT",
    tt("err.saveCategory"),
    input,
  );
}

export async function deleteProductCategory(id: number): Promise<void> {
  return adminWrite<void>(
    `/api/product-categories/${id}`,
    "DELETE",
    tt("err.deleteCategory"),
  );
}

export async function createProduct(
  productData: ProductInput,
): Promise<Product> {
  return adminWrite<Product>(
    "/api/products",
    "POST",
    tt("err.saveProduct"),
    productData,
  );
}

export async function updateProduct(
  productId: number,
  productData: ProductInput,
): Promise<Product> {
  return adminWrite<Product>(
    `/api/products/${productId}`,
    "PUT",
    tt("err.saveProduct"),
    productData,
  );
}

export async function deleteProduct(productId: number): Promise<void> {
  await adminWrite<void>(
    `/api/products/${productId}`,
    "DELETE",
    tt("err.deleteProduct"),
  );
}

export async function createCategory(categoryData: {
  name: string;
  name_ar?: string;
  display_order?: number;
}): Promise<Category> {
  return adminWrite<Category>(
    "/api/categories",
    "POST",
    tt("err.saveCategory"),
    categoryData,
  );
}

export async function updateCategory(
  categoryId: number,
  categoryData: { name: string; name_ar?: string; display_order: number },
): Promise<Category> {
  return adminWrite<Category>(
    `/api/categories/${categoryId}`,
    "PUT",
    tt("err.saveCategory"),
    categoryData,
  );
}

export async function deleteCategory(categoryId: number): Promise<void> {
  await adminWrite<void>(
    `/api/categories/${categoryId}`,
    "DELETE",
    tt("err.deleteCategory"),
  );
}

// ── Product images ──────────────────────────────────────────────────
// A picked file becomes the data URL stored on the product row. That row
// travels out to every shopper, so the image is downscaled first: a phone
// photo is several megabytes, which would blow past the request limit going
// in and make the storefront crawl coming out.

const MAX_IMAGE_EDGE = 900;
const IMAGE_QUALITY = 0.82;
/** Below this, a correctly-sized image isn't worth re-encoding. */
const REENCODE_THRESHOLD = 400_000;

export async function uploadProductImage(
  file: File,
): Promise<{ image_url: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  return { image_url: await downscaleImage(dataUrl) };
}

/**
 * Shrinks a data URL to something worth sending to every shopper. Best effort:
 * anything the browser can't decode is passed through as-is. Exported because
 * catalog recovery re-shrinks photos the browser-only build stored full size.
 */
export async function downscaleImage(dataUrl: string): Promise<string> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = dataUrl;
    });
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height));
    if (scale === 1 && dataUrl.length < REENCODE_THRESHOLD) return dataUrl;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
    return out.length < dataUrl.length ? out : dataUrl;
  } catch {
    return dataUrl;
  }
}

// ── Orders (shared database via /api) ───────────────────────────────

/** Place an order (public). Also remembers it on this device for "My Orders". */
export async function createOrder(order: OrderCreate): Promise<Order> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  if (!res.ok) throw new Error(await readError(res, tt("err.placeOrder")));
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
  if (!res.ok) throw new Error(await readError(res, tt("err.loadOrders")));
  return res.json();
}

/** Single order (admin). */
export async function fetchOrder(orderId: number): Promise<Order> {
  const res = await fetch(`/api/orders/${orderId}`);
  bounceIfUnauthorized(res);
  if (!res.ok) throw new Error(await readError(res, tt("err.loadOrder")));
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
  if (!res.ok) throw new Error(await readError(res, tt("err.updateOrder")));
  return res.json();
}

/** Delete an order (admin). */
export async function deleteOrder(orderId: number): Promise<void> {
  const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
  bounceIfUnauthorized(res);
  if (!res.ok && res.status !== 204) {
    throw new Error(await readError(res, tt("err.deleteOrder")));
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
  if (!res.ok) throw new Error(await readError(res, tt("err.lookupFailed")));
  return res.json();
}

// ── Consultations (shared database via /api) ────────────────────────

/** Ask for a skincare consultation (public — the home screen's form). */
export async function createConsultation(
  input: ConsultationCreate,
): Promise<Consultation> {
  const res = await fetch("/api/consultations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res, tt("err.sendConsult")));
  return res.json();
}

/** Admin: every request, newest first. */
export async function fetchConsultations(): Promise<Consultation[]> {
  const res = await fetch("/api/consultations", { cache: "no-store" });
  bounceIfUnauthorized(res);
  if (!res.ok) throw new Error(await readError(res, tt("err.loadConsults")));
  return res.json();
}

/** Admin: mark one handled, or put it back in the queue. */
export function updateConsultationStatus(
  id: number,
  status: ConsultationStatus,
): Promise<Consultation> {
  return adminWrite<Consultation>(
    `/api/consultations/${id}`,
    "PUT",
    tt("err.updateConsult"),
    { status },
  );
}

export function deleteConsultation(id: number): Promise<void> {
  return adminWrite<void>(
    `/api/consultations/${id}`,
    "DELETE",
    tt("err.deleteConsult"),
  );
}

// ── Packages (shared database via /api) ─────────────────────────────

/** The packages on sale (public). Only the ones switched on come back. */
export async function fetchPackages(): Promise<Package[]> {
  const res = await fetch("/api/packages", { cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res, tt("err.loadPackages")));
  return res.json();
}

/** Every package including the hidden ones (admin). */
export async function fetchAllPackages(): Promise<Package[]> {
  const res = await fetch("/api/packages?all=1", { cache: "no-store" });
  bounceIfUnauthorized(res);
  if (!res.ok) throw new Error(await readError(res, tt("err.loadPackages")));
  return res.json();
}

export function createPackage(input: PackageInput): Promise<Package> {
  return adminWrite<Package>(
    "/api/packages",
    "POST",
    tt("err.savePackage"),
    input,
  );
}

export function updatePackage(
  id: number,
  input: PackageInput,
): Promise<Package> {
  return adminWrite<Package>(
    `/api/packages/${id}`,
    "PUT",
    tt("err.savePackage"),
    input,
  );
}

export function deletePackage(id: number): Promise<void> {
  return adminWrite<void>(
    `/api/packages/${id}`,
    "DELETE",
    tt("err.deletePackage"),
  );
}

// ── The home deck (shared database via /api) ────────────────────────

/** The slideshow's copy (public — the storefront reads it with the catalog). */
export async function fetchHomeDeck(): Promise<HomeDeck> {
  const res = await fetch("/api/home-deck", { cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res, tt("err.loadDeck")));
  return res.json();
}

/** Admin: replace it. */
export function updateHomeDeck(deck: HomeDeck): Promise<HomeDeck> {
  return adminWrite<HomeDeck>(
    "/api/home-deck",
    "PUT",
    tt("err.saveDeck"),
    deck,
  );
}
