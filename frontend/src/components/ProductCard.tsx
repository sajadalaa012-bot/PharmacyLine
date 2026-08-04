"use client";

import { Product } from "@/types";
import { Package, Plus, Minus, Maximize2 } from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";
import { localized } from "@/lib/i18n";
import { num } from "@/lib/format";

interface ProductCardProps {
  product: Product;
  qty: number;
  mode: "shop" | "pos";
  onAdd: (product: Product) => void;
  onRemove: (product: Product) => void;
  onFree?: (product: Product) => void;
  /** When set, tapping the image or name opens the product detail view. */
  onOpenDetail?: (product: Product) => void;
  index?: number;
}

export default function ProductCard({
  product,
  qty,
  mode,
  onAdd,
  onRemove,
  onFree,
  onOpenDetail,
  index = 0,
}: ProductCardProps) {
  const { t, lang } = useI18n();
  // The shopper-facing name: Arabic when set, English otherwise.
  const name = localized(product, "name", lang);
  // Every item shares the same peach tint (matches the F7 card).
  const tintClass = "tint-2";

  return (
    <article
      className={`rise group relative flex flex-col overflow-hidden rounded-2xl ${tintClass} ring-1 ring-black/[0.05]
                 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgba(34,49,42,0.45)]`}
      style={{ animationDelay: `${Math.min(index * 25, 350)}ms` }}
    >
      {/* Quantity marker */}
      {qty > 0 && (
        <span className="pop absolute end-2 top-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-on-brand shadow-md">
          {qty}
        </span>
      )}

      {/* Image — floats on a clean white plate framed by the pastel card.
          Tapping it opens the product detail view (when enabled). */}
      <button
        type="button"
        onClick={() => onOpenDetail?.(product)}
        disabled={!onOpenDetail}
        aria-label={
          onOpenDetail ? t("product.viewDetails", { name }) : undefined
        }
        className={`group/img relative m-2.5 flex items-center justify-center overflow-hidden rounded-xl bg-white p-2 ${
          mode === "shop" ? "h-32" : "h-24"
        } ${onOpenDetail ? "cursor-zoom-in" : "cursor-default"}`}
      >
        {product.image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={product.image_url}
            alt={name}
            loading="lazy"
            className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover/img:scale-105"
          />
        ) : (
          <Package className="h-8 w-8 text-line-strong" />
        )}
        {onOpenDetail && (
          <span className="pointer-events-none absolute end-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/55 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover/img:opacity-100">
            <Maximize2 className="h-3 w-3" />
          </span>
        )}
      </button>

      {/* Body */}
      <div className={`flex flex-1 flex-col gap-1.5 ${mode === "shop" ? "px-3.5 pb-3.5 pt-1" : "px-3 pb-3 pt-0.5"}`}>
        <span className="label-caps self-start rounded-sm border border-brand/25 bg-brand/[0.07] px-1.5 py-0.5 text-brand">
          {product.code}
        </span>

        <h3
          onClick={onOpenDetail ? () => onOpenDetail(product) : undefined}
          className={`line-clamp-2 font-medium leading-snug text-[#211d17] ${
            mode === "shop" ? "min-h-10 text-sm" : "min-h-9 text-[13px]"
          } ${onOpenDetail ? "cursor-pointer transition-colors hover:text-brand" : ""}`}
        >
          <bdi>{name}</bdi>
        </h3>

        <p className="mt-auto font-display text-base font-semibold tracking-tight text-[#211d17] tabular-nums">
          {num(product.price)}
          <span className="ms-1 font-sans text-[10px] font-semibold tracking-[0.08em] text-[#8c8073]">
            {t("common.currency")}
          </span>
        </p>

        {/* Actions */}
        {mode === "shop" ? (
          qty === 0 ? (
            <button
              onClick={() => onAdd(product)}
              className="mt-1.5 h-9 w-full rounded-md bg-brand text-[13px] font-semibold tracking-[0.01em] text-cart
                         transition-colors duration-200 hover:bg-brand-deep active:scale-[0.98]"
            >
              {t("product.addToCart")}
            </button>
          ) : (
            <div className="mt-1.5 flex h-9 items-center justify-between rounded-md border border-line-strong bg-sunken px-1">
              <button
                onClick={() => onRemove(product)}
                aria-label={t("product.removeOne", { name })}
                className="flex h-7 w-8 items-center justify-center rounded text-ink-2 transition hover:bg-rose/10 hover:text-rose active:scale-90"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-sm font-bold text-ink tabular-nums">{qty}</span>
              <button
                onClick={() => onAdd(product)}
                aria-label={t("product.addOne", { name })}
                className="flex h-7 w-8 items-center justify-center rounded text-ink-2 transition hover:bg-brand/10 hover:text-brand active:scale-90"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        ) : (
          <div className="mt-1.5 flex items-center gap-1.5">
            <button
              onClick={() => onRemove(product)}
              disabled={qty === 0}
              aria-label={t("product.remove", { name })}
              className="flex h-8 w-9 items-center justify-center rounded-md border border-line bg-surface text-ink-2
                         transition hover:border-rose/40 hover:bg-rose/10 hover:text-rose active:scale-90
                         disabled:pointer-events-none disabled:opacity-30"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onAdd(product)}
              aria-label={t("product.addAria", { name })}
              className="flex h-8 w-9 items-center justify-center rounded-md bg-brand text-on-brand
                         transition hover:bg-brand-deep active:scale-90"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onFree?.(product)}
              aria-label={t("product.addBonus", { name })}
              className="label-caps h-8 flex-1 rounded-md border border-copper/35 bg-copper/[0.08] text-copper
                         transition hover:bg-copper/15 active:scale-95"
            >
              {t("common.bonus")}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
