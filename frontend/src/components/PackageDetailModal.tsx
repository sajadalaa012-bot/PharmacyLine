"use client";

import { useEffect } from "react";
import {
  Package as PackageType,
  Product,
  isDiscounted,
  discountPercent,
  packageCode,
  packageContents,
  packageItemCount,
  packageValue,
  photoPair,
  hasPhoto,
} from "@/types";
import BannerPhoto from "./BannerPhoto";
import { useI18n } from "@/lib/LanguageProvider";
import { localized } from "@/lib/i18n";
import { num } from "@/lib/format";
import { X, Package, Plus, Minus, Boxes, ChevronRight } from "lucide-react";

interface PackageDetailModalProps {
  pkg: PackageType;
  /** The whole catalogue, to resolve what is in the package. */
  products: Product[];
  /** How many of this package are in the basket. */
  qty: number;
  onClose: () => void;
  onAdd: (pkg: PackageType) => void;
  onRemove: (pkg: PackageType) => void;
  /** Opens one of the contents in the product view, on top of this one. */
  onOpenProduct?: (product: Product) => void;
  /**
   * True while one of the contents is open over this. Escape then belongs to
   * that view - both listen on the window, so without this a single press
   * would shut the pair and send the shopper back to the deck.
   */
  layered?: boolean;
}

/**
 * A package opened up: the photograph, the whole description, and every
 * product in it named and priced.
 *
 * The slide it opens from has room for a sentence and a price, which is
 * enough to catch someone's eye and not enough to decide on. This is where
 * the kit is actually read - so the description is not clamped, the contents
 * are a list rather than three plates, and each line carries what that item
 * costs on its own, because what a package is worth is the sum it saves.
 */
