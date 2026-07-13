// ── Product & Category types ────────────────────────────────────────

export interface Product {
  id: number;
  name: string;
  code: string;
  price: number;
  image_url: string;
  category_id: number;
}

export interface Category {
  id: number;
  name: string;
  display_order: number;
  products: Product[];
}

// ── Pharmacy directory (admin board) ────────────────────────────────

export interface Pharmacy {
  id: number;
  name: string;
  phone: string;
  location: string; // address, coordinates, or a Google Maps link
  notes: string;
}

// ── Cart types ──────────────────────────────────────────────────────

export interface CartItem {
  product_id: number;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_free: boolean;
}

// ── Order types ─────────────────────────────────────────────────────

export interface OrderItemCreate {
  product_id: number;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_free: boolean;
}

export type OrderStatus = "pending" | "approved";

export interface OrderCreate {
  notes: string;
  discount?: number;
  grand_total: number;
  status?: OrderStatus;
  items: OrderItemCreate[];
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_free: boolean;
}

export interface Order {
  id: number;
  created_at: string;
  notes: string;
  discount: number;
  grand_total: number;
  status: OrderStatus;
  items: OrderItem[];
}
