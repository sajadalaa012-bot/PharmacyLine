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

/** A named group the admin creates to organise pharmacies. */
export interface PharmacyFolder {
  id: number;
  name: string;
}

export interface Pharmacy {
  id: number;
  folder_id: number | null; // null = "Unfiled"
  name: string;
  phone: string;
  location: string; // address, coordinates, or a Google Maps link
  notes: string;
  // Map pin, resolved from `location` on save. null = not pinned yet.
  lat: number | null;
  lng: number | null;
}

/** A pharmacy that has coordinates — the shape the visit map works with. */
export type MappedPharmacy = Pharmacy & { lat: number; lng: number };

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