export default function PackageDetailModal({
  pkg,
  products,
  qty,
  onClose,
  onAdd,
  onRemove,
  onOpenProduct,
  layered = false,
}: PackageDetailModalProps) {
  const { t, lang } = useI18n();

  const name = localized(pkg, "name", lang);
  const blurb = localized(pkg, "description", lang);
  const contents = packageContents(pkg, products);
  const count = packageItemCount(pkg);
  const separately = packageValue(pkg, products);

  const onOffer = isDiscounted(pkg);
  const saving = onOffer ? (pkg.old_price as number) - pkg.price : 0;
  const off = discountPercent(pkg);

  // Close on Escape - unless one of the contents is open over this.
  useEffect(() => {
    if (layered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, layered]);

  // Lock background scroll while the modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-[2px] sm:items-center sm:p-4">
      {/* Backdrop click closes */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="pop relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line-strong bg-surface shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-sunken/50 px-5 py-3.5">
          <span className="label-caps flex items-center gap-1.5 rounded-sm border border-brand/25 bg-brand/[0.08] px-1.5 py-0.5 text-brand">
            <Boxes className="h-3 w-3" />
            {packageCode(pkg)}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 transition hover:bg-sunken hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* The package's own photograph, as wide as the sheet - it was shot
              for the kit, so it is shown the way the slide shows it rather
              than shrunk onto a product's square plate. */}
          {hasPhoto(pkg) && (
            <div className="relative h-44 w-full overflow-hidden sm:h-56">
              <BannerPhoto
                photo={photoPair(pkg)}
                alt={name}
                className="h-full w-full object-cover"
              />
              {onOffer && (
                <span className="label-caps absolute end-3 top-3 rounded-full bg-rose px-2.5 py-1 text-paper shadow-sm">
                  {t("offer.percentOff", { n: off })}
                </span>
              )}
            </div>
          )}

          <div className="p-5">
            <h3 className="font-display text-xl font-semibold leading-snug tracking-tight text-ink">
              <bdi>{name}</bdi>
            </h3>

            {/* Price - "was … now …", the shape every card uses. */}
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <p
                className={`font-display text-2xl font-semibold tracking-tight tabular-nums ${
                  onOffer ? "text-rose" : "text-ink"
                }`}
              >
                {num(pkg.price)}
                <span
                  className={`ms-1.5 font-sans text-xs font-semibold tracking-[0.08em] ${
                    onOffer ? "text-rose/70" : "text-ink-3"
                  }`}
                >
                  {t("common.currency")}
                </span>
              </p>
              {onOffer && (
                <>
                  <span className="font-display text-base font-semibold text-ink-3 line-through decoration-rose/70 decoration-[1.5px] tabular-nums">
                    {num(pkg.old_price as number)}
                  </span>
                  {/* No offer flag when there is no photograph to carry it. */}
                  {!hasPhoto(pkg) && (
                    <span className="label-caps rounded-full bg-rose px-2 py-0.5 text-paper">
                      {t("offer.percentOff", { n: off })}
                    </span>
                  )}
                </>
              )}
            </div>

            {saving > 0 && (
              <p className="mt-1.5 text-[13px] font-semibold text-copper">
                {t("pkg.save", { n: `${num(saving)} ${t("common.currency")}` })}
              </p>
            )}

            {/* Add / adjust */}
            <div className="mt-4">
              {qty === 0 ? (
                <button
                  onClick={() => onAdd(pkg)}
                  className="h-11 w-full rounded-md bg-brand text-sm font-semibold text-cart transition hover:bg-brand-deep active:scale-[0.99]"
                >
                  {t("pkg.addToCart")}
                </button>
              ) : (
                <div className="flex h-11 items-center justify-between rounded-md border border-line-strong bg-sunken px-1.5">
                  <button
                    onClick={() => onRemove(pkg)}
                    aria-label={t("product.removeOne", { name })}
                    className="flex h-9 w-10 items-center justify-center rounded text-ink-2 transition hover:bg-rose/10 hover:text-rose active:scale-90"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-[13px] font-semibold text-ink">
                    {t("pkg.inCart", { n: qty })}
                  </span>
                  <button
                    onClick={() => onAdd(pkg)}
                    aria-label={t("product.addOne", { name })}
                    className="flex h-9 w-10 items-center justify-center rounded text-ink-2 transition hover:bg-brand/10 hover:text-brand active:scale-90"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* The description in full - this is the room the slide did not
                have, so nothing is clamped here. */}
            {blurb.trim() && (
              <p className="mt-5 whitespace-pre-line text-[13px] leading-relaxed text-ink-2">
                <bdi>{blurb}</bdi>
              </p>
            )}
          </div>

          {/* ── What's inside ── */}
          <div className="border-t border-line px-5 py-5">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h4 className="font-display text-sm font-semibold tracking-tight text-ink">
                {t("pkg.whatsInside")}
              </h4>
              {count > 0 && (
                <span className="label-caps text-ink-3">
                  {count === 1
                    ? t("pkg.oneItem")
                    : t("pkg.itemsCount", { n: count })}
                </span>
              )}
            </div>

            {contents.length === 0 ? (
              <p className="rounded-md border border-dashed border-line px-3 py-4 text-center text-xs text-ink-3">
                {t("pkg.emptyNote")}
              </p>
            ) : (
              <>
                <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                  {contents.map(({ product, quantity }) => {
                    const itemName = localized(product, "name", lang);
                    return (
                      <li key={product.id}>
                        <button
                          type="button"
                          onClick={() => onOpenProduct?.(product)}
                          disabled={!onOpenProduct}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-start transition enabled:hover:bg-sunken/50 disabled:cursor-default"
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-white">
                            {product.image_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={product.image_url}
                                alt={itemName}
                                loading="lazy"
                                className="h-full w-full object-contain p-1"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-line-strong" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-[13px] font-medium leading-snug text-ink">
                              <bdi>{itemName}</bdi>
                            </p>
                            <p className="label-caps mt-0.5 text-ink-3">
                              {product.code} · {num(product.price)}{" "}
                              {t("common.currency")}
                            </p>
                          </div>

                          {quantity > 1 && (
                            <span className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-[12px] font-semibold tabular-nums text-ink-2">
                              {t("pkg.timesQty", { n: quantity })}
                            </span>
                          )}
                          {onOpenProduct && (
                            <ChevronRight className="h-4 w-4 shrink-0 flip-rtl text-ink-3" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {/* What the same basket costs one item at a time - the
                    number the package price is asking to be judged against. */}
                {separately > 0 && (
                  <div className="mt-3 flex items-baseline justify-between gap-3 rounded-md bg-sunken/60 px-3.5 py-2.5">
                    <span className="text-[12px] text-ink-2">
                      {t("pkg.separately")}
                    </span>
                    <span className="font-display text-[15px] font-semibold tabular-nums text-ink">
                      {num(separately)}{" "}
                      <span className="text-[10px] font-semibold tracking-[0.08em] text-ink-3">
                        {t("common.currency")}
                      </span>
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
