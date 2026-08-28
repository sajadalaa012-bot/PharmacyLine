// ── Product & Category types ────────────────────────────────────────

// Every piece of shopper-facing copy has an optional `_ar` twin. The base
// field is the English text and the fallback: when the Arabic one is blank the
// storefront shows the English, so a half-translated catalog still reads fine.
// See `localized()` in lib/i18n.ts.

/**
 * One buyable option of a product — a size, a flavour, a shade. A product
 * with no variants is sold as itself; a product with variants is only ever
 * sold as one of them, so the shopper picks before anything reaches the cart.
 *
 * Every field except the name is an override: leave it blank and the option
 * inherits the product's own price, offer, code and stock. That way a
 * "Strawberry / Vanilla" pair costs nothing to set up, while a
 * "50 ml / 100 ml" pair can price each size separately.
 */
export interface ProductVariant {
  /** Stable within the product. Cart lines and order lines are keyed on it,
   *  so it must survive edits — never renumber these. */
  id: string;
  /** The option label, e.g. "100 ml". */
  name: string;
  /** Arabic label; falls back to `name`. */
  name_ar?: string;
  /** Appended to the product code on receipts, e.g. "100ML" → "F173-100ML". */
  code?: string;
  /** What this option costs. Blank = the product's price. */
  price?: number;
  /** Was-price for an offer on this option. See `variantPricing`. */
  old_price?: number;
  /** Units on hand for this option. Blank = the product's own stock rule. */
  stock?: number;
}

/**
 * A product type — Serum, Cleanser, Sunscreen. The second way to narrow the
 * catalogue, and independent of the brand: a shopper can ask for COSRX, for
 * serums, or for COSRX serums.
 *
 * A note on names, because they are genuinely confusing here. The `Category`
 * interface below, the `categories` table and `Product.category_id` all
 * predate this and hold the shop's *brands* — that is what the catalogue was
 * originally grouped by. This is the actual category, and it is stored
 * separately. The storefront and the admin both label them "Brand" and
 * "Category", which is what matters to anyone using the shop.
 */
export interface ProductCategory {
  id: number;
  name: string;
  /** Arabic name; falls back to `name`. */
  name_ar?: string;
  display_order: number;
}

export interface Product {
  id: number;
  name: string;
  code: string;
  price: number;
  /**
   * What the product used to cost, when it is on offer. The storefront shows
   * it struck through beside `price`, which is always what is actually
   * charged. `undefined` — or anything not above `price` — means no offer.
   */
  old_price?: number;
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
  /** Buyable options. Empty / absent = the product is sold as itself. */
  variants?: ProductVariant[];
  /**
   * Which product type this is. `undefined` means nobody has said yet — the
   * product still sells, it just doesn't answer to a category filter.
   * Distinct from `category_id`, which is the brand. See ProductCategory.
   */
  product_category_id?: number;
}

/** True when a product cannot be added to an order right now. */
export function isOutOfStock(product: Pick<Product, "stock">): boolean {
  return typeof product.stock === "number" && product.stock <= 0;
}

/** True when someone has put this product under stock control. */
export function isStockTracked(product: Pick<Product, "stock">): boolean {
  return typeof product.stock === "number";
}

/** The options a product is sold in — empty when it is sold as itself. */
export function variantsOf(product: Pick<Product, "variants">): ProductVariant[] {
  return product.variants ?? [];
}

/** True when the shopper has to pick an option before they can buy. */
export function hasVariants(product: Pick<Product, "variants">): boolean {
  return variantsOf(product).length > 0;
}

/**
 * What one option actually costs, and what it used to cost.
 *
 * An option that sets no price of its own sells at the product's price, offer
 * included. An option that *does* set its own price does not inherit the
 * product's offer — a "was" price quoted against a different sum would be a
 * lie — but it can carry an offer of its own.
 */
