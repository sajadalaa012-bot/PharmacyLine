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

export type PaymentStatus = "pending" | "paid" | "failed";
export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";
export type PaymentMethod = "cash_on_delivery" | "card" | "bank_transfer";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];
export const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "paid", "failed"];
export const PAYMENT_METHODS: PaymentMethod[] = [
  "cash_on_delivery",
  "card",
  "bank_transfer",
];

export interface OrderItemInput {
  product_id: number | null;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_free: boolean;
}

export interface OrderItem extends OrderItemInput {
  id: number;
}

/** Payload the storefront/POS sends to create an order. */
export interface CreateOrderInput {
  idempotency_key: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  billing_address?: string | null;
  payment_method: PaymentMethod | string;
  notes?: string;
  shipping_cost?: number;
  tax?: number;
  discount?: number;
  items: OrderItemInput[];
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  billing_address: string | null;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: string;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  notes: string;
  created_at: string;
  items: OrderItem[];
}

/** Paginated list response from GET /api/orders. */
export interface OrdersPage {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
}
