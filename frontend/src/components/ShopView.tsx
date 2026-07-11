"use client";

import { useState, useEffect, useCallback } from "react";
import { Category } from "@/types";
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
  ArrowLeft,
} from "lucide-react";
import ProductCard from "./ProductCard";
import CartPanel from "./CartPanel";
import CheckoutForm from "./CheckoutForm";
import OrderConfirmation from "./OrderConfirmation";
import OrderHistory from "./OrderHistory";
import ThemeToggle from "./ThemeToggle";

const TRUST = [
  { icon: Truck, label: "Fast local delivery" },
  { icon: ShieldCheck, label: "Authentic & sealed" },
  { icon: Sparkles, label: "Hand-picked selection" },
];

export default function ShopView() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [cartTab, setCartTab] = useState<"cart" | "orders">("cart");
  const [checkingOut, setCheckingOut] = useState(false);
  const [view, setView] = useState<"home" | "store">("home");
  const [isStandalone, setIsStandalone] = useState(false);

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

  // Show the bottom bar only when running as an installed PWA (home-screen app).
  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const update = () =>
      setIsStandalone(
        mq.matches ||
          (window.navigator as { standalone?: boolean }).standalone === true
      );
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const cart = useCart(load);

  const allProducts = categories.flatMap((cat) => cat.products);
  const byCategory =
    activeCategory === "all"
      ? allProducts
      : allProducts.filter((p) => p.category_id === activeCategory);
  const q = query.trim().toLowerCase();
  const visibleProducts = q
    ? byCategory.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
      )
    : byCategory;

  const activeName =
    activeCategory === "all"
      ? "All products"
      : categories.find((c) => c.id === activeCategory)?.name ?? "Products";

  const goToCatalog = () => {
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  const pickCategory = (id: number | "all") => {
    setActiveCategory(id);
    goToCatalog();
  };

  const goHome = () => {
    setView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goStore = () => {
    setView("store");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="shop flex min-h-screen flex-col items-center justify-center gap-4 bg-paper">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
        <p className="label-caps text-ink-3">Opening the shop…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shop flex min-h-screen items-center justify-center bg-paper p-6">
        <div className="max-w-sm rounded-lg border border-rose/25 bg-surface p-8 text-center">
          <p className="font-display text-lg font-semibold text-rose">
            The shop could not load
          </p>
          <p className="mt-2 text-xs text-ink-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 h-10 rounded-md bg-ink px-6 text-xs font-bold uppercase tracking-[0.14em] text-paper transition hover:bg-brand"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (cart.order) {
    return (
      <div className="shop">
        <OrderConfirmation
          order={cart.order}
          onBack={() => {
            cart.reset();
            setCheckingOut(false);
            setCartOpen(false);
          }}
        />
      </div>
    );
  }

  const itemsTotal = cart.items.reduce((sum, ci) => sum + ci.subtotal, 0);

  const cartPanel = (
    <CartPanel
      items={cart.items}
      notes={cart.notes}
      onNotesChange={cart.setNotes}
      discount={cart.discount}
      onDiscountChange={cart.setDiscount}
      onQtyChange={cart.setQty}
      onSubmit={() => setCheckingOut(true)}
      onClear={cart.clear}
      submitting={cart.submitting}
      submitError={cart.submitError}
      submitLabel="Checkout"
      customerMode
    />
  );

  // Cart drawer tabs: the live cart vs. this device's order history.
  const cartTabs = (
    <div className="flex items-center gap-1">
      {(["cart", "orders"] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => setCartTab(tab)}
          className={`label-caps rounded-md px-3 py-1.5 transition ${
            cartTab === tab
              ? "bg-brand text-on-brand"
              : "text-ink-2 hover:bg-sunken"
          }`}
        >
          {tab === "cart" ? "Cart" : "My Orders"}
        </button>
      ))}
    </div>
  );

  const drawerBody =
    cartTab === "orders" ? (
      <OrderHistory />
    ) : checkingOut ? (
      <CheckoutForm
        total={itemsTotal}
        submitting={cart.submitting}
        error={cart.submitError}
        onBack={() => setCheckingOut(false)}
        onPlace={(info) => cart.submit(info)}
      />
    ) : (
      cartPanel
    );

  const renderSearch = (className = "") => (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products or code…"
        aria-label="Search products"
        className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-9 text-sm text-ink
                   outline-none transition placeholder:text-ink-3
                   focus:border-brand/50 focus:ring-2 focus:ring-brand/15"
      />
      {query && (
        <button
          onClick={() => setQuery("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-3 transition hover:bg-sunken hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <div className={`shop min-h-screen bg-paper ${isStandalone ? "pb-20 sm:pb-0" : ""}`}>
      {/* Fixed top bar: promo + navbar, pinned together */}
      <div className="sticky top-0 z-40">
      {/* Header — pads for the notch / status bar in standalone */}
      <header
        className="border-b border-line bg-paper/85 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-4">
          {/* Logo */}
          <button
            onClick={() => pickCategory("all")}
            className="flex shrink-0 items-baseline gap-0.5 text-left"
          >
            <span className="font-display text-[26px] font-semibold leading-none tracking-tight text-ink">
              Pharmacy Line
            </span>
            <span className="font-display text-[26px] font-semibold leading-none text-brand">
              .
            </span>
          </button>

          {/* Desktop search — center */}
          {renderSearch("mx-auto hidden w-full max-w-md sm:block")}

          {/* Utilities */}
          <nav className="ml-auto flex shrink-0 items-center gap-1.5 sm:ml-0">
            <ThemeToggle />
            <button
              onClick={() => setCartOpen(true)}
              className="relative ml-1 flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-on-brand
                         transition hover:bg-brand-deep active:scale-[0.98]"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="label-caps hidden sm:inline">Cart</span>
              {cart.totalQty > 0 && (
                <span className="pop flex h-5 min-w-5 items-center justify-center rounded-full bg-copper px-1.5 text-[10px] font-bold text-white">
                  {cart.totalQty}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Mobile search */}
        <div className="px-5 pb-3 sm:hidden">
          {renderSearch()}
        </div>
      </header>
      </div>

      {/* Store view toolbar — mobile only (search + category filter) */}
      {view === "store" && (
        <div className="border-b border-line bg-paper px-5 py-4 sm:hidden">
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
            Store
          </h2>
          <div className="mt-3">{renderSearch()}</div>
          <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
            {[{ id: "all" as const, name: "All" }, ...categories.map((c) => ({ id: c.id, name: c.name }))].map((chip) => {
              const active = activeCategory === chip.id;
              return (
                <button
                  key={String(chip.id)}
                  onClick={() => pickCategory(chip.id)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${
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
        </div>
      )}

      {/* Hero */}
      <section className={`shop-hero border-b border-line ${view === "store" ? "hidden sm:block" : ""}`}>
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="rise">
            <span className="label-caps text-brand">Pharmacy · Skincare · Supplements</span>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Everyday wellness,
              <br />
              thoughtfully curated.
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-2">
              A considered edit of trusted medical, skincare, and supplement
              essentials — browse the collection and build your order in a few taps.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#catalog"
                className="group flex h-12 items-center gap-2 rounded-full bg-brand px-7 text-sm font-semibold text-on-brand
                           transition hover:bg-brand-deep active:scale-[0.98]"
              >
                Shop the collection
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <button
                onClick={goToCatalog}
                className="h-12 rounded-full border border-line-strong px-6 text-sm font-semibold text-ink transition hover:bg-sunken"
              >
                Browse categories
              </button>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3">
              {TRUST.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-brand" />
                  <span className="text-xs font-medium text-ink-2">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Editorial data panel — no external imagery required */}
          <div className="rise rounded-2xl border border-line bg-surface/70 p-7 backdrop-blur-sm lg:p-9">
            <span className="label-caps text-ink-3">In the collection</span>
            <div className="mt-4 flex items-end gap-6">
              <div>
                <p className="font-display text-5xl font-semibold leading-none tracking-tight text-ink tabular-nums">
                  {allProducts.length}
                </p>
                <p className="mt-1.5 text-xs text-ink-3">products in stock</p>
              </div>
              <div className="mb-1 h-10 w-px bg-line" />
              <div>
                <p className="font-display text-5xl font-semibold leading-none tracking-tight text-ink tabular-nums">
                  {categories.length}
                </p>
                <p className="mt-1.5 text-xs text-ink-3">categories</p>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              {[{ id: "all" as const, name: "All products" }, ...categories.map((c) => ({ id: c.id, name: c.name }))].map((chip) => {
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

      {/* Catalog */}
      <main id="catalog" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-10 pb-24">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            <bdi>{activeName}</bdi>
          </h2>
          <span className="label-caps text-ink-3">
            {visibleProducts.length} {visibleProducts.length === 1 ? "item" : "items"}
          </span>
        </div>

        {visibleProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-line-strong text-ink-3">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-ink-2">
              {q ? `Nothing matches “${query}”` : "No products here yet"}
            </p>
            <p className="text-xs text-ink-3">
              {q ? "Try a different search or category" : "Add products from the Admin dashboard"}
            </p>
          </div>
        ) : (
          <div
            key={`${String(activeCategory)}-${q}`}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
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
                  index={i}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center">
          <div>
            <span className="font-display text-xl font-semibold tracking-tight text-ink">
              Pharmacy Line<span className="text-brand">.</span>
            </span>
            <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-ink-3">
              Pharmacy, skincare, and wellness essentials — curated and delivered.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {TRUST.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-ink-3" />
                <span className="text-xs font-medium text-ink-2">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-line/70">
          <p className="mx-auto max-w-7xl px-5 py-4 text-[11px] text-ink-3">
            © 2026 Pharmacy Line — Pharmacy &amp; Wellness. All rights reserved.
          </p>
        </div>
      </footer>

      {/* PWA bottom bar — installed app only: Cart · Home · Store */}
      {isStandalone && (
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md sm:hidden">
        <div
          className="grid grid-cols-3 items-end px-3 pt-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          {/* Cart — left */}
          <button
            onClick={() => setCartOpen(true)}
            aria-label="Open cart"
            className="flex flex-col items-center gap-1 py-1 text-ink-2 transition active:scale-95"
          >
            <span className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cart.totalQty > 0 && (
                <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-copper px-1 text-[9px] font-bold text-white">
                  {cart.totalQty}
                </span>
              )}
            </span>
            <span className="text-[10px] font-semibold">Cart</span>
          </button>

          {/* Home — center, raised */}
          <button
            onClick={goHome}
            aria-label="Home"
            className="flex flex-col items-center gap-1 transition active:scale-95"
          >
            <span className="-mt-7 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-on-brand shadow-[0_10px_24px_-10px_var(--color-brand)] ring-4 ring-surface">
              <Home className="h-5 w-5" />
            </span>
            <span
              className={`text-[10px] font-semibold ${
                view === "home" ? "text-brand" : "text-ink-2"
              }`}
            >
              Home
            </span>
          </button>

          {/* Store — right */}
          <button
            onClick={goStore}
            aria-label="Store"
            className={`flex flex-col items-center gap-1 py-1 transition active:scale-95 ${
              view === "store" ? "text-brand" : "text-ink-2"
            }`}
          >
            <Store className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Store</span>
          </button>
        </div>
      </nav>
      )}

      {/* Cart — fullscreen page in the installed PWA, side drawer in-browser */}
      {cartOpen &&
        (isStandalone ? (
          <div className="fade-in fixed inset-0 z-50 flex flex-col bg-surface">
            <div
              className="flex shrink-0 items-center gap-3 border-b border-line bg-sunken/50 px-4 py-3.5"
              style={{ paddingTop: "max(0.875rem, env(safe-area-inset-top))" }}
            >
              <button
                onClick={() => setCartOpen(false)}
                aria-label="Back"
                className="flex h-9 w-9 items-center justify-center rounded-md text-ink-2 transition hover:bg-sunken hover:text-ink active:scale-90"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              {cartTabs}
            </div>
            <div
              className="flex-1 overflow-hidden"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              {drawerBody}
            </div>
          </div>
        ) : (
          <div className="fade-in fixed inset-0 z-50 flex justify-end bg-ink/45 backdrop-blur-[2px]">
            <div className="flex-1" onClick={() => setCartOpen(false)} />
            <div className="slide-in-right flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl">
              <div className="flex items-center justify-between border-b border-line bg-sunken/50 px-5 py-3.5">
                {cartTabs}
                <button
                  onClick={() => setCartOpen(false)}
                  aria-label="Close cart"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 transition hover:bg-sunken hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">{drawerBody}</div>
            </div>
          </div>
        ))}
    </div>
  );
}
