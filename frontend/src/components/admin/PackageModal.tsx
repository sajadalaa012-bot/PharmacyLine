"use client";

import { useState, useEffect, useRef } from "react";
import {
  Package as PackageType,
  PackageInput,
  PackageItem,
  Product,
  packageValue,
} from "@/types";
import { X, Trash2, Boxes } from "lucide-react";
import Dropdown from "@/components/Dropdown";
import { uploadProductImage } from "@/lib/api";
import { useI18n } from "@/lib/LanguageProvider";
import { localized } from "@/lib/i18n";
import { num } from "@/lib/format";

interface PackageModalProps {
  isOpen: boolean;
  /** The package being edited, or null to create a new one. */
  pkg: PackageType | null;
  /** The whole catalogue, to pick contents from. */
  products: Product[];
  /** Where a new package lands in the running order. */
  nextOrder: number;
  onClose: () => void;
  onSave: (input: PackageInput) => Promise<void>;
}

/**
 * Where a package is put together and priced.
 *
 * The one thing this screen is really for is the price. Everything above it —
 * the contents, and the "bought separately" total that follows from them — is
 * there so the number typed at the bottom can be an informed one: a package
 * is a discount, and you cannot set a discount without knowing what the
 * things are worth apart.
 */
export default function PackageModal({
  isOpen,
  pkg,
  products,
  nextOrder,
  onClose,
  onSave,
}: PackageModalProps) {
  const { t, lang } = useI18n();

  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [active, setActive] = useState(false);
  const [items, setItems] = useState<PackageItem[]>([]);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset every time the modal opens, so editing one package and then
  // creating another doesn't inherit the first one's fields.
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setName(pkg?.name ?? "");
    setNameAr(pkg?.name_ar ?? "");
    setDescription(pkg?.description ?? "");
    setDescriptionAr(pkg?.description_ar ?? "");
    setImageUrl(pkg?.image_url ?? "");
    setPrice(pkg ? String(pkg.price) : "");
    setOldPrice(pkg?.old_price != null ? String(pkg.old_price) : "");
    setActive(pkg?.active ?? false);
    setItems(pkg ? pkg.items.map((it) => ({ ...it })) : []);
  }, [isOpen, pkg]);

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

  // ── Contents ──
  const chosen = new Set(items.map((it) => it.product_id));
  /** Only what isn't already in — a product can't be two lines of one kit. */
  const options = products
    .filter((p) => !chosen.has(p.id))
    .map((p) => ({
      value: String(p.id),
      label: localized(p, "name", lang),
      meta: p.code,
      keywords: `${p.name} ${p.name_ar ?? ""} ${p.code}`,
    }));

  const addItem = (value: string) => {
    const id = parseInt(value, 10);
    if (!Number.isInteger(id)) return;
    setItems((prev) =>
      prev.some((it) => it.product_id === id)
        ? prev
        : [...prev, { product_id: id, quantity: 1 }],
    );
  };

  const setQuantity = (productId: number, qty: number) =>
    setItems((prev) =>
      prev.map((it) =>
        it.product_id === productId
          ? { ...it, quantity: Math.min(99, Math.max(1, qty)) }
          : it,
      ),
    );

  const removeItem = (productId: number) =>
    setItems((prev) => prev.filter((it) => it.product_id !== productId));

  const byId = new Map(products.map((p) => [p.id, p]));
  // What the contents cost bought one by one, at today's prices. The number
  // the package price is set against.
  const separately = packageValue({ items }, products);

  const parsedPrice = parseFloat(price);
  const priceSet = Number.isFinite(parsedPrice) && parsedPrice >= 0;
  const parsedOld = oldPrice.trim() === "" ? null : parseFloat(oldPrice);
  const saving_ =
    priceSet && parsedOld !== null && Number.isFinite(parsedOld) && parsedOld > parsedPrice
      ? parsedOld - parsedPrice
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError(t("err.packageNameRequired"));
    if (!priceSet) return setError(t("err.priceInvalid"));
    if (parsedOld !== null) {
      if (!Number.isFinite(parsedOld) || parsedOld < 0)
        return setError(t("err.oldPriceInvalid"));
      if (parsedOld <= parsedPrice) return setError(t("err.oldPriceTooLow"));
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        name_ar: nameAr.trim() || undefined,
        description: description.trim() || undefined,
        description_ar: descriptionAr.trim() || undefined,
        image_url: imageUrl.trim(),
        price: parsedPrice,
        old_price: parsedOld === null ? undefined : parsedOld,
        active,
        display_order: pkg?.display_order ?? nextOrder,
        items,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-md border border-line bg-sunken px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand/50 focus:ring-1 focus:ring-brand/25";
  const labelCls = "label-caps mb-1.5 block text-ink-3";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="fade-in absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="admin relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
            {pkg ? t("pkg.edit") : t("pkg.new")}
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

        <form
          onSubmit={handleSubmit}
          className="scroll-thin flex min-h-0 flex-1 flex-col"
        >
          <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {error && (
              <div className="rounded-md border border-rose/30 bg-rose/10 p-3 text-xs text-rose">
                {error}
              </div>
            )}

            {/* ── Name ── */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>{t("pkg.name")}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("pkg.namePlaceholder")}
                  dir="ltr"
                  autoFocus
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t("pkg.nameAr")}</label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder={t("pkg.nameArPlaceholder")}
                  dir="rtl"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>{t("pkg.description")}</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("pkg.descriptionPlaceholder")}
                  dir="ltr"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t("pkg.descriptionAr")}</label>
                <input
                  type="text"
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                  dir="rtl"
                  className={inputCls}
                />
              </div>
            </div>

            {/* ── Photo ── */}
            <div>
              <label className={labelCls}>{t("modal.photo")}</label>
              <p className="mb-2 text-[11px] text-ink-3">{t("pkg.photoHint")}</p>
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
                        className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose text-paper shadow hover:opacity-90"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <Boxes className="h-6 w-6 text-line-strong" />
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
                </div>
              </div>
            </div>

            {/* ── Contents ── */}
            <div className="border-t border-line pt-4">
              <p className="label-caps text-ink-3">{t("pkg.contents")}</p>
              <p className="mt-1 text-[11px] text-ink-3">
                {t("pkg.contentsHint")}
              </p>
            </div>

            {/* Stays on the placeholder after every pick — it is an "add"
                control, not a field holding one value. */}
            <div>
              <label className={labelCls}>{t("pkg.addProduct")}</label>
              <Dropdown
                value=""
                options={options}
                onChange={addItem}
                ariaLabel={t("pkg.addProduct")}
                placeholder={t("pkg.pickProduct")}
                searchable
              />
            </div>

            {items.length === 0 ? (
              <p className="rounded-md border border-dashed border-line px-3 py-4 text-center text-xs text-ink-3">
                {t("pkg.noContents")}
              </p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-md border border-line">
                {items.map((it) => {
                  const product = byId.get(it.product_id);
                  const itemName = product
                    ? localized(product, "name", lang)
                    : `#${it.product_id}`;
                  return (
                    <li
                      key={it.product_id}
                      className="flex items-center gap-3 bg-sunken/40 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink">
                          <bdi>{itemName}</bdi>
                        </p>
                        {product && (
                          <p className="label-caps mt-0.5 text-ink-3">
                            {product.code} · {num(product.price)}{" "}
                            {t("common.currency")}
                          </p>
                        )}
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={it.quantity}
                        onChange={(e) =>
                          setQuantity(it.product_id, parseInt(e.target.value, 10) || 1)
                        }
                        aria-label={t("pkg.qtyAria", { name: itemName })}
                        dir="ltr"
                        className="h-8 w-14 shrink-0 rounded-md border border-line bg-surface px-2 text-center text-sm tabular-nums text-ink outline-none focus:border-brand/50"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(it.product_id)}
                        title={t("pkg.removeItem")}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-3 transition hover:bg-rose/15 hover:text-rose"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* ── Price ── */}
            <div className="border-t border-line pt-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="label-caps text-ink-3">{t("pkg.separately")}</p>
                <p className="font-display text-base font-semibold tabular-nums text-ink">
                  {num(separately)}{" "}
                  <span className="text-[10px] font-semibold tracking-[0.08em] text-ink-3">
                    {t("common.currency")}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>{t("pkg.packagePrice")}</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  dir="ltr"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t("pkg.wasPrice")}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={oldPrice}
                    onChange={(e) => setOldPrice(e.target.value)}
                    placeholder="—"
                    dir="ltr"
                    className={inputCls}
                  />
                  {/* One tap to quote the contents at full price, which is
                      the honest "was" for a package and the one anybody
                      would otherwise be adding up by hand. */}
                  {separately > 0 && (
                    <button
                      type="button"
                      onClick={() => setOldPrice(String(Math.round(separately)))}
                      className="label-caps shrink-0 rounded-md border border-brand/40 bg-brand/10 px-2.5 text-brand transition hover:bg-brand/20"
                    >
                      {t("pkg.useSeparately", { n: num(separately) })}
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-ink-3">{t("pkg.wasHint")}</p>
              </div>
            </div>

            {saving_ > 0 && (
              <p className="rounded-md border border-copper/30 bg-copper/10 px-3 py-2 text-xs font-semibold text-copper">
                {t("pkg.saving", {
                  n: `${num(saving_)} ${t("common.currency")}`,
                  p: Math.round((saving_ / (parsedOld as number)) * 100),
                })}
              </p>
            )}

            {/* ── Live or hidden ── */}
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-sunken/40 px-3 py-3">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
              />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-ink">
                  {t("pkg.showOnStorefront")}
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-3">
                  {t("pkg.hiddenHint")}
                </span>
              </span>
            </label>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-line px-5 py-3.5">
            <button
              type="button"
              onClick={onClose}
              className="label-caps h-10 rounded-md border border-line px-5 text-ink-2 transition hover:bg-sunken hover:text-ink"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="label-caps h-10 rounded-md bg-brand px-6 text-on-brand transition hover:bg-brand-deep active:scale-[0.98] disabled:opacity-40"
            >
              {saving ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
