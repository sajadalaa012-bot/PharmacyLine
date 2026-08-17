"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Category, Product, isOutOfStock } from "@/types";
import { fetchProducts } from "@/lib/api";
import { useCart } from "@/lib/useCart";
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  X,
  ArrowRight,
  Truck,
  ShieldCheck,
  Sparkles,
  Home,
  Store,
  Lock,
  SlidersHorizontal,
  ClipboardList,
  ChevronRight,
} from "lucide-react";
import ProductCard from "./ProductCard";
import ProductDetailModal from "./ProductDetailModal";
import CartPanel from "./CartPanel";
import OrderConfirmation from "./OrderConfirmation";
import OrderHistory from "./OrderHistory";
import InstallPrompt from "./InstallPrompt";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import { useI18n } from "@/lib/LanguageProvider";
import { localized, MessageKey } from "@/lib/i18n";
import { num } from "@/lib/format";

const TRUST: { icon: typeof Truck; key: MessageKey }[] = [
  { icon: Truck, key: "shop.trustDelivery" },
  { icon: ShieldCheck, key: "shop.trustAuthentic" },
  { icon: Sparkles, key: "shop.trustCurated" },
];

/** The four destinations of the phone tab bar. */
type Tab = "home" | "store" | "cart" | "orders";

const TABS: { id: Tab; icon: typeof Home; key: MessageKey }[] = [
  { id: "home", icon: Home, key: "shop.home" },
  { id: "store", icon: Store, key: "shop.store" },
  { id: "cart", icon: ShoppingCart, key: "common.cart" },
  { id: "orders", icon: ClipboardList, key: "common.orders" },
];

/** Products worth putting on the front screen: in stock, newest first. */
const FEATURED_COUNT = 10;