export function variantPricing(
  product: Pick<Product, "price" | "old_price">,
  variant?: ProductVariant | null,
): { price: number; old_price?: number } {
  if (!variant) return { price: product.price, old_price: product.old_price };
  if (variant.price == null)
    return {
      price: product.price,
      old_price: variant.old_price ?? product.old_price,
    };
  return { price: variant.price, old_price: variant.old_price };
}

/** Units on hand for one option. `undefined` = not tracked, so purchasable. */
export function variantStock(
  product: Pick<Product, "stock">,
  variant?: ProductVariant | null,
): number | undefined {
  return variant?.stock ?? product.stock;
}

/** The code that goes on the receipt line for one option. */
export function variantCode(
  product: Pick<Product, "code">,
  variant?: ProductVariant | null,
): string {
  const suffix = variant?.code?.trim();
  return suffix ? `${product.code}-${suffix}` : product.code;
}

/**
 * True when this product needs restocking: it is itself down to the last few,
 * or — when it is sold in options — any one option is. An option counts on
 * its own, since running out of the 100 ml size is a gap on the shelf whatever
 * the other sizes are doing.
 */
export function isLowStock(
  product: Pick<Product, "stock" | "variants">,
  threshold = 5,
): boolean {
  const low = (stock: number | undefined) =>
    isStockTracked({ stock }) && (stock ?? 0) <= threshold;
  const variants = variantsOf(product);
  if (variants.length === 0) return low(product.stock);
  return variants.some((v) => low(variantStock(product, v)));
}

/** The cheapest and dearest an option of this product sells for. */
export function priceRange(
  product: Pick<Product, "price" | "old_price" | "variants">,
): { min: number; max: number } {
  const variants = variantsOf(product);
  if (variants.length === 0) return { min: product.price, max: product.price };
  const prices = variants.map((v) => variantPricing(product, v).price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/**
 * True when this product is on offer: it carries a former price, and that
 * price is genuinely higher than what it sells for now. An `old_price` at or
 * below `price` is a typo rather than a discount, so nothing is shown for it.
 */
export function isDiscounted(
  product: Pick<Product, "price" | "old_price">,
): boolean {
  return (
    typeof product.old_price === "number" &&
    Number.isFinite(product.old_price) &&
    product.old_price > product.price
  );
}

/** How much off, as a whole percentage. 0 when there is no offer. */
export function discountPercent(
  product: Pick<Product, "price" | "old_price">,
): number {
  if (!isDiscounted(product)) return 0;
  const was = product.old_price as number;
  return Math.round(((was - product.price) / was) * 100);
}

/** The editable payload for creating or updating a product. */
export interface ProductInput {
  name: string;
  code: string;
  price: number;
  old_price?: number;
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
  variants?: ProductVariant[];
  product_category_id?: number;
}

/**
 * The catalogue's top-level grouping, which is the shop's **brands** —
 * Vichy, COSRX, La Roche-Posay. Named "Category" since before the shop was
 * grouped this way; the UI calls it Brand. For the product type, see
 * ProductCategory above.
 */
export interface Category {
  id: number;
  name: string;
  /** Arabic section name; falls back to `name` when blank. */
  name_ar?: string;
  display_order: number;
  products: Product[];
}

// ── Cart types ──────────────────────────────────────────────────────

export interface CartItem {
  product_id: number;
  product_code: string;
  product_name: string;
  /** Which option this line is for; absent on a product sold as itself. */
  variant_id?: string;
  /** The option label as the buyer saw it — a snapshot, like product_name. */
  variant_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_free: boolean;
}

/**
 * Identifies one line of a cart or order. A product bought in two options —
 * or once paid and once as a bonus — is two lines, so the key has to carry
 * all three parts.
 */
export function lineKey(line: {
  product_id: number;
  variant_id?: string;
  is_free: boolean;
}): string {
  return `${line.product_id}:${line.variant_id ?? ""}:${line.is_free ? "free" : "paid"}`;
}

// ── Order types ─────────────────────────────────────────────────────

export interface OrderItemCreate {
  product_id: number;
  product_code: string;
  product_name: string;
  variant_id?: string;
  variant_name?: string;
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
  variant_id?: string;
  variant_name?: string;
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
