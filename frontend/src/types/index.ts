// ── Product & Category types ────────────────────────────────────────

// Every piece of shopper-facing copy has an optional `_ar` twin. The base
// field is the English text and the fallback: when the Arabic one is blank the
// storefront shows the English, so a half-translated catalog still reads fine.
// See `localized()` in lib/i18n.ts.

/**
 * One buyable option of a product - a size, a flavour, a shade. A product
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
   *  so it must survive edits - never renumber these. */
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
 * A product type - Serum, Cleanser, Sunscreen. The second way to narrow the
 * catalogue, and independent of the brand: a shopper can ask for COSRX, for
 * serums, or for COSRX serums.
 *
 * A note on names, because they are genuinely confusing here. The `Category`
 * interface below, the `categories` table and `Product.category_id` all
 * predate this and hold the shop's *brands* - that is what the catalogue was
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
   * charged. `undefined` - or anything not above `price` - means no offer.
   */
  old_price?: number;
  image_url: string;
  category_id: number;
  // ── Optional detail fields (shown on the product detail view) ──
  /** Short overview / marketing blurb. */
  description?: string;
  /** What the product helps with. */
  benefits?: string;
  /** What's inside - active ingredients / composition. */
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
   * - it stays purchasable, which is what every product does until someone
   * sets a number. `0` means genuinely out of stock.
   */
  stock?: number;
  /** Buyable options. Empty / absent = the product is sold as itself. */
  variants?: ProductVariant[];
  /**
   * Which product type this is. `undefined` means nobody has said yet - the
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

/** The options a product is sold in - empty when it is sold as itself. */
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
 * product's offer - a "was" price quoted against a different sum would be a
 * lie - but it can carry an offer of its own.
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
 * or - when it is sold in options - any one option is. An option counts on
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
 * The catalogue's top-level grouping, which is the shop's **brands** -
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
  /** The option label as the buyer saw it - a snapshot, like product_name. */
  variant_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_free: boolean;
}

/**
 * Identifies one line of a cart or order. A product bought in two options -
 * or once paid and once as a bonus - is two lines, so the key has to carry
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

/** Who the order is for and where it goes - asked at checkout. */
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

// ── Skincare consultation ───────────────────────────────────────────
//
// A shopper fills the form on the home screen and the shop calls them back.
// Nothing here is tied to an order or to a product: it is an enquiry, and the
// only thing it has to carry is enough to hold a conversation.

/** The five skin types the form offers. Stored as these keys, never as a
 *  translated label - the shop reads Arabic and the admin may be in English. */
export const SKIN_TYPES = [
  "normal",
  "dry",
  "oily",
  "combination",
  "sensitive",
] as const;
export type SkinType = (typeof SKIN_TYPES)[number];

/** What the shopper wants help with. Any number of them, including none. */
export const SKIN_CONCERNS = [
  "acne",
  "darkSpots",
  "ageing",
  "dryness",
  "sensitivity",
  "pores",
  "sunDamage",
] as const;
export type SkinConcern = (typeof SKIN_CONCERNS)[number];

export type ConsultationStatus = "new" | "done";

/** Left blank by anyone who would rather not say. */
export const GENDERS = ["female", "male"] as const;
export type Gender = (typeof GENDERS)[number];

/** Whether the advice has to steer clear of what a pregnancy rules out.
 *  "neither" is an answer; blank is the question left alone. */
export const PREGNANCY_STATES = [
  "pregnant",
  "breastfeeding",
  "neither",
] as const;
export type PregnancyState = (typeof PREGNANCY_STATES)[number];

/** What the storefront sends. */
export interface ConsultationCreate {
  name: string;
  phone: string;
  /** Free text rather than a number: "23", "early 30s" and "" are all fine. */
  age: string;
  gender: Gender | "";
  /** Where they are. The shop delivers, so a call often ends in an address. */
  city: string;
  skin_type: SkinType | "";
  concerns: SkinConcern[];
  /** What they use now: the advice starts from what is already on the shelf. */
  routine: string;
  /** Allergies, sensitivities, anything they are taking. Free text on purpose:
   *  a list of tick boxes would only ever be the wrong list. */
  allergies: string;
  /** What they would rather spend, in their own words. */
  budget: string;
  /** Retinoids and a few other actives are off the table while pregnant or
   *  breastfeeding, so the answer changes what can be recommended. */
  pregnancy: PregnancyState | "";
  /** A photograph of the skin, when they choose to send one. A data URL, the
   *  way every other uploaded picture here is stored. Blank is the norm. */
  photo_url: string;
  notes: string;
}

/**
 * A request as it comes back out of the database. `skin_type` narrows: the
 * form starts empty and the create type says so, but validation refuses a
 * request without one, so a saved consultation always has it.
 */
