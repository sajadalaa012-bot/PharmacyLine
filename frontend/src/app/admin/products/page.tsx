"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Category,
  Product,
  ProductInput,
  isDiscounted,
  isLowStock,
} from "@/types";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/api";
import { money } from "@/lib/format";
import { Search, Plus, Edit3, Trash2, Package, PackageX } from "lucide-react";
import ProductModal from "@/components/admin/ProductModal";
import StockControl from "@/components/admin/StockControl";
import Dropdown from "@/components/Dropdown";
import { useI18n } from "@/lib/LanguageProvider";
import { localized } from "@/lib/i18n";

export default function AdminProductsPage() {
  const { t, lang } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [lowStockOnly, setLowStockOnly] = useState(false);

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
    async (productData: ProductInput) => {
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

  /** Save just the stock level, leaving every other field as it was. */
  const handleStockSave = useCallback(
    async (product: Product, stock: number | undefined) => {
      // `updateProduct` replaces the whole record, so every field is carried
      // over explicitly — spreading the product would smuggle `id` into the
      // input payload.
      const payload: ProductInput = {
        name: product.name,
        code: product.code,
        price: product.price,
        old_price: product.old_price,
        image_url: product.image_url,
        category_id: product.category_id,
        description: product.description,
        benefits: product.benefits,
        ingredients: product.ingredients,
        usage: product.usage,
        name_ar: product.name_ar,
        description_ar: product.description_ar,
        benefits_ar: product.benefits_ar,
        ingredients_ar: product.ingredients_ar,
        usage_ar: product.usage_ar,
        stock,
        variants: product.variants,
      };
      await updateProduct(product.id, payload);
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
    cat.products.map((p) => ({
      ...p,
      categoryName: localized(cat, "name", lang),
    }))
  );
  const filtered = allProducts.filter((p) => {
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.name_ar ?? "").toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q);
    const matchesCategory =
      categoryFilter === "all" || p.category_id === categoryFilter;
    const matchesStock = !lowStockOnly || isLowStock(p);
    return matchesQuery && matchesCategory && matchesStock;
  });

  const lowStockCount = allProducts.filter(isLowStock).length;

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-7">
      {/* Header + toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            {t("nav.products")}
          </h1>
          <p className="mt-1 text-xs text-ink-3">
            {t("products.subtitle", {
              p: allProducts.length,
              c: categories.length,
            })}
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
          {t("products.addProduct")}
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("products.searchPlaceholder")}
            className="h-10 w-full rounded-md border border-line bg-sunken ps-9 pe-3 text-sm text-ink
                       outline-none transition placeholder:text-ink-3 focus:border-brand/50 focus:ring-1 focus:ring-brand/25"
          />
        </div>
        <button
          type="button"
          onClick={() => setLowStockOnly((v) => !v)}
          className={`label-caps flex h-10 shrink-0 items-center gap-1.5 rounded-md border px-3 transition ${
            lowStockOnly
              ? "border-copper bg-copper text-white"
              : "border-line bg-surface text-ink-2 hover:text-ink"
          }`}
        >
          <PackageX className="h-4 w-4" />
          {t("stock.lowFilter")}
          <span className={lowStockOnly ? "opacity-80" : "text-ink-3"}>
            {lowStockCount}
          </span>
        </button>
        <Dropdown
          ariaLabel={t("products.filterByCategory")}
          className="w-56"
          value={String(categoryFilter)}
          onChange={(v) => setCategoryFilter(v === "all" ? "all" : parseInt(v))}
          options={[
            { value: "all", label: t("products.allCategories") },
            ...categories.map((cat) => ({
              value: String(cat.id),
              label: localized(cat, "name", lang),
            })),
          ]}
        />
      </div>

      {rowError && (
        <div className="rounded-md border border-rose/30 bg-rose/10 p-3 text-xs text-rose">
          {rowError}
        </div>
      )}

      {/* Card list (mobile) */}
      <div className="space-y-2.5 sm:hidden">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-line bg-surface py-12 text-center text-xs text-ink-3">
            {t("products.noMatching")}
          </div>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-white">
                {p.image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="h-full w-full object-contain p-0.5"
                  />
                ) : (
                  <Package className="h-5 w-5 text-line-strong" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  <bdi>{localized(p, "name", lang)}</bdi>
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-mono text-[11px] font-bold text-brand">
                    {p.code}
                  </span>
                  <span className="label-caps rounded-sm border border-brand/25 bg-brand/[0.08] px-1.5 py-0.5 text-brand">
                    {p.categoryName}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p
                    className={`text-sm font-semibold tabular-nums ${
                      isDiscounted(p) ? "text-rose" : "text-ink"
                    }`}
                  >
                    {money(p.price)}
                  </p>
                  {isDiscounted(p) && (
                    <span className="text-xs font-semibold text-ink-3 line-through tabular-nums">
                      {money(p.old_price as number)}
                    </span>
                  )}
                  <StockControl
                    product={p}
                    onSave={(stock) => handleStockSave(p, stock)}
                  />
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <button
                  onClick={() => {
                    setEditingProduct(p);
                    setModalOpen(true);
                  }}
                  title={t("products.editProduct")}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink-2 transition hover:border-brand/40 hover:text-brand"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleRowDelete(p)}
                  title={
                    pendingDelete === p.id
                      ? t("common.tapAgain")
                      : t("products.deleteProduct")
                  }
                  className={`flex h-9 items-center justify-center gap-1 rounded-md border transition ${
                    pendingDelete === p.id
                      ? "label-caps animate-pulse border-rose bg-rose px-2 text-white"
                      : "w-9 border-line text-ink-2 hover:border-rose/40 hover:text-rose"
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                  {pendingDelete === p.id && t("common.sure")}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Table (tablet & desktop) */}
      <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface sm:block">
        <table className="w-full min-w-[640px] border-collapse text-start">
          <thead>
            <tr className="label-caps border-b border-line bg-sunken/60 text-ink-3">
              <th className="px-4 py-3 font-bold">{t("products.colCode")}</th>
              <th className="px-4 py-3 font-bold">{t("products.colProduct")}</th>
              <th className="px-4 py-3 font-bold">{t("products.colCategory")}</th>
              <th className="px-4 py-3 text-end font-bold">{t("products.colPrice")}</th>
              <th className="px-4 py-3 text-center font-bold">{t("products.colStock")}</th>
              <th className="px-4 py-3 text-center font-bold">{t("products.colActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-[13px]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-ink-3">
                  {t("products.noMatching")}
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
                        <bdi>{localized(p, "name", lang)}</bdi>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="label-caps rounded-sm border border-brand/25 bg-brand/[0.08] px-1.5 py-0.5 text-brand">
                      {p.categoryName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end font-semibold tabular-nums">
                    <span className={isDiscounted(p) ? "text-rose" : "text-ink"}>
                      {money(p.price)}
                    </span>
                    {isDiscounted(p) && (
                      <span className="ms-2 text-xs font-semibold text-ink-3 line-through">
                        {money(p.old_price as number)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <StockControl
                        product={p}
                        onSave={(stock) => handleStockSave(p, stock)}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingProduct(p);
                          setModalOpen(true);
                        }}
                        title={t("products.editProduct")}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-ink-2 transition hover:border-brand/40 hover:text-brand"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleRowDelete(p)}
                        title={
                          pendingDelete === p.id
                            ? t("common.clickAgain")
                            : t("products.deleteProduct")
                        }
                        className={`flex h-8 items-center justify-center gap-1 rounded-md border transition ${
                          pendingDelete === p.id
                            ? "label-caps animate-pulse border-rose bg-rose px-2 text-white"
                            : "w-8 border-line text-ink-2 hover:border-rose/40 hover:text-rose"
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {pendingDelete === p.id && t("common.sure")}
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
