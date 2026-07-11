"use client";

import { useState, useEffect, useCallback } from "react";
import { Category, Product } from "@/types";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/api";
import { money } from "@/lib/format";
import { Search, Plus, Edit3, Trash2, Package } from "lucide-react";
import ProductModal from "@/components/admin/ProductModal";
import Dropdown from "@/components/Dropdown";

export default function AdminProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

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

  const handleSave = useCallback(
    async (productData: {
      name: string;
      code: string;
      price: number;
      image_url: string;
      category_id: number;
    }) => {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await createProduct(productData);
      }
      await load();
    },
    [editingProduct, load]
  );

  const handleDelete = useCallback(
    async (productId: number) => {
      await deleteProduct(productId);
      await load();
    },
    [load]
  );

  const handleRowDelete = useCallback(
    async (product: Product) => {
      if (pendingDelete !== product.id) {
        setPendingDelete(product.id);
        setTimeout(
          () => setPendingDelete((cur) => (cur === product.id ? null : cur)),
          3500
        );
        return;
      }
      setPendingDelete(null);
      try {
        await deleteProduct(product.id);
        setRowError(null);
        await load();
      } catch (err) {
        setRowError(err instanceof Error ? err.message : String(err));
      }
    },
    [load, pendingDelete]
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const allProducts = categories.flatMap((cat) =>
    cat.products.map((p) => ({ ...p, categoryName: cat.name }))
  );
  const filtered = allProducts.filter((p) => {
    const matchesQuery =
      !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    const matchesCategory =
      categoryFilter === "all" || p.category_id === categoryFilter;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-6 py-7">
      {/* Header + toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Products
          </h1>
          <p className="mt-1 text-xs text-ink-3">
            {allProducts.length} products across {categories.length} categories
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setModalOpen(true);
          }}
          className="label-caps flex h-10 items-center gap-2 self-start rounded-md bg-brand px-4 text-on-brand transition hover:bg-brand-deep active:scale-[0.98] sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add product
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or code…"
            className="h-10 w-full rounded-md border border-line bg-sunken pl-9 pr-3 text-sm text-ink
                       outline-none transition placeholder:text-ink-3 focus:border-brand/50 focus:ring-1 focus:ring-brand/25"
          />
        </div>
        <Dropdown
          ariaLabel="Filter by category"
          className="w-56"
          value={String(categoryFilter)}
          onChange={(v) => setCategoryFilter(v === "all" ? "all" : parseInt(v))}
          options={[
            { value: "all", label: "All categories" },
            ...categories.map((cat) => ({
              value: String(cat.id),
              label: cat.name,
            })),
          ]}
        />
      </div>

      {rowError && (
        <div className="rounded-md border border-rose/30 bg-rose/10 p-3 text-xs text-rose">
          {rowError}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="label-caps border-b border-line bg-sunken/60 text-ink-3">
              <th className="px-4 py-3 font-bold">Code</th>
              <th className="px-4 py-3 font-bold">Product</th>
              <th className="px-4 py-3 font-bold">Category</th>
              <th className="px-4 py-3 text-right font-bold">Price</th>
              <th className="px-4 py-3 text-center font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-[13px]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-ink-3">
                  No matching products
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-sunken/40">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-brand">
                    {p.code}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-white">
                        {p.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="h-full w-full object-contain p-0.5"
                          />
                        ) : (
                          <Package className="h-4 w-4 text-line-strong" />
                        )}
                      </div>
                      <span className="max-w-[260px] truncate font-medium text-ink">
                        <bdi>{p.name}</bdi>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="label-caps rounded-sm border border-brand/25 bg-brand/[0.08] px-1.5 py-0.5 text-brand">
                      {p.categoryName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-ink tabular-nums">
                    {money(p.price)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingProduct(p);
                          setModalOpen(true);
                        }}
                        title="Edit product"
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-ink-2 transition hover:border-brand/40 hover:text-brand"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleRowDelete(p)}
                        title={pendingDelete === p.id ? "Click again to confirm" : "Delete product"}
                        className={`flex h-8 items-center justify-center gap-1 rounded-md border transition ${
                          pendingDelete === p.id
                            ? "label-caps animate-pulse border-rose bg-rose px-2 text-white"
                            : "w-8 border-line text-ink-2 hover:border-rose/40 hover:text-rose"
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {pendingDelete === p.id && "Sure?"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ProductModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        product={editingProduct}
        categories={categories}
        defaultCategoryId={editingProduct?.category_id ?? categories[0]?.id}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