export default function ShopView() {
  const { t, lang } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [cartTab, setCartTab] = useState<"cart" | "orders">("cart");
  const [tab, setTab] = useState<Tab>("home");
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  // The phone shell scrolls this element, not the document, so every tab
  // change has to put it back at the top itself.
  const bodyRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setCategories(await fetchProducts());
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
  // a tab: /?tab=store, /?tab=cart.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("tab");
    if (wanted === "store" || wanted === "cart" || wanted === "orders") {
      // Read after mount, not during render: the server has no URL search to
      // read from, and picking the tab while rendering would break hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(wanted);
    }
  }, []);

  const cart = useCart(load);

  const allProducts = categories.flatMap((cat) => cat.products);
  const byCategory =
    activeCategory === "all"
      ? allProducts
      : allProducts.filter((p) => p.category_id === activeCategory);
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
        if (min !== null && Number.isFinite(min) && p.price < min) return false;
        if (max !== null && Number.isFinite(max) && p.price > max) return false;
        return true;
      })
    : bySearch;

  // Bounds across the whole catalog, used as input placeholders.
  const priceBounds = allProducts.reduce(
    (acc, p) => ({
      min: Math.min(acc.min, p.price),
      max: Math.max(acc.max, p.price),
    }),
    { min: Infinity, max: 0 }
  );
  const clearPrice = () => {
    setMinPrice("");
    setMaxPrice("");
  };

  const featured = allProducts
    .filter((p) => !isOutOfStock(p))
    .slice(0, FEATURED_COUNT);

  const activeCat = categories.find((c) => c.id === activeCategory);
  const activeName =
    activeCategory === "all"
      ? t("shop.allProducts")
      : activeCat
        ? localized(activeCat, "name", lang)
        : t("shop.products");

  const chips = [
    { id: "all" as const, name: t("common.all") },
    ...categories.map((c) => ({ id: c.id, name: localized(c, "name", lang) })),
  ];

  const goTab = (next: Tab) => {
    setTab(next);
    bodyRef.current?.scrollTo({ top: 0 });
  };

  const goToCatalog = () => {
    goTab("store");
    // Desktop keeps its single scrolling page — bring the grid into view.
    document
      .getElementById("catalog")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pickCategory = (id: number | "all") => {
    setActiveCategory(id);
    goToCatalog();
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

  // Cart drawer tabs (desktop): the live cart vs. this device's order history.
  const cartTabs = (
    <div className="flex items-center gap-1">
      {(["cart", "orders"] as const).map((pane) => (
        <button
          key={pane}
          onClick={() => setCartTab(pane)}
          className={`label-caps rounded-md px-3 py-1.5 transition ${
            cartTab === pane
              ? "bg-brand text-on-brand"
              : "text-ink-2 hover:bg-sunken"
          }`}
        >
          {pane === "cart" ? t("common.cart") : t("common.myOrders")}
        </button>
      ))}
    </div>
  );

  const drawerBody = cartTab === "cart" ? cartPanel : <OrderHistory />;

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

  const categoryStrip = (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      {chips.map((chip) => {
        const active = activeCategory === chip.id;
        return (
          <button
            key={String(chip.id)}
            onClick={() => pickCategory(chip.id)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition active:scale-95 ${
              active
                ? "border-brand bg-brand text-white"
                : "border-line-strong bg-transparent text-ink"
            }`}
          >
            <bdi>{chip.name}</bdi>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="shop app-shell bg-paper">
      {/* ── Top app bar ─────────────────────────────────────────────────
          Fixed furniture on a phone; a sticky site header from `sm` up. */}
      <header
        className="z-40 shrink-0 border-b border-line bg-paper/90 backdrop-blur-md sm:sticky sm:top-0"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-5 sm:py-4">
          {/* Logo */}
          <button
            onClick={() => goTab("home")}
            className="flex shrink-0 items-center gap-2 text-start"
          >
            <img
              src="/icons/almasa-logo.png"
              alt="AL-MASA"
              className="h-10 w-auto sm:h-12"
            />
          </button>

          {/* Desktop search — center */}
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
                <span className="pop flex h-5 min-w-5 items-center justify-center rounded-full bg-copper px-1.5 text-[10px] font-bold text-white">
                  {cart.totalQty}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* ── Scrolling region ────────────────────────────────────────── */}
      <div ref={bodyRef} className="app-body">
        {/* Home tab — phone only. A front screen, not a landing page. */}
        {tab === "home" && (
          <div className="tab-in pb-8 sm:hidden">
            <div className="px-4 pt-4">{renderSearch()}</div>

            {/* Hero card */}
            <section className="px-4 pt-4">
              <div className="relative overflow-hidden rounded-3xl bg-brand px-5 py-6 text-on-brand">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -end-10 -top-16 h-44 w-44 rounded-full bg-white/10"
                />
                <span className="label-caps text-on-brand/75">
                  {t("shop.eyebrow")}
                </span>
                <h1 className="mt-2 font-display text-[28px] font-semibold leading-[1.15] tracking-tight">
                  {t("shop.headline1")}
                  <br />
                  {t("shop.headline2")}
                </h1>
                <button
                  onClick={() => pickCategory("all")}
                  className="mt-5 flex h-11 items-center gap-2 rounded-full bg-surface px-5 text-sm font-semibold text-brand transition active:scale-[0.97]"
                >
                  {t("shop.ctaShop")}
                  <ArrowRight className="h-4 w-4 flip-rtl" />
                </button>

                <div className="mt-6 flex items-center gap-5 border-t border-white/20 pt-4">
                  <div>
                    <p className="font-display text-2xl font-semibold leading-none tabular-nums">
                      {allProducts.length}
                    </p>
                    <p className="mt-1 text-[11px] text-on-brand/75">
                      {t("shop.productsInStock")}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-white/25" />
                  <div>
                    <p className="font-display text-2xl font-semibold leading-none tabular-nums">
                      {categories.length}
                    </p>
                    <p className="mt-1 text-[11px] text-on-brand/75">
                      {t("shop.categories")}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Categories */}
            <section className="pt-7">
              <div className="flex items-center justify-between px-4 pb-3">
                <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                  {t("shop.browseCategories")}
                </h2>
                <button
                  onClick={() => pickCategory("all")}
                  className="flex items-center gap-0.5 text-xs font-semibold text-brand active:scale-95"
                >
                  {t("shop.seeAll")}
                  <ChevronRight className="h-3.5 w-3.5 flip-rtl" />
                </button>
              </div>
              <div className="px-4">{categoryStrip}</div>
            </section>

            {/* Featured rail */}
            {featured.length > 0 && (
              <section className="pt-7">
                <div className="flex items-center justify-between px-4 pb-3">
                  <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                    {t("shop.featured")}
                  </h2>
                  <button
                    onClick={() => pickCategory("all")}
                    className="flex items-center gap-0.5 text-xs font-semibold text-brand active:scale-95"
                  >
                    {t("shop.seeAll")}
                    <ChevronRight className="h-3.5 w-3.5 flip-rtl" />
                  </button>
                </div>
                <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
                  {featured.map((product, i) => {
                    const item = cart.items.find(
                      (ci) => ci.product_id === product.id && !ci.is_free
                    );
                    return (
                      <div
                        key={product.id}
                        className="w-[9.5rem] shrink-0 snap-start"
                      >
                        <ProductCard
                          product={product}
                          qty={item?.quantity ?? 0}
                          mode="shop"
                          onAdd={cart.add}
                          onRemove={cart.remove}
                          onOpenDetail={setDetailProduct}
                          index={i}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Promises */}
            <section className="px-4 pt-7">
              <div className="grid grid-cols-3 gap-2">
                {TRUST.map(({ icon: Icon, key }) => (
                  <div
                    key={key}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface px-2 py-3 text-center"
                  >
                    <Icon className="h-4 w-4 text-brand" />
                    <span className="text-[10px] font-medium leading-tight text-ink-2">
                      {t(key)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Small print — the app equivalent of the site footer */}
            <div className="mt-8 flex flex-col items-center gap-3 px-4">
              <p className="text-center text-[11px] text-ink-3">
                {t("shop.copyright")}
              </p>
              <Link
                href="/admin"
                className="label-caps flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-[11px] text-ink-3"
              >
                <Lock className="h-3 w-3" />
                {t("shop.staffLogin")}
              </Link>
            </div>
          </div>
        )}

        {/* Cart & Orders tabs — phone only; the desktop uses the drawer. */}
        {(tab === "cart" || tab === "orders") && (
          <div className="tab-in flex h-full flex-col sm:hidden">
            <div className="flex shrink-0 items-center gap-1 border-b border-line bg-sunken/40 px-4 py-2.5">
              {(["cart", "orders"] as const).map((pane) => (
                <button
                  key={pane}
                  onClick={() => goTab(pane)}
                  className={`label-caps rounded-full px-3.5 py-1.5 transition active:scale-95 ${
                    tab === pane
                      ? "bg-brand text-on-brand"
                      : "text-ink-2"
                  }`}
                >
                  {pane === "cart" ? t("common.cart") : t("common.myOrders")}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              {tab === "cart" ? cartPanel : <OrderHistory />}
            </div>
          </div>
        )}

        {/* Hero — desktop only; the phone has its home tab instead. */}
        <section className="shop-hero hidden border-b border-line sm:block">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
            <div className="rise">
              <span className="label-caps text-brand">{t("shop.eyebrow")}</span>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
                {t("shop.headline1")}
                <br />
                {t("shop.headline2")}
              </h1>
              <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-2">
                {t("shop.lede")}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={goToCatalog}
                  className="group flex h-12 items-center gap-2 rounded-full bg-brand px-7 text-sm font-semibold text-on-brand
                             transition hover:bg-brand-deep active:scale-[0.98]"
                >
                  {t("shop.ctaShop")}
                  <ArrowRight className="h-4 w-4 flip-rtl transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  onClick={goToCatalog}
                  className="h-12 rounded-full border border-line-strong px-6 text-sm font-semibold text-ink transition hover:bg-sunken"
                >
                  {t("shop.ctaBrowse")}
                </button>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3">
                {TRUST.map(({ icon: Icon, key }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-brand" />
                    <span className="text-xs font-medium text-ink-2">
                      {t(key)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Editorial data panel — no external imagery required */}
            <div className="rise rounded-2xl border border-line bg-surface/70 p-7 backdrop-blur-sm lg:p-9">
              <span className="label-caps text-ink-3">
                {t("shop.inCollection")}
              </span>
              <div className="mt-4 flex items-end gap-6">
                <div>
                  <p className="font-display text-5xl font-semibold leading-none tracking-tight text-ink tabular-nums">
                    {allProducts.length}
                  </p>
                  <p className="mt-1.5 text-xs text-ink-3">
                    {t("shop.productsInStock")}
                  </p>
                </div>
                <div className="mb-1 h-10 w-px bg-line" />
                <div>
                  <p className="font-display text-5xl font-semibold leading-none tracking-tight text-ink tabular-nums">
                    {categories.length}
                  </p>
                  <p className="mt-1.5 text-xs text-ink-3">
                    {t("shop.categories")}
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                {[
                  { id: "all" as const, name: t("shop.allProducts") },
                  ...categories.map((c) => ({
                    id: c.id,
                    name: localized(c, "name", lang),
                  })),
                ].map((chip) => {
                  const active = activeCategory === chip.id;
                  return (
                    <button
                      key={String(chip.id)}
                      onClick={() => pickCategory(chip.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        active
                          ? "border-brand bg-brand text-white"
                          : "border-line-strong bg-transparent text-ink hover:border-brand hover:text-brand"
                      }`}
                    >
                      <bdi>{chip.name}</bdi>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Catalog — the store tab on a phone, the page body on desktop */}
        <main
          id="catalog"
          className={`mx-auto max-w-7xl scroll-mt-24 px-4 pb-10 pt-4 sm:px-5 sm:py-10 ${
            tab === "store" ? "" : "hidden sm:block"
          }`}
        >
          {/* Store toolbar — phone only */}
          <div className="tab-in space-y-3 pb-4 sm:hidden">
            {renderSearch()}
            {categoryStrip}
          </div>

          <div className="mb-5 space-y-4 sm:mb-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                <bdi>{activeName}</bdi>
              </h2>
              <span className="label-caps text-ink-3">
                {visibleProducts.length}{" "}
                {visibleProducts.length === 1
                  ? t("common.item")
                  : t("common.items")}
              </span>
            </div>

            {/* Price filter */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
              <span className="label-caps flex items-center gap-1.5 text-ink-3">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t("shop.price")}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder={
                  Number.isFinite(priceBounds.min)
                    ? t("shop.minWith", { n: num(priceBounds.min) })
                    : t("shop.min")
                }
                aria-label={t("shop.minAria")}
                className="h-9 w-28 rounded-full border border-line bg-surface px-3.5 text-sm text-ink outline-none transition [appearance:textfield] placeholder:text-ink-3 focus:border-brand/50 focus:ring-2 focus:ring-brand/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-ink-3">–</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder={
                  priceBounds.max > 0
                    ? t("shop.maxWith", { n: num(priceBounds.max) })
                    : t("shop.max")
                }
                aria-label={t("shop.maxAria")}
                className="h-9 w-28 rounded-full border border-line bg-surface px-3.5 text-sm text-ink outline-none transition [appearance:textfield] placeholder:text-ink-3 focus:border-brand/50 focus:ring-2 focus:ring-brand/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-xs text-ink-3">{t("common.currency")}</span>
              {priceActive && (
                <button
                  onClick={clearPrice}
                  className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-2 transition hover:border-brand/40 hover:text-brand"
                >
                  <X className="h-3 w-3" />
                  {t("common.clear")}
                </button>
              )}
            </div>
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
              {visibleProducts.map((product, i) => {
                const item = cart.items.find(
                  (ci) => ci.product_id === product.id && !ci.is_free
                );
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    qty={item?.quantity ?? 0}
                    mode="shop"
                    onAdd={cart.add}
                    onRemove={cart.remove}
                    onOpenDetail={setDetailProduct}
                    index={i}
                  />
                );
              })}
            </div>
          )}
        </main>

        {/* Footer — desktop only */}
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
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {TRUST.map(({ icon: Icon, key }) => (
                <div key={key} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-ink-3" />
                  <span className="text-xs font-medium text-ink-2">
                    {t(key)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-line/70">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
              <p className="text-[11px] text-ink-3">{t("shop.copyright")}</p>
              <Link
                href="/admin"
                className="label-caps flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[11px] text-ink-3 transition hover:border-brand/40 hover:text-brand"
              >
                <Lock className="h-3 w-3" />
                {t("shop.staffLogin")}
              </Link>
            </div>
          </div>
        </footer>
      </div>

      {/* Add-to-home-screen invitation, docked above the tab bar */}
      <InstallPrompt />

      {/* ── Tab bar — phone only ────────────────────────────────────── */}
      <nav
        className="z-40 shrink-0 border-t border-line bg-surface/95 backdrop-blur-md sm:hidden"
        style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
      >
        <div className="grid grid-cols-4">
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
                    <span className="absolute -end-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-copper px-1 text-[9px] font-bold text-white">
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

      {/* Cart — side drawer on desktop */}
      {cartOpen && (
        <div className="fade-in fixed inset-0 z-50 hidden justify-end bg-ink/45 backdrop-blur-[2px] sm:flex">
          <div className="flex-1" onClick={() => setCartOpen(false)} />
          <div className="slide-in-right flex h-full w-full max-w-md flex-col border-s border-line bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line bg-sunken/50 px-5 py-3.5">
              {cartTabs}
              <button
                onClick={() => setCartOpen(false)}
                aria-label={t("shop.closeCart")}
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 transition hover:bg-sunken hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">{drawerBody}</div>
          </div>
        </div>
      )}

      {/* Product detail — opened by tapping a product card */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          qty={
            cart.items.find(
              (ci) => ci.product_id === detailProduct.id && !ci.is_free
            )?.quantity ?? 0
          }
          onClose={() => setDetailProduct(null)}
          onAdd={cart.add}
          onRemove={cart.remove}
        />
      )}
    </div>
  );
}
