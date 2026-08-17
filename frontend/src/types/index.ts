// ── Product & Category types ────────────────────────────────────────

// Every piece of shopper-facing copy has an optional `_ar` twin. The base
// field is the English text and the fallback: when the Arabic one is blank the
// storefront shows the English, so a half-translated catalog still reads fine.
// See `localized()` in lib/i18n.ts.

export interface Product {
  id: number;
  name: string;
  code: string;
  price: number;
  image_url: string;
  category_id: number;
  // ── Optional detail fields (shown on the product detail view) ──
  /** Short overview / marketing blurb. */
  description?: string;
  /** What the product helps with. */
  benefits?: string;
  /** What's inside — active ingredients / composition. */
  ingredients?: string;
  /** How to use / directions / dosage. */
  usage?: string;
  // ── Arabic copy (optional; falls back to the fields above) ──
  name_ar?: string;
  description_ar?: string;
  benefits_ar?: string;
  ingredients_ar?: string;
  usage_ar?: string;
  /**
   * Units on hand. `undefined` means this product's stock isn't being tracked
   * — it stays purchasable, which is what every product does until someone
   * sets a number. `0` means genuinely out of stock.
   */
  stock?: number;
}

/** True when a product cannot be added to an order right now. */
export function isOutOfStock(product: Pick<Product, "stock">): boolean {
  return typeof product.stock === "number" && product.stock <= 0;
}

/** True when someone has put this product under stock control. */
export function isStockTracked(product: Pick<Product, "stock">): boolean {
  return typeof product.stock === "number";
}

/** The editable payload for creating or updating a product. */
export interface ProductInput {
  name: string;
  code: string;
  price: number;
  image_url: string;
  category_id: number;
  description?: string;
  benefits?: string;
  ingredients?: string;
  usage?: string;
  name_ar?: string;
  description_ar?: string;
  benefits_ar?: string;
  ingredients_ar?: string;
  usage_ar?: string;
  stock?: number;
}

export interface Category {
  id: number;
  name: string;
  /** Arabic section name; falls back to `name` when blank. */
  name_ar?: string;
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

/** Who the order is for and where it goes — asked at checkout. */
export interface CustomerDetails {
  customer_name: string;
  customer_phone: string;
  /** Free text: a neighbourhood and landmark, coordinates, or both. */
  customer_location: string;
}

export const EMPTY_CUSTOMER: CustomerDetails = {
  customer_name: "",
  customer_phone: "",
  customer_location: "",
};

/** True once an order carries enough for the shop to deliver it. */
export function hasCustomerDetails(c: CustomerDetails): boolean {
  return (
    c.customer_name.trim() !== "" &&
    // Iraqi mobile numbers are 11 digits; anything shorter than 7 is a typo,
    // not a phone number someone can be reached on.
    (c.customer_phone.match(/\d/g)?.length ?? 0) >= 7 &&
    c.customer_location.trim() !== ""
  );
}

export interface OrderCreate extends Partial<CustomerDetails> {
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

export interface Order extends CustomerDetails {
  id: number;
  created_at: string;
  notes: string;
  discount: number;
  grand_total: number;
  status: OrderStatus;
  items: OrderItem[];
}
