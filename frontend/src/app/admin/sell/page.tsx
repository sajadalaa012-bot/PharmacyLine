"use client";

import { useState, useEffect, useCallback } from "react";
import { Category } from "@/types";
import { fetchProducts, fetchOrder } from "@/lib/api";
import { useCart } from "@/lib/useCart";
import { Search, X, ShoppingCart } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import CartPanel from "@/components/CartPanel";
import Receipt from "@/components/Receipt";

export default function AdminSellPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setCategories(await fetchProducts());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Admin sales are approved immediately; editing a pending order approves it on save.
  const cart = useCart(load, "approved");
  const { loadOrder } = cart;

  // Deep link from the Orders page: /admin/sell?order=<id> preloads that order.
  useEffect(() => {
    const id = parseInt(
      new URLSearchParams(window.location.search).get("order") ?? "",
      10
    );
    if (!isNaN(id)) {
      fetchOrder(id).then(loadOrder).catch(console.error);
    }
  }, [loadOrder]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
      </div>
    );
  }

  if (cart.order) {
    return <Receipt order={cart.order} onBack={cart.reset} />;
  }

  const q = query.trim().toLowerCase();
  const filtered = categories
    .map((cat) => ({
      ...cat,
      products: q
        ? cat.products.filter(
            (p) =>
              p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
          )
        : cat.products,
    }))
    .filter((cat) => cat.products.length > 0);

  const submitOrder = async () => {
    await cart.submit();
    setCartOpen(false);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-semibold tracking-tight text-ink sm:text-xl">
            {cart.editingOrderId
              ? `Review order #${String(cart.editingOrderId).padStart(5, "0")}`
              : "New sale"}
          </h1>
          <p className="mt-0.5 text-[11px] text-ink-3">
            {cart.editingOrderId
              ? "Adjust items, bonuses, and discount — saving approves the order"
              : "Bonus items, price overrides, and discounts available"}
          </p>
        </div>

        <div className="relative order-last w-full sm:order-none sm:ml-auto sm:w-auto sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or code…"
            className="h-9 w-full rounded-md border border-line bg-sunken pl-9 pr-8 text-sm text-ink
                       outline-none transition placeholder:text-ink-3 focus:border-brand/50 focus:ring-1 focus:ring-brand/25"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-3 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Mobile cart trigger */}
        <button
          onClick={() => setCartOpen(true)}
          className="relative ml-auto flex h-9 shrink-0 items-center gap-2 rounded-md bg-brand px-3.5 text-on-brand transition hover:bg-brand-deep active:scale-[0.98] sm:ml-0 lg:hidden"
        >
          <ShoppingCart className="h-4 w-4" />
          {cart.totalQty > 0 && (
            <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-copper px-1 text-[10px] font-bold text-white">
              {cart.totalQty}
            </span>
          )}
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Catalog */}
        <main className="scroll-thin min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-line-strong text-ink-3">
                <Search className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-ink-2">
                {q ? `Nothing matches “${query}”` : "No products in the catalog"}
              </p>
            </div>
          ) : (
            filtered.map((category) => (
              <section key={category.id} className="mb-7">
                <div className="mb-3 flex items-baseline gap-3">
                  <h2 className="label-caps text-brand">{category.name}</h2>
                  <div className="h-px flex-1 bg-line" />
                  <span className="text-[11px] text-ink-3 tabular-nums">
                    {category.products.length} items
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {category.products.map((product, i) => {
                    const paid = cart.items.find(
                      (ci) => ci.product_id === product.id && !ci.is_free
                    );
                    const free = cart.items.find(
                      (ci) => ci.product_id === product.id && ci.is_free
                    );
                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        qty={(paid?.quantity ?? 0) + (free?.quantity ?? 0)}
                        mode="pos"
                        onAdd={cart.add}
                        onRemove={cart.remove}
                        onFree={cart.addFree}
                        index={i}
                      />
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </main>

        {/* Cart rail (desktop) */}
        <aside className="hidden w-[380px] shrink-0 border-l border-line lg:block">
          <CartPanel
            items={cart.items}
            notes={cart.notes}
            onNotesChange={cart.setNotes}
            discount={cart.discount}
            onDiscountChange={cart.setDiscount}
            onQtyChange={cart.setQty}
            onUnitPriceChange={cart.setUnitPrice}
            onSubmit={submitOrder}
            onClear={cart.clear}
            submitting={cart.submitting}
            submitError={cart.submitError}
            submitLabel={cart.editingOrderId ? "Approve Order" : "Generate Receipt"}
          />
        </aside>
      </div>

      {/* Mobile cart drawer */}
      {cartOpen && (
        <div className="fade-in fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px] lg:hidden">
          <div className="flex-1" onClick={() => setCartOpen(false)} />
          <div className="admin slide-in-right flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line bg-sunken/50 px-5 py-3.5">
              <span className="label-caps text-ink-2">Checkout</span>
              <button
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 transition hover:bg-sunken hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CartPanel
                items={cart.items}
                notes={cart.notes}
                onNotesChange={cart.setNotes}
                discount={cart.discount}
                onDiscountChange={cart.setDiscount}
                onQtyChange={cart.setQty}
                onUnitPriceChange={cart.setUnitPrice}
                onSubmit={submitOrder}
                onClear={cart.clear}
                submitting={cart.submitting}
                submitError={cart.submitError}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