export interface Consultation extends Omit<ConsultationCreate, "skin_type"> {
  id: number;
  created_at: string;
  status: ConsultationStatus;
  skin_type: SkinType;
}

export const EMPTY_CONSULTATION: ConsultationCreate = {
  name: "",
  phone: "",
  age: "",
  gender: "",
  city: "",
  skin_type: "",
  concerns: [],
  routine: "",
  allergies: "",
  budget: "",
  pregnancy: "",
  photo_url: "",
  notes: "",
};

/**
 * True once the form carries enough for the shop to act on it: someone to ask
 * for, a number to reach them on, and what their skin is like. The phone rule
 * is the one checkout uses - see hasCustomerDetails.
 */
export function hasConsultationDetails(c: ConsultationCreate): boolean {
  return (
    c.name.trim() !== "" &&
    (c.phone.match(/\d/g)?.length ?? 0) >= 7 &&
    c.skin_type !== ""
  );
}

// ── Packages ────────────────────────────────────────────────────────
//
// A package is a set of catalog products sold together for one price the shop
// sets by hand - a back-to-school kit, a college kit. It is not a product and
// it is not a category: it owns nothing, it only points at products, so
// editing or repricing a product changes what the package is worth without
// anybody having to touch the package.

/** One line of a package: a catalog product, and how many of it are in. */
export interface PackageItem {
  /** References Product.id. A product that has since been deleted is simply
   *  dropped when the contents are resolved - see packageContents. */
  product_id: number;
  quantity: number;
}

export interface Package {
  id: number;
  name: string;
  /** Arabic name; falls back to `name`. */
  name_ar?: string;
  /** A line about who the package is for. Optional. */
  description?: string;
  description_ar?: string;
  image_url: string;
  /**
   * A second photograph, cropped for a narrow screen. A banner composed for
   * a wide slide loses its subject when the same file is squeezed onto a
   * phone, so the shop supplies the phone crop rather than trusting one file
   * to serve both. Blank means the wide one is used at every size.
   */
  image_url_mobile?: string;
  /**
   * What the whole package sells for. Set by hand in the admin rather than
   * derived from the contents: the point of a package is that it costs less
   * than its parts, and by how much is the shop's decision.
   */
  price: number;
  /**
   * The struck-through "was" price. The admin fills it from the contents at
   * full price with one tap (see packageValue), but it stays a stored number:
   * a saving that silently re-computed itself whenever a product was repriced
   * would be a different promise from the one the shopper was shown.
   */
  old_price?: number;
  /** Off the storefront while false. The admin always sees it. */
  active: boolean;
  display_order: number;
  items: PackageItem[];
}

/** The editable payload for creating or updating a package. */
export type PackageInput = Omit<Package, "id">;

/**
 * The product id a package borrows on a cart or order line.
 *
 * Cart lines, order lines and receipts all identify what was bought by
 * `product_id`, and a package has to travel through every one of them. Real
 * product ids are always positive, so a package takes the negative of its own
 * id: the two can never collide, `order_items.product_id` has no foreign key
 * to defend, and nothing downstream of the cart needs to know packages exist.
 */
export function packageLineId(packageId: number): number {
  return -packageId;
}

/** The code a package carries on the receipt. */
export function packageCode(pkg: Pick<Package, "id">): string {
  return `PKG${pkg.id}`;
}

/**
 * A package dressed as a product, so it can go through the cart, the checkout
 * and the receipt on the same rails as everything else. It has no variants
 * and no stock - a package is sold as itself, and what limits it is whether
 * its contents are on the shelf, which the shop judges rather than the app.
 */
export function packageAsProduct(pkg: Package): Product {
  return {
    id: packageLineId(pkg.id),
    name: pkg.name,
    name_ar: pkg.name_ar,
    code: packageCode(pkg),
    price: pkg.price,
    old_price: pkg.old_price,
    image_url: pkg.image_url,
    // Packages sit outside the brand/category grouping entirely.
    category_id: 0,
    description: pkg.description,
    description_ar: pkg.description_ar,
  };
}

/**
 * What is actually in a package right now, resolved against the catalog.
 * A line whose product has since been deleted is dropped rather than shown as
 * a blank: the package keeps selling, it just lists one thing fewer.
 */
export function packageContents(
  pkg: Pick<Package, "items">,
  products: Product[],
): { product: Product; quantity: number }[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const out: { product: Product; quantity: number }[] = [];
  for (const item of pkg.items) {
    const product = byId.get(item.product_id);
    if (product) out.push({ product, quantity: Math.max(1, item.quantity) });
  }
  return out;
}

