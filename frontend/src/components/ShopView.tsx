"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Category,
  Product,
  ProductCategory,
  Package,
  priceRange,
  isDiscounted,
  packageLineId,
  packageAsProduct,
  HomeDeck,
  DEFAULT_DECK,
} from "@/types";
import {
  fetchProducts,
  fetchProductCategories,
  fetchPackages,
  fetchHomeDeck,
} from "@/lib/api";
import { useCart } from "@/lib/useCart";
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  X,
  Home,
  Store,
} from "lucide-react";
import ConsultationForm from "./ConsultationForm";
import ConsultationInvite from "./ConsultationInvite";
import HomeCarousel from "./HomeCarousel";
import PackageDetailModal from "./PackageDetailModal";
import ProductCard from "./ProductCard";
import ProductDetailModal from "./ProductDetailModal";
import CartPanel from "./CartPanel";
import OrderConfirmation from "./OrderConfirmation";
import FinderBar from "./FinderBar";
import InstallPrompt from "./InstallPrompt";
import OfferPopup from "./OfferPopup";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import { useI18n } from "@/lib/LanguageProvider";
import { localized, MessageKey } from "@/lib/i18n";

/** Products on the home screen's shelf - a taste of the catalogue, not it. */
const HOME_ITEMS = 6;

/**
 * The views. "consult" is deliberately absent from TABS below: it is a form
 * somebody is invited into from the home screen, not a place they live, so it
 * does not earn a permanent seat on the phone bar.
 *
 * There is no "browse" view any more. Filtering happens in the FinderBar
 * directly above the grid, so narrowing the catalogue no longer means leaving
 * the products to do it.
 */
type Tab = "home" | "consult" | "store" | "cart";

const TABS: { id: Tab; icon: typeof Home; key: MessageKey }[] = [
  { id: "home", icon: Home, key: "shop.home" },
  { id: "store", icon: Store, key: "shop.store" },
  { id: "cart", icon: ShoppingCart, key: "common.cart" },
];

