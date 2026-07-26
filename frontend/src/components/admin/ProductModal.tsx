"use client";

import React, { useState, useEffect, useRef } from "react";
import { Product, Category, ProductInput } from "@/types";
import { uploadProductImage } from "@/lib/api";
import { X, Package } from "lucide-react";
import Dropdown from "@/components/Dropdown";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** null/undefined = create mode */
  product?: Product | null;
  categories: Category[];
  defaultCategoryId?: number;
  onSave: (productData: ProductInput) => Promise<void>;
  onDelete?: (productId: number) => Promise<void>;
}

export default function ProductModal({
  isOpen,
  onClose,
  product,
  categories,
  defaultCategoryId,
  onSave,
  onDelete,
}: ProductModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [benefits, setBenefits] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [usage, setUsage] = useState("");

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setConfirmDelete(false);
      if (product) {
        setName(product.name);
        setCode(product.code);
        setPrice(product.price.toString());
        setCategoryId(product.category_id);
        setImageUrl(product.image_url);
        setDescription(product.description ?? "");
        setBenefits(product.benefits ?? "");
        setIngredients(product.ingredients ?? "");
        setUsage(product.usage ?? "");
      } else {
        setName("");
        setCode("");
        setPrice("");
        setCategoryId(defaultCategoryId || categories[0]?.id || 0);
        setImageUrl("");
        setDescription("");
        setBenefits("");
        setIngredients("");
        setUsage("");
      }
    }
  }, [isOpen, product, categories, defaultCategoryId]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadProductImage(file);
      setImageUrl(res.image_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Product name is required.");
    if (!code.trim()) return setError("Product code is required.");
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0)
      return setError("Price must be a valid positive number.");
    if (!categoryId) return setError("Please select a category.");

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        price: parsedPrice,
        image_url: imageUrl.trim(),
        category_id: categoryId,
        description: description.trim(),
        benefits: benefits.trim(),
        ingredients: ingredients.trim(),
        usage: usage.trim(),
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred while saving."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!product || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsSubmitting(true);
    try {
      await onDelete(product.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product.");
      setConfirmDelete(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    "w-full rounded-md border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand/60 focus:ring-1 focus:ring-brand/30";
  const textareaCls = `${inputCls} min-h-20 resize-y leading-relaxed`;

  return (
    <div className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
      <div
        className="pop flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-line-strong bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
            {product ? "Edit product" : "New product"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition hover:bg-sunken hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-md border border-rose/30 bg-rose/10 p-3 text-xs text-rose">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <label className="label-caps mb-1.5 block text-ink-3">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. HAIR SKIN NAILS GUMMIES"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-caps mb-1.5 block text-ink-3">Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. F173"
                  className={`${inputCls} uppercase`}
                />
              </div>
              <div>
                <label className="label-caps mb-1.5 block text-ink-3">
                  Price (IQD)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 21000"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-ink-3">Category</label>
              <Dropdown
                ariaLabel="Product category"
                value={String(categoryId)}
                onChange={(v) => setCategoryId(parseInt(v))}
                options={categories.map((cat) => ({
                  value: String(cat.id),
                  label: cat.name,
                }))}
              />
            </div>

            {/* Photo */}
            <div>
              <label className="label-caps mb-1.5 block text-ink-3">Photo</label>
              <div className="flex gap-4">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-white">
                  {imageUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="h-full w-full object-contain p-1"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        aria-label="Remove photo"
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose text-white shadow hover:opacity-90"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <Package className="h-6 w-6 text-line-strong" />
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="label-caps h-9 rounded-md border border-brand/40 bg-brand/10 text-brand transition hover:bg-brand/20 active:scale-[0.98] disabled:opacity-50"
                  >
                    {uploading ? "Uploading…" : "Upload photo"}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="/products/filename.jpg"
                    className={`${inputCls} py-2 text-xs`}
                  />
                </div>
              </div>
            </div>

            {/* ── Product details (shown to shoppers on the detail view) ── */}
            <div className="mt-1 border-t border-line pt-4">
              <p className="label-caps text-ink-3">Details (optional)</p>
              <p className="mt-1 text-[11px] text-ink-3">
                These show when a shopper opens the product.
              </p>
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-ink-3">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A short overview of the product…"
                className={textareaCls}
              />
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-ink-3">
                Benefits
              </label>
              <textarea
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
                placeholder="What it helps with — one point per line…"
                className={textareaCls}
              />
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-ink-3">
                Ingredients
              </label>
              <textarea
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="Active ingredients / composition…"
                className={textareaCls}
              />
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-ink-3">
                How to use
              </label>
              <textarea
                value={usage}
                onChange={(e) => setUsage(e.target.value)}
                placeholder="Directions / dosage…"
                className={textareaCls}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-7 flex items-center justify-between border-t border-line pt-5">
            {product ? (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isSubmitting}
                className={`label-caps rounded-md border px-4 py-2.5 transition ${
                  confirmDelete
                    ? "animate-pulse border-rose bg-rose text-white"
                    : "border-rose/30 bg-rose/10 text-rose hover:bg-rose/20"
                }`}
              >
                {confirmDelete ? "Confirm delete" : "Delete"}
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="label-caps rounded-md border border-line px-4 py-2.5 text-ink-2 transition hover:bg-sunken hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || uploading}
                className="label-caps rounded-md bg-brand px-5 py-2.5 text-on-brand transition hover:bg-brand-deep disabled:opacity-50"
              >
                {isSubmitting ? "Saving…" : product ? "Save changes" : "Add product"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
