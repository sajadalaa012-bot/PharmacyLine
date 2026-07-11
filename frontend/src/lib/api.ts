import { Category, Product, OrderCreate, Order } from "@/types";
import { getToken, clearToken } from "./auth";

const API_BASE = "/api";

/**
 * fetch wrapper that attaches the auth token and, on a 401, clears the
 * stored token and returns to the login screen.
 */
async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.reload();
    throw new Error("Session expired. Please sign in again.");
  }
  return res;
}

export async function fetchProducts(): Promise<Category[]> {
  const res = await apiFetch(`${API_BASE}/products`);
  if (!res.ok) {
    throw new Error(`Failed to fetch products: ${res.status}`);
  }
  return res.json();
}

export async function createOrder(order: OrderCreate): Promise<Order> {
  const res = await apiFetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  if (!res.ok) {
    throw new Error(`Failed to create order: ${res.status}`);
  }
  return res.json();
}

export async function fetchOrders(): Promise<Order[]> {
  const res = await apiFetch(`${API_BASE}/orders`);
  if (!res.ok) {
    throw new Error(`Failed to fetch orders: ${res.status}`);
  }
  return res.json();
}

export async function fetchOrder(orderId: number): Promise<Order> {
  const res = await apiFetch(`${API_BASE}/orders/${orderId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch order: ${res.status}`);
  }
  return res.json();
}

export async function updateOrder(orderId: number, order: OrderCreate): Promise<Order> {
  const res = await apiFetch(`${API_BASE}/orders/${orderId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to update order: ${res.status}`);
  }
  return res.json();
}

export async function deleteOrder(orderId: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/orders/${orderId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to delete order: ${res.status}`);
  }
}

export async function updateProduct(
  productId: number,
  productData: { name: string; code: string; price: number; image_url: string; category_id: number }
): Promise<Product> {
  const res = await apiFetch(`${API_BASE}/products/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productData),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to update product: ${res.status}`);
  }
  return res.json();
}

export async function createProduct(
  productData: { name: string; code: string; price: number; image_url: string; category_id: number }
): Promise<Product> {
  const res = await apiFetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productData),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to create product: ${res.status}`);
  }
  return res.json();
}

export async function deleteProduct(productId: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/products/${productId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to delete product: ${res.status}`);
  }
}

export async function createCategory(
  categoryData: { name: string; display_order?: number }
): Promise<Category> {
  const res = await apiFetch(`${API_BASE}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(categoryData),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to create category: ${res.status}`);
  }
  return res.json();
}

export async function updateCategory(
  categoryId: number,
  categoryData: { name: string; display_order: number }
): Promise<Category> {
  const res = await apiFetch(`${API_BASE}/categories/${categoryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(categoryData),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to update category: ${res.status}`);
  }
  return res.json();
}

export async function deleteCategory(categoryId: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/categories/${categoryId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to delete category: ${res.status}`);
  }
}

export async function uploadProductImage(file: File): Promise<{ image_url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiFetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to upload image: ${res.status}`);
  }
  return res.json();
}