export default function ShopView() {
  const { t, lang } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The two filters stack: brand AND category, each cleared on its own.
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");
  const [activeType, setActiveType] = useState<number | "all">("all");
  // The finder's panel - brands and the price range - starts shut. The chips
  // that get used every day are already out in the open above it.
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Set by the discount ad, and cleared like any other filter.
  const [offersOnly, setOffersOnly] = useState(false);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [deck, setDeck] = useState<HomeDeck>(DEFAULT_DECK);
  const [query, setQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailPackage, setDetailPackage] = useState<Package | null>(null);
  // The phone shell scrolls this element, not the document, so every tab
  // change has to put it back at the top itself.
  const bodyRef = useRef<HTMLDivElement>(null);
  // The one search field on a phone. The home screen's is a doorway to it,
  // not a second field, so tapping there lands the caret in this one.
  const searchRef = useRef<HTMLInputElement>(null);
  // Set by the home screen's search doorway, read once the store is on screen.
  const wantSearchFocus = useRef(false);

  const load = useCallback(async () => {
    try {
      const [cats, types, pkgs, deckCopy] = await Promise.all([
        fetchProducts(),
        // A shop that has never set a category still works; the filter just
        // has nothing to offer, so this must not take the catalogue down.
        fetchProductCategories().catch(() => [] as ProductCategory[]),
        // Same again: a shop with no packages is the normal case, and the
        // deck simply runs without those slides.
        fetchPackages().catch(() => [] as Package[]),
        // Same again: the deck has built-in copy to fall back on, so failing
        // to read the shop's own wording must not take the storefront down.
        fetchHomeDeck().catch(() => DEFAULT_DECK),
      ]);
      setCategories(cats);
      setProductCategories(types);
      setPackages(pkgs);
      setDeck(deckCopy);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Home-screen shortcuts (see public/manifest.json) open the app straight on
  // a tab: /?tab=store, /?tab=cart, and /?tab=store&offers=1 for the offers
  // shortcut. /?tab=consult is the same door, and gives the consultation form
  // a link the shop can hand out on its own.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get("tab");
    if (wanted === "store" || wanted === "cart" || wanted === "consult") {
      // Read after mount, not during render: the server has no URL search to
      // read from, and picking the tab while rendering would break hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(wanted);
    }
    if (params.get("offers") === "1") setOffersOnly(true);
  }, []);

  // Putting the caret in the search field, once the store tab it lives on has
  // actually been committed to the screen. Doing it in the click handler
  // instead would aim at a field that is still display:none.
  useEffect(() => {
    if (tab !== "store" || !wantSearchFocus.current) return;
    wantSearchFocus.current = false;
    searchRef.current?.focus();
  }, [tab]);

  const cart = useCart(load);

  const allProducts = categories.flatMap((cat) => cat.products);

  // The home screen shows a handful of the catalogue rather than none of it.
  // What is on offer leads, since that is what the deck above has just been
  // advertising; the rest of the row is whatever comes next.
  const featured = [
    ...allProducts.filter(isDiscounted),
    ...allProducts.filter((p) => !isDiscounted(p)),
  ].slice(0, HOME_ITEMS);
  const byBrand =
    activeCategory === "all"
      ? allProducts
      : allProducts.filter((p) => p.category_id === activeCategory);
  const byCategory = (
    activeType === "all"
      ? byBrand
      : byBrand.filter((p) => p.product_category_id === activeType)
  ).filter((p) => !offersOnly || isDiscounted(p));
  const q = query.trim().toLowerCase();
  // Match either name, so an Arabic query still finds a product whose card
  // shows the English name and vice versa.
  const bySearch = q
    ? byCategory.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.name_ar ?? "").toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q)
      )
    : byCategory;

  // Price range filter (IQD). Empty inputs mean "no bound".
  const min = minPrice.trim() === "" ? null : Number(minPrice);
  const max = maxPrice.trim() === "" ? null : Number(maxPrice);
  const priceActive =
    (min !== null && Number.isFinite(min)) ||
    (max !== null && Number.isFinite(max));
  const visibleProducts = priceActive
    ? bySearch.filter((p) => {
        // A product sold in options is in range when any option is: hiding
        // one whose 50 ml size costs what the shopper asked for, because its
        // 200 ml size doesn't, would be the wrong answer.
        const { min: lo, max: hi } = priceRange(p);
        if (min !== null && Number.isFinite(min) && hi < min) return false;
        if (max !== null && Number.isFinite(max) && lo > max) return false;
        return true;
      })
    : bySearch;

  // Bounds across the whole catalog, used as input placeholders.
  const priceBounds = allProducts.reduce(
    (acc, p) => {
      const { min: lo, max: hi } = priceRange(p);
      return { min: Math.min(acc.min, lo), max: Math.max(acc.max, hi) };
    },
    { min: Infinity, max: 0 }
  );
  const activeCat = categories.find((c) => c.id === activeCategory);
  const activeTypeCat = productCategories.find((c) => c.id === activeType);
  // Whichever filters are on, named. Both on reads "COSRX · Serum".
  const activeName =
    [
      activeCat ? localized(activeCat, "name", lang) : null,
      activeTypeCat ? localized(activeTypeCat, "name", lang) : null,
    ]
      .filter(Boolean)
      .join(" · ") || t("shop.allProducts");
  /** How many filters are narrowing the grid, for the badge on the pill.
   *  The search term is not one of them: it is visible in its own field. */
  const filtersOn =
    (activeCategory === "all" ? 0 : 1) +
    (activeType === "all" ? 0 : 1) +
    (offersOnly ? 1 : 0) +
    (priceActive ? 1 : 0);
  /** Anything actually discounted? The ad only runs when there is. */
  const hasOffers = allProducts.some(isDiscounted);

  const goTab = (next: Tab) => {
    setTab(next);
    bodyRef.current?.scrollTo({ top: 0 });
  };

  const goToCatalog = () => {
    goTab("store");
    // Desktop keeps its single scrolling page - bring the grid into view.
    document
      .getElementById("catalog")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pickCategory = (id: number | "all") => {
    setActiveCategory(id);
    goToCatalog();
  };

  /** Take the shopper to the products that are actually on offer. */
  const showOffers = () => {
    setOffersOnly(true);
    setActiveCategory("all");
    setActiveType("all");
    goToCatalog();
  };

  /** Open the store with the filter panel already down. */
  const goToFilters = () => {
    goToCatalog();
    setFiltersOpen(true);
  };

  /** The home screen's search doorway: one field, and it lives in the store.
   *  The caret is placed by the effect above, once the store is on screen -
   *  the field is display:none until then and cannot take focus. */
  const goToSearch = () => {
    wantSearchFocus.current = true;
    goTab("store");
  };

  const clearFilters = () => {
    setActiveCategory("all");
    setActiveType("all");
    setOffersOnly(false);
    setMinPrice("");
    setMaxPrice("");
    setQuery("");
  };

  if (loading) {
    return (
      <div className="shop flex min-h-screen flex-col items-center justify-center gap-4 bg-paper">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
        <p className="label-caps text-ink-3">{t("shop.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shop flex min-h-screen items-center justify-center bg-paper p-6">
        <div className="max-w-sm rounded-lg border border-rose/25 bg-surface p-8 text-center">
          <p className="font-display text-lg font-semibold text-rose">
            {t("shop.loadFailed")}
          </p>
          <p className="mt-2 text-xs text-ink-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 h-10 rounded-md bg-ink px-6 text-xs font-bold uppercase tracking-[0.14em] text-paper transition hover:bg-brand"
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  if (cart.order) {
    return (
      <div className="shop">
        <OrderConfirmation order={cart.order} onBack={cart.reset} />
      </div>
    );
  }

  const submitOrder = async () => {
    await cart.submit();
    setCartOpen(false);
  };

  const cartPanel = (
    <CartPanel
      items={cart.items}
      notes={cart.notes}
      onNotesChange={cart.setNotes}
      customer={cart.customer}
      onCustomerChange={cart.setCustomerField}
      discount={cart.discount}
      onDiscountChange={cart.setDiscount}
      onQtyChange={cart.setQty}
      onSubmit={submitOrder}
      onClear={cart.clear}
      submitting={cart.submitting}
      submitError={cart.submitError}
      customerMode
    />
  );

  // A package reaches the basket as a single line, by borrowing a product id
  // of its own. Both the deck and the shelf below it go through these, so the
  // two always agree about what is in the basket. See packageAsProduct.
  const addPackage = (pkg: Package) => cart.add(packageAsProduct(pkg));
  const removePackage = (pkg: Package) => cart.remove(packageAsProduct(pkg));
  const packageQty = (pkg: Package) =>
    cart.qtyOf(packageLineId(pkg.id), undefined, false);

  /** The desktop header's search. The phone's lives in the FinderBar, right
   *  above the products it filters. */
  const renderSearch = (className = "") => (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("shop.searchPlaceholder")}
        aria-label={t("shop.searchAria")}
        className="h-11 w-full rounded-full border border-line bg-surface ps-10 pe-9 text-sm text-ink
                   outline-none transition placeholder:text-ink-3
                   focus:border-brand/50 focus:ring-2 focus:ring-brand/15"
      />
      {query && (
        <button
          onClick={() => setQuery("")}
          aria-label={t("common.clearSearch")}
          className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-3 transition hover:bg-sunken hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  const byType =
    activeType === "all"
      ? allProducts
      : allProducts.filter((p) => p.product_category_id === activeType);

  const typeOptions = [
    { id: "all" as const, name: t("browse.all"), count: byBrand.length },
    ...productCategories.map((c) => ({
      id: c.id,
      name: localized(c, "name", lang),
      count: byBrand.filter((p) => p.product_category_id === c.id).length,
    })),
  ];

  const brandOptions = [
    { id: "all" as const, name: t("browse.all"), count: byType.length },
    ...categories.map((c) => ({
      id: c.id,
      name: localized(c, "name", lang),
      count: byType.filter((p) => p.category_id === c.id).length,
    })),
  ];

  /* The finder is rendered twice from one set of state: docked at the foot of
     the phone shell, inline above the grid on desktop. Only one of the two is
     ever on screen, and because every control here is driven from this
     component they cannot disagree. */
  const finderProps = {
    query,
    onQuery: setQuery,
    categories: typeOptions,
    brands: brandOptions,
    activeCategory: activeType,
    activeBrand: activeCategory,
    onPickCategory: setActiveType,
    onPickBrand: setActiveCategory,
    hasOffers,
    offersOnly,
    onToggleOffers: () => setOffersOnly((v) => !v),
    minPrice,
    maxPrice,
    onMinPrice: setMinPrice,
    onMaxPrice: setMaxPrice,
    priceBounds,
    resultCount: visibleProducts.length,
    filtersOn,
    onClearAll: clearFilters,
    open: filtersOpen,
    onOpenChange: setFiltersOpen,
  };

  return (
    <div className="shop app-shell bg-paper">
      {/* ── Top app bar ─────────────────────────────────────────────────
          Fixed furniture on a phone; a sticky site header from `sm` up. On
          the home tab it joins that tab's dark canvas. */}
      <header
        className={`z-40 shrink-0 border-b border-line bg-paper/90 backdrop-blur-md sm:sticky sm:top-0 ${
          tab === "home" ? "home-canvas" : ""
        }`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-5 sm:py-4">
          {/* Logo - the wordmark is near-black, so the dark theme gets its
              own cream cut of the same mark (see scripts/logo-velina.mjs) */}
          <button
            onClick={() => goTab("home")}
            className="flex shrink-0 items-center text-start"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/velina-logo.png"
              alt={t("common.brand")}
              className="logo-light h-11 w-auto sm:h-14"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/velina-logo-dark.png"
              alt=""
              aria-hidden
              className="logo-dark h-11 w-auto sm:h-14"
            />
          </button>

          {/* Desktop search - center */}
          {renderSearch("mx-auto hidden w-full max-w-md sm:block")}

          {/* Utilities */}
          <nav className="ms-auto flex shrink-0 items-center gap-1.5 sm:ms-0">
            <LanguageToggle />
            <ThemeToggle />
            {/* The phone reaches the cart from the tab bar instead. */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative ms-1 hidden h-11 items-center gap-2 rounded-full bg-brand px-5 text-on-brand
                         transition hover:bg-brand-deep active:scale-[0.98] sm:flex"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="label-caps hidden sm:inline">
                {t("common.cart")}
              </span>
              {cart.totalQty > 0 && (
                <span className="pop flex h-5 min-w-5 items-center justify-center rounded-full bg-copper px-1.5 text-[10px] font-bold text-paper">
                  {cart.totalQty}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* ── Scrolling region ────────────────────────────────────────── */}
      <div ref={bodyRef} className="app-body">
        {/* Home tab - phone only. A front screen, not a landing page. */}
        {tab === "home" && (
          <div className="tab-in sm:hidden">
            {/* Canvas - search and the shop's opening line, on the same dark
                ground as the bar above it */}
            <section className="home-canvas home-canvas-hero px-4 pb-12 pt-4">
              {/* A doorway, not a second search field. Typing here used to
                  filter a grid that was one tab away and out of sight; tapping
                  it now opens the store with the caret already in the field,
                  so a search always shows its results. */}
              <button
                type="button"
                onClick={goToSearch}
                className="flex h-11 w-full items-center gap-2.5 rounded-full border border-line bg-surface ps-3.5 pe-4 text-start
                           transition active:scale-[0.99]"
              >
                <Search className="h-4 w-4 shrink-0 text-ink-3" />
                <span className="truncate text-sm text-ink-3">
                  {t("shop.searchPlaceholder")}
                </span>
              </button>

              {/* The deck says what the shop is, what it has put together,
                  and what is discounted - in place of a headline that could
                  only say the first. */}
              <div className="mt-5">
                <HomeCarousel
                  products={allProducts}
                  packages={packages}
                  deck={deck}
                  productCategories={productCategories}
                  brandCount={categories.length}
                  categoryCount={productCategories.length}
                  onShopAll={() => pickCategory("all")}
                  onShopOffers={showOffers}
                  onBrowse={goToFilters}
                  onOpenProduct={setDetailProduct}
                  onAddPackage={addPackage}
                  onOpenPackage={setDetailPackage}
                  packageQty={packageQty}
                />
              </div>
            </section>

            {/* Sheet - the rest of the home screen rides up over the canvas */}
            <div className="home-sheet relative -mt-7 bg-paper pb-8 pt-6">
              {/* The shop's own offer to help, straight under the deck: it is
                  what to do when the slides have not answered the question.
                  The form itself is a page of its own - this is the way in. */}
              <div className="px-4">
                <ConsultationInvite onOpen={() => goTab("consult")} />
              </div>

              {/* A few real products, so the home screen shows the shop
                  rather than only describing it. */}
              {featured.length > 0 && (
                <section className="mt-8 px-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                      {t("shop.featured")}
                    </h2>
                    <button
                      onClick={() => pickCategory("all")}
                      className="text-xs font-semibold text-brand active:scale-95"
                    >
                      {t("home.seeAll")}
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {featured.map((product, i) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        qtyOf={(vid) => cart.qtyOf(product.id, vid, false)}
                        mode="shop"
                        onAdd={cart.add}
                        onRemove={cart.remove}
                        onOpenDetail={setDetailProduct}
                        index={i}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Small print - the app equivalent of the site footer */}
              <div className="mt-8 px-4">
                <p className="text-center text-[11px] text-ink-3">
                  {t("shop.copyright")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Consultation - a page of its own rather than another panel on the
            home screen: it is a form somebody sits down to fill in, and it
            deserves the whole width without the shop scrolling past it. */}
        {tab === "consult" && (
          <div className="tab-in mx-auto w-full max-w-3xl px-4 py-6 sm:px-5 sm:py-10">
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => goTab("home")}
                aria-label={t("common.close")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-2 transition hover:bg-sunken hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ConsultationForm />
          </div>
        )}

        {/* Cart tab - phone only; the desktop uses the drawer. */}
        {tab === "cart" && (
          <div className="tab-in h-full sm:hidden">{cartPanel}</div>
        )}

        {/* Hero - desktop only; the phone has its home tab instead. It is
            part of the home view, so it steps aside for the form. */}
        <section
          className={`shop-hero hidden border-b border-line ${tab === "consult" ? "" : "sm:block"}`}
        >
          <div className="mx-auto max-w-7xl px-5 py-10 lg:py-14">
            <div className="rise">
              <HomeCarousel
                products={allProducts}
                packages={packages}
                deck={deck}
                productCategories={productCategories}
                brandCount={categories.length}
                categoryCount={productCategories.length}
                onShopAll={goToCatalog}
                onShopOffers={showOffers}
                onBrowse={goToFilters}
                onOpenProduct={setDetailProduct}
                onAddPackage={addPackage}
                onOpenPackage={setDetailPackage}
                packageQty={packageQty}
              />

              <div className="mt-8">
                <ConsultationInvite onOpen={() => goTab("consult")} />
              </div>
            </div>
          </div>
        </section>

        {/* Catalog - the store tab on a phone, the page body on desktop */}
        <main
          id="catalog"
          className={`mx-auto max-w-7xl scroll-mt-24 px-4 pb-10 pt-4 sm:px-5 sm:py-10 ${
            tab === "store" ? "" : "hidden"
          } ${tab === "consult" ? "" : "sm:block"}`}
        >
          {/* Desktop only. The phone's copy of this is docked at the foot of
              the shell, below the grid it filters. */}
          <FinderBar {...finderProps} placement="inline" />

          {/* What the finder currently adds up to, and how much of the
              catalogue answers to it. */}
          <div className="mb-5 mt-4 flex items-baseline justify-between gap-4 sm:mb-6">
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              <bdi>{activeName}</bdi>
            </h2>
            <span className="label-caps shrink-0 text-ink-3">
              {visibleProducts.length}{" "}
              {visibleProducts.length === 1
                ? t("common.item")
                : t("common.items")}
            </span>
          </div>

          {visibleProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-line-strong text-ink-3">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <p className="text-sm font-medium text-ink-2">
                {q
                  ? t("shop.noMatch", { q: query })
                  : priceActive
                    ? t("shop.noInRange")
                    : t("shop.noneYet")}
              </p>
              <p className="text-xs text-ink-3">
                {q
                  ? t("shop.tryAnother")
                  : priceActive
                    ? t("shop.tryWiden")
                    : t("shop.addFromAdmin")}
              </p>
            </div>
          ) : (
            <div
              key={`${String(activeCategory)}-${q}`}
              className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5"
            >
              {visibleProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  qtyOf={(vid) => cart.qtyOf(product.id, vid, false)}
                  mode="shop"
                  onAdd={cart.add}
                  onRemove={cart.remove}
                  onOpenDetail={setDetailProduct}
                  index={i}
                />
              ))}
            </div>
          )}
        </main>

        {/* Footer - desktop only */}
        <footer className="hidden border-t border-line bg-surface sm:block">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center">
            <div>
              <span className="font-display text-xl font-semibold tracking-tight text-ink">
                {t("common.brand")}
                <span className="text-brand">.</span>
              </span>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-ink-3">
                {t("shop.footerBlurb")}
              </p>
            </div>
          </div>
          <div className="border-t border-line/70">
            <div className="mx-auto max-w-7xl px-5 py-4">
              <p className="text-[11px] text-ink-3">{t("shop.copyright")}</p>
            </div>
          </div>
        </footer>
      </div>

      {/* Add-to-home-screen invitation, docked above the tab bar */}
      <InstallPrompt />

      {/* The discount ad. Only over the home screen, and only when there is
          something to advertise - an ad for offers that do not exist is
          worse than no ad. */}
      {tab === "home" && hasOffers && (
        <OfferPopup onShop={showOffers} percent={deck.offer.percent} />
      )}

      {/* ── Finder - phone only ─────────────────────────────────────────
          Docked between the grid and the tab bar, outside the scrolling
          region, so search and the filters are always within a thumb's reach
          of the products they narrow. Store tab only: there is nothing to
          filter on the other two. */}
      {tab === "store" && (
        <FinderBar {...finderProps} searchRef={searchRef} placement="docked" />
      )}

      {/* ── Tab bar - phone only ────────────────────────────────────── */}
      <nav
        className="z-40 shrink-0 border-t border-line bg-surface/95 backdrop-blur-md sm:hidden"
        style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
      >
        <div className="grid grid-cols-3">
          {TABS.map(({ id, icon: Icon, key }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => goTab(id)}
                aria-label={t(key)}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 pb-1.5 pt-2 transition active:scale-95"
              >
                <span
                  className={`relative flex h-7 w-14 items-center justify-center rounded-full transition-colors ${
                    active ? "bg-brand/12 text-brand" : "text-ink-3"
                  }`}
                >
                  <Icon
                    className="h-[18px] w-[18px]"
                    strokeWidth={active ? 2.4 : 1.9}
                  />
                  {id === "cart" && cart.totalQty > 0 && (
                    <span className="absolute -end-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-copper px-1 text-[9px] font-bold text-paper">
                      {cart.totalQty}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    active ? "text-brand" : "text-ink-3"
                  }`}
                >
                  {t(key)}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Cart - side drawer on desktop */}
      {cartOpen && (
        <div className="fade-in fixed inset-0 z-50 hidden justify-end bg-ink/45 backdrop-blur-[2px] sm:flex">
          <div className="flex-1" onClick={() => setCartOpen(false)} />
          <div className="slide-in-right flex h-full w-full max-w-md flex-col border-s border-line bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line bg-sunken/50 px-5 py-3.5">
              <span className="label-caps text-ink-2">{t("cart.checkout")}</span>
              <button
                onClick={() => setCartOpen(false)}
                aria-label={t("shop.closeCart")}
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 transition hover:bg-sunken hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">{cartPanel}</div>
          </div>
        </div>
      )}

      {/* Package detail - opened from a slide in the deck. Rendered before
          the product view on purpose: tapping one of the contents opens that
          product on top of this, and closing it comes back here. */}
      {detailPackage && (
        <PackageDetailModal
          pkg={detailPackage}
          products={allProducts}
          qty={packageQty(detailPackage)}
          onClose={() => setDetailPackage(null)}
          onAdd={addPackage}
          onRemove={removePackage}
          onOpenProduct={setDetailProduct}
          layered={!!detailProduct}
        />
      )}

      {/* Product detail - opened by tapping a product card */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          qtyOf={(vid) => cart.qtyOf(detailProduct.id, vid, false)}
          onClose={() => setDetailProduct(null)}
          onAdd={cart.add}
          onRemove={cart.remove}
        />
      )}
    </div>
  );
}