/** What the contents would cost bought separately, at today's prices. */
export function packageValue(
  pkg: Pick<Package, "items">,
  products: Product[],
): number {
  return packageContents(pkg, products).reduce(
    (sum, { product, quantity }) => sum + product.price * quantity,
    0,
  );
}

/** How many items a package holds, counting quantities. */
export function packageItemCount(pkg: Pick<Package, "items">): number {
  return pkg.items.reduce((sum, it) => sum + Math.max(1, it.quantity), 0);
}

/**
 * The picture to show for a package: its own, or failing that the first photo
 * among its contents. A kit assembled out of products the shop has already
 * photographed should not need a photo shoot of its own before it can go on
 * the home page - and setting a photo on the package still wins.
 */
export function packageImage(
  pkg: Pick<Package, "image_url" | "image_url_mobile" | "items">,
  products: Product[],
): string {
  const own = photoPair(pkg).wide;
  if (own) return own;
  const withPhoto = packageContents(pkg, products).find(
    (c) => c.product.image_url,
  );
  return withPhoto?.product.image_url ?? "";
}

// ── The home deck ───────────────────────────────────────────────────
//
// The slideshow the home screen opens with. Packages bring their own slides
// and are edited on the Packages page; the two that are not packages - the
// brief and the discount ad - are edited here.
//
// Every copy field works the same way: blank means "use the built-in wording",
// which is the shipped translation in the reader's language. So a shop that
// never opens this page keeps the copy it has today in both languages, and one
// that writes its own gets exactly what it wrote. That is why these are not
// seeded with the current English text: seeding it would silently throw away
// the Arabic.

/** One editable slide. `_ar` twins fall back to the base field, as everywhere. */
export interface DeckSlide {
  /** Off the deck entirely while false. */
  enabled: boolean;
  /**
   * A photograph for the whole slide. When set, the slide is drawn the way a
   * package with its own photo is - the picture edge to edge and the copy on
   * a scrim over it - instead of copy beside a row of product plates.
   */
  image_url: string;
  /** The same picture cropped for a phone. Blank falls back to image_url. */
  image_url_mobile: string;
  eyebrow: string;
  eyebrow_ar: string;
  /** The headline. Line breaks are kept. */
  title: string;
  title_ar: string;
  body: string;
  body_ar: string;
}

export interface HomeDeck {
  brief: DeckSlide & {
    /** The product / brand / category counts under the lede. */
    stats: boolean;
  };
  offer: DeckSlide & {
    /**
     * The figure the ad claims, e.g. 40 for "Discounts up to 40%". Written
     * into both the slide and the popup, so the two cannot disagree - and
     * substituted for {n} in a title the shop writes itself.
     */
    percent: number;
  };
}

const BLANK_SLIDE = {
  enabled: true,
  image_url: "",
  image_url_mobile: "",
  eyebrow: "",
  eyebrow_ar: "",
  title: "",
  title_ar: "",
  body: "",
  body_ar: "",
};

/** What a shop that has never touched the page gets: today's deck, unchanged. */
export const DEFAULT_DECK: HomeDeck = {
  brief: { ...BLANK_SLIDE, stats: true },
  offer: { ...BLANK_SLIDE, percent: 40 },
};

// ── The two photographs a banner can carry ──────────────────────────
//
// A slide and a package each hold a wide photograph and, optionally, a second
// one cropped for a phone. A banner composed for a wide frame loses its
// subject when the same file is squeezed onto a narrow screen, so the shop
// supplies the phone crop rather than trusting one file to serve both.

/** A wide photograph and its phone crop, ready for a <picture> element. */
export interface ResponsivePhoto {
  /** The wide photograph. Empty when nothing has been uploaded at all. */
  wide: string;
  /** The phone crop, when the shop has supplied one. */
  mobile?: string;
}

/** Where the phone crop gives way to the wide photograph. Matches `sm`. */
export const MOBILE_PHOTO_QUERY = "(max-width: 639.98px)";

/**
 * The pair, normalised.
 *
 * A phone crop uploaded on its own still counts as having a photograph: it is
 * shown at every width rather than leaving the slide with nothing, which is
 * what somebody who uploaded only one file plainly meant.
 */
export function photoPair(source: {
  image_url?: string;
  image_url_mobile?: string;
}): ResponsivePhoto {
  const wide = source.image_url?.trim() ?? "";
  const mobile = source.image_url_mobile?.trim() ?? "";
  return { wide: wide || mobile, mobile: mobile || undefined };
}

/** True when either photograph has been supplied. */
export function hasPhoto(source: {
  image_url?: string;
  image_url_mobile?: string;
}): boolean {
  return photoPair(source).wide !== "";
}
