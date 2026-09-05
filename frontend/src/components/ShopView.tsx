"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Category,
  Product,
  ProductCategory,
  priceRange,
  isDiscounted,
} from "@/types";
import { fetchProducts, fetchProductCategories } from "@/lib/api";
import { useCart } from "@/lib/useCart";
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  X,
  ArrowRight,
  Home,
  Store,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import ProductCard from "./ProductCard";
import ProductDetailModal from "./ProductDetailModal";
import CartPanel from "./CartPanel";
import OrderConfirmation from "./OrderConfirmation";
import InstallPrompt from "./InstallPrompt";
import OfferPopup from "./OfferPopup";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import { useI18n } from "@/lib/LanguageProvider";
import { localized, MessageKey } from "@/lib/i18n";
import { num } from "@/lib/format";

/** The tappable heading that opens or shuts one filter section. */
function FilterHeader({
  label,
  selection,
  open,
  onToggle,
}: {
  label: string;
  selection: string | null;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 text-start transition hover:bg-sunken"
    >
      <span className="label-caps text-ink-3">{label}</span>
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          className={`truncate text-[13px] ${
            selection ? "font-semibold text-brand" : "text-ink-3"
          }`}
        >
          <bdi>{selection ?? ""}</bdi>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </span>
    </button>
  );
}

/**
 * One dimension of the Browse page: a bar of chips you swipe along.
 *
 * Kept on a single line rather than wrapped, so opening a section adds one
 * row to the page however many brands it holds — thirty-one wrapped chips
 * would push the second section off the screen entirely. Each chip carries
 * its count, so the bar says what it is worth tapping without opening it.
 */
