"use client";

import React, { useState, useEffect, useRef } from "react";
import { Product, Category, ProductInput } from "@/types";
import { uploadProductImage } from "@/lib/api";
import { X, Package } from "lucide-react";
import Dropdown from "@/components/Dropdown";
import { useI18n } from "@/lib/LanguageProvider";
import { localized } from "@/lib/i18n";
import { num } from "@/lib/format";

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
  const { t, lang } = useI18n();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [price, setPrice] = useState("");
  // The "was" price of an offer. Blank means the product isn't on offer.
  const [oldPrice, setOldPrice] = useState("");
  const [categoryId, setCategoryId] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [benefits, setBenefits] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [usage, setUsage] = useState("");
  // Blank means "not tracked" — see Product.stock.
  const [stock, setStock] = useState("");

  // Arabic copy. Blank fields fall back to the English above on the storefront,
  // so a product can be listed long before anyone translates it.
  const [nameAr, setNameAr] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [benefitsAr, setBenefitsAr] = useState("");
  const [ingredientsAr, setIngredientsAr] = useState("");
  const [usageAr, setUsageAr] = useState("");

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
        setOldPrice(
          typeof product.old_price === "number"
            ? String(product.old_price)
            : "",
        );
        setCategoryId(product.category_id);
        setImageUrl(product.image_url);
        setDescription(product.description ?? "");
        setBenefits(product.benefits ?? "");
        setIngredients(product.ingredients ?? "");
        setUsage(product.usage ?? "");
        setStock(
          typeof product.stock === "number" ? String(product.stock) : "",
        );
        setNameAr(product.name_ar ?? "");
        setDescriptionAr(product.description_ar ?? "");
        setBenefitsAr(product.benefits_ar ?? "");
        setIngredientsAr(product.ingredients_ar ?? "");
        setUsageAr(product.usage_ar ?? "");
      } else {
        setName("");
        setCode("");
        setPrice("");
        setOldPrice("");
        setCategoryId(defaultCategoryId || categories[0]?.id || 0);
        setImageUrl("");
        setDescription("");
        setBenefits("");
        setIngredients("");
        setUsage("");
        setStock("");
        setNameAr("");
        setDescriptionAr("");
        setBenefitsAr("");
        setIngredientsAr("");
        setUsageAr("");
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
      setError(err instanceof Error ? err.message : t("err.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError(t("err.nameRequired"));
    if (!code.trim()) return setError(t("err.codeRequired"));
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0)
      return setError(t("err.priceInvalid"));
    // Blank = not on offer. A number is only a discount if it is above what
    // the product actually sells for, so anything else is caught here rather
    // than shown to shoppers as a nonsense saving.
    const parsedOldPrice = oldPrice.trim() === "" ? undefined : parseFloat(oldPrice);
    if (parsedOldPrice !== undefined) {
      if (isNaN(parsedOldPrice) || parsedOldPrice < 0)
        return setError(t("err.oldPriceInvalid"));
      if (parsedOldPrice <= parsedPrice)
        return setError(t("err.oldPriceTooLow"));
    }
    if (!categoryId) return setError(t("err.categoryRequired"));

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        price: parsedPrice,
        old_price: parsedOldPrice,
        image_url: imageUrl.trim(),
        category_id: categoryId,
        description: description.trim(),
        benefits: benefits.trim(),
        ingredients: ingredients.trim(),
        usage: usage.trim(),
        name_ar: nameAr.trim(),
        description_ar: descriptionAr.trim(),
        benefits_ar: benefitsAr.trim(),
        ingredients_ar: ingredientsAr.trim(),
        usage_ar: usageAr.trim(),
        stock: stock.trim() === "" ? undefined : Math.max(0, parseInt(stock, 10)),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("err.saveGeneric"));
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
      setError(err instanceof Error ? err.message : t("err.deleteProduct"));
      setConfirmDelete(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // What the offer will look like on the storefront, as the two numbers are
  // typed — so a wrong way round pair is obvious before it is saved.
  const previewNew = parseFloat(price);
  const previewOld = parseFloat(oldPrice);
  const offerPreview =
    Number.isFinite(previewNew) &&
    Number.isFinite(previewOld) &&
    previewOld > previewNew
      ? t("modal.offerPreview", {
          old: num(previewOld),
          price: num(previewNew),
          currency: t("common.currency"),
          n: Math.round(((previewOld - previewNew) / previewOld) * 100),
        })
      : null;

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
            {product ? t("modal.editProduct") : t("modal.newProduct")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
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
              <label className="label-caps mb-1.5 block text-ink-3">
                {t("modal.name")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("modal.namePlaceholder")}
                dir="ltr"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-caps mb-1.5 block text-ink-3">
                  {t("modal.code")}
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t("modal.codePlaceholder")}
                  dir="ltr"
                  className={`${inputCls} uppercase`}
                />
              </div>
              <div>
                <label className="label-caps mb-1.5 block text-ink-3">
                  {t("modal.priceIqd")}
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={t("modal.pricePlaceholder")}
                  dir="ltr"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Offer — the old price shoppers see struck through. */}
            <div>
              <label className="label-caps mb-1.5 block text-ink-3">
                {t("modal.oldPriceIqd")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={oldPrice}
                  onChange={(e) => setOldPrice(e.target.value)}
                  placeholder={t("modal.noOffer")}
                  dir="ltr"
                  className={inputCls}
                />
                {oldPrice.trim() !== "" && (
                  <button
                    type="button"
                    onClick={() => setOldPrice("")}
                    className="label-caps shrink-0 rounded-md border border-line px-3 py-2.5 text-ink-2 transition hover:bg-sunken hover:text-ink"
                  >
                    {t("modal.clearOffer")}
                  </button>
                )}
              </div>
              <p className="mt-1 text-[11px] text-ink-3">
                {offerPreview ?? t("modal.oldPriceHint")}
              </p>
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-ink-3">
                {t("stock.label")}
              </label>
              <input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder={t("stock.untracked")}
                dir="ltr"
                className={inputCls}
              />
              <p className="mt-1 text-[11px] text-ink-3">
                {t("stock.untrackedHint")}
              </p>
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-ink-3">
                {t("modal.category")}
              </label>
              <Dropdown
                ariaLabel={t("modal.categoryAria")}
                value={String(categoryId)}
                onChange={(v) => setCategoryId(parseInt(v))}
                options={categories.map((cat) => ({
                  value: String(cat.id),
                  label: localized(cat, "name", lang),
                }))}
              />
            </div>

            {/* Photo */}
            <div>
              <label className="label-caps mb-1.5 block text-ink-3">
                {t("modal.photo")}
              </label>
              <div className="flex gap-4">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-white">
                  {imageUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={t("modal.preview")}
                        className="h-full w-full object-contain p-1"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        aria-label={t("modal.removePhoto")}
                        className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose text-white shadow hover:opacity-90"
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
                    {uploading ? t("modal.uploading") : t("modal.uploadPhoto")}
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
                    dir="ltr"
                    className={`${inputCls} py-2 text-xs`}
                  />
                </div>
              </div>
            </div>

            {/* ── Product details (shown to shoppers on the detail view) ── */}
            <div className="mt-1 border-t border-line pt-4">
              <p className="label-caps text-ink-3">{t("modal.detailsTitle")}</p>
              <p className="mt-1 text-[11px] text-ink-3">
                {t("modal.detailsHint")}
              </p>
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-ink-3">
                {t("modal.description")}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("modal.descriptionPlaceholder")}
                dir="ltr"
                className={textareaCls}
              />
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-ink-3">
                {t("modal.benefits")}
              </label>
              <textarea
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
                placeholder={t("modal.benefitsPlaceholder")}
                dir="ltr"
                className={textareaCls}
              />
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-ink-3">
                {t("modal.ingredients")}
              </label>
              <textarea
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder={t("modal.ingredientsPlaceholder")}
                dir="ltr"
                className={textareaCls}
              />
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-ink-3">
                {t("modal.howToUse")}
              </label>
              <textarea
                value={usage}
                onChange={(e) => setUsage(e.target.value)}
                placeholder={t("modal.usagePlaceholder")}
                dir="ltr"
                className={textareaCls}
              />
            </div>

            {/* ── Arabic copy ──
                Always typed right-to-left regardless of the admin's own UI
                language, so the text reads the way the shopper will see it. */}
            <div className="mt-1 border-t border-line pt-4">
              <p className="label-caps text-ink-3">{t("modal.arabicTitle")}</p>
              <p className="mt-1 text-[11px] text-ink-3">
                {t("modal.arabicHint")}
              </p>
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-ink-3">
                {t("modal.nameAr")}
              </label>
              <input
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder={t("modal.nameArPlaceholder")}
                dir="rtl"
                className={inputCls}
              />
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-ink-3">
                {t("modal.description")}
              </label>
              <textarea
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
                placeholder={t("modal.descriptionPlaceholder")}
                dir="rtl"
                className={textareaCls}
              />
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-ink-3">
                {t("modal.benefits")}
              </label>
              <textarea
                value={benefitsAr}
                onChange={(e) => setBenefitsAr(e.target.value)}
                placeholder={t("modal.benefitsPlaceholder")}
                dir="rtl"
                className={textareaCls}
              />
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-ink-3">
                {t("modal.ingredients")}
              </label>
              <textarea
                value={ingredientsAr}
                onChange={(e) => setIngredientsAr(e.target.value)}
                placeholder={t("modal.ingredientsPlaceholder")}
                dir="rtl"
                className={textareaCls}
              />
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-ink-3">
                {t("modal.howToUse")}
              </label>
              <textarea
                value={usageAr}
                onChange={(e) => setUsageAr(e.target.value)}
                placeholder={t("modal.usagePlaceholder")}
                dir="rtl"
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
                {confirmDelete ? t("modal.confirmDelete") : t("common.delete")}
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
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || uploading}
                className="label-caps rounded-md bg-brand px-5 py-2.5 text-on-brand transition hover:bg-brand-deep disabled:opacity-50"
              >
                {isSubmitting
                  ? t("common.saving")
                  : product
                    ? t("modal.saveChanges")
                    : t("products.addProduct")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