function FilterBar({
  options,
  active,
  onPick,
}: {
  options: { id: number | "all"; name: string; count: number }[];
  active: number | "all";
  onPick: (id: number | "all") => void;
}) {
  return (
    // pb-1 leaves room for the focus ring, which overflow would otherwise clip.
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {options.map((opt) => {
        const on = active === opt.id;
        return (
          <button
            key={String(opt.id)}
            onClick={() => onPick(opt.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition active:scale-95 ${
              on
                ? "border-brand bg-brand text-white"
                : "border-line-strong bg-surface text-ink hover:border-brand hover:text-brand"
            }`}
          >
            <bdi>{opt.name}</bdi>
            <span
              className={`text-[11px] tabular-nums ${on ? "text-white/70" : "text-ink-3"}`}
            >
              {opt.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The views. "browse" is deliberately absent from TABS below: it is the
 * filter page, opened from the store rather than lived in, so it does not
 * earn a permanent seat on a four-item phone bar.
 */
type Tab = "home" | "browse" | "store" | "cart";

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
  // Browse opens with both lists shut: two headings you can take in at a
  // glance, rather than forty rows to scroll past. Each opens on its own —
  // opening one does not shut the other.
  const [openCategory, setOpenCategory] = useState(false);
  const [openBrand, setOpenBrand] = useState(false);
  // Set by the discount ad, and cleared like any other filter.
  const [offersOnly, setOffersOnly] = useState(false);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [query, setQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  // The phone shell scrolls this element, not the document, so every tab
  // change has to put it back at the top itself.
  const bodyRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [cats, types] = await Promise.all([
        fetchProducts(),
        // A shop that has never set a category still works; the filter just
        // has nothing to offer, so this must not take the catalogue down.
        fetchProductCategories().catch(() => [] as ProductCategory[]),
      ]);
      setCategories(cats);
      setProductCategories(types);
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
    if (wanted === "store" || wanted === "cart") {
      // Read after mount, not during render: the server has no URL search to
      // read from, and picking the tab while rendering would break hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(wanted);
    }
  }, []);

  const cart = useCart(load);

  const allProducts = categories.flatMap((cat) => cat.products);
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
  const clearPrice = () => {
    setMinPrice("");
    setMaxPrice("");
  };

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
  const filtersOn =
    (activeCategory === "all" ? 0 : 1) +
    (activeType === "all" ? 0 : 1) +
    (offersOnly ? 1 : 0);
  /** Anything actually discounted? The ad only runs when there is. */
  const hasOffers = allProducts.some(isDiscounted);

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

  const pickType = (id: number | "all") => {
    setActiveType(id);
    goToCatalog();
  };

  const clearFilters = () => {
    setActiveCategory("all");
    setActiveType("all");
    setOffersOnly(false);
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
          {/* Logo — the wordmark is near-black, so the dark theme gets its
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
          <div className="tab-in sm:hidden">
            {/* Canvas — search and the shop's opening line, on the same dark
                ground as the bar above it */}
            <section className="home-canvas home-canvas-hero px-4 pb-12 pt-4">
              {renderSearch()}

              <span className="label-caps mt-6 block text-brand">
                {t("shop.eyebrow")}
              </span>
              <h1 className="mt-2 font-display text-[30px] font-semibold leading-[1.12] tracking-tight text-ink">
                {t("shop.headline1")}
                <br />
                {t("shop.headline2")}
              </h1>
              <button
                onClick={() => pickCategory("all")}
                className="mt-5 flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-on-brand transition active:scale-[0.97]"
              >
                {t("shop.ctaShop")}
                <ArrowRight className="h-4 w-4 flip-rtl" />
              </button>

            </section>

            {/* Sheet — the rest of the home screen rides up over the canvas */}
            <div className="home-sheet relative -mt-7 bg-paper pb-8 pt-6">
            {/* Small print — the app equivalent of the site footer */}
            <div className="px-4">
              <p className="text-center text-[11px] text-ink-3">
                {t("shop.copyright")}
              </p>
            </div>
            </div>
          </div>
        )}

        {/* Browse — the filter page. Both dimensions in full, so a shopper
            picks from the whole list rather than scrolling a strip. Shown on
            the phone as a tab and on the desktop as its own section. */}
        {tab === "browse" && (
          <div className="tab-in mx-auto w-full max-w-3xl px-4 py-6 sm:px-5 sm:py-10">
            <div className="flex items-baseline justify-between gap-4">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
                {t("browse.title")}
              </h1>
              <div className="flex items-center gap-3">
                {filtersOn > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-semibold text-brand active:scale-95"
                  >
                    {t("browse.clearAll")}
                  </button>
                )}
                {/* Browse is no longer a tab, so it needs its own way out. */}
                <button
                  onClick={() => goTab("store")}
                  aria-label={t("common.close")}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-2 transition hover:bg-sunken hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <section className="mt-6">
              <FilterHeader
                label={t("browse.category")}
                // What is chosen shows on the closed heading, so nothing has
                // to be opened just to see where you are.
                selection={
                  activeTypeCat ? localized(activeTypeCat, "name", lang) : null
                }
                open={openCategory}
                onToggle={() => setOpenCategory((v) => !v)}
              />
              <div className="reveal" data-open={openCategory}>
                {/* inert while shut: a collapsed list is still in the DOM, and
                    without this you could tab into rows nobody can see. */}
                <div inert={!openCategory}>
                  <div className="pt-3">
                    {productCategories.length > 0 ? (
                      <FilterBar
                        options={typeOptions}
                        active={activeType}
                        onPick={pickType}
                      />
                    ) : (
                      <p className="rounded-lg border border-dashed border-line-strong bg-sunken/40 px-4 py-4 text-[13px] text-ink-3">
                        {t("browse.noCategories")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-4">
              <FilterHeader
                label={t("browse.brand")}
                selection={activeCat ? localized(activeCat, "name", lang) : null}
                open={openBrand}
                onToggle={() => setOpenBrand((v) => !v)}
              />
              <div className="reveal" data-open={openBrand}>
                <div inert={!openBrand}>
                  <div className="pt-3">
                    <FilterBar
                      options={brandOptions}
                      active={activeCategory}
                      onPick={pickCategory}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* What the two filters currently add up to. */}
            <button
              onClick={goToCatalog}
              className="mt-9 flex h-12 w-full items-center justify-center rounded-full bg-brand text-sm font-semibold text-on-brand transition hover:bg-brand-deep active:scale-[0.99]"
            >
              {visibleProducts.length === 1
                ? t("browse.showResultsOne")
                : t("browse.showResults", { n: visibleProducts.length })}
            </button>
          </div>
        )}

        {/* Cart tab — phone only; the desktop uses the drawer. */}
        {tab === "cart" && (
          <div className="tab-in h-full sm:hidden">{cartPanel}</div>
        )}

        {/* Hero — desktop only; the phone has its home tab instead. It is
            part of the home view, so it steps aside for Browse. */}
        <section
          className={`shop-hero hidden border-b border-line ${
            tab === "browse" ? "" : "sm:block"
          }`}
        >
          <div className="mx-auto max-w-7xl px-5 py-14 lg:py-20">
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

            </div>
          </div>
        </section>

        {/* Catalog — the store tab on a phone, the page body on desktop */}
        <main
          id="catalog"
          className={`mx-auto max-w-7xl scroll-mt-24 px-4 pb-10 pt-4 sm:px-5 sm:py-10 ${
            tab === "store" ? "" : "hidden"
          } ${tab === "browse" ? "" : "sm:block"}`}
        >
          {/* Store search — phone only; the desktop has one in the header. */}
          <div className="tab-in pb-4 sm:hidden">{renderSearch()}</div>

          <div className="mb-5 space-y-4 sm:mb-6">
            {/* What is filtering the grid right now, and a way out of each.
                The full lists live on the Browse page. */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => goTab("browse")}
                className="flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 text-[13px] font-medium text-ink transition hover:border-brand hover:text-brand"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t("browse.title")}
              </button>

              {offersOnly && (
                <button
                  onClick={() => setOffersOnly(false)}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-rose bg-rose px-3.5 text-[13px] font-medium text-white"
                >
                  {t("promo.onOffer")}
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {activeTypeCat && (
                <button
                  onClick={() => setActiveType("all")}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-brand bg-brand px-3.5 text-[13px] font-medium text-white"
                >
                  <bdi>{localized(activeTypeCat, "name", lang)}</bdi>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {activeCat && (
                <button
                  onClick={() => setActiveCategory("all")}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-brand bg-brand px-3.5 text-[13px] font-medium text-white"
                >
                  <bdi>{localized(activeCat, "name", lang)}</bdi>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

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
          something to advertise — an ad for offers that do not exist is
          worse than no ad. */}
      {tab === "home" && hasOffers && (
        <OfferPopup
          onShop={() => {
            setOffersOnly(true);
            setActiveCategory("all");
            setActiveType("all");
            goToCatalog();
          }}
        />
      )}

      {/* ── Tab bar — phone only ────────────────────────────────────── */}
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

      {/* Product detail — opened by tapping a product card */}
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
