"use client";

import {
  Product,
  isOutOfStock,
  isStockTracked,
  isDiscounted,
  discountPercent,
} from "@/types";
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
  const soldOut = isOutOfStock(product);
  // On offer: the card shows what it used to cost next to what it costs now.
  const onOffer = isDiscounted(product);
  const off = discountPercent(product);
  // Nudge, not alarm: only worth saying when the number is genuinely small.
  const runningLow =
    !soldOut && isStockTracked(product) && (product.stock ?? 0) <= 5;
  // Never let the basket exceed what is on the shelf.
  const atStockLimit = isStockTracked(product) && qty >= (product.stock ?? 0);
  // Every item shares the same peach tint (matches the F7 card).
  const tintClass = "tint-2";

  return (
    <article
      className={`rise group relative flex flex-col overflow-hidden rounded-2xl ${tintClass} ring-1 ring-black/[0.05]
                 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgba(34,49,42,0.45)]`}
      style={{ animationDelay: `${Math.min(index * 25, 350)}ms` }}
    >
      {soldOut && (
        <span className="label-caps absolute start-2 top-2 z-10 rounded-full bg-ink/80 px-2 py-1 text-[10px] text-paper">
          {t("stock.outOfStock")}
        </span>
      )}

      {/* Offer flag — under the sold-out one when a product is both. */}
      {onOffer && (
        <span
          className={`label-caps absolute start-2 z-10 rounded-full bg-rose px-2 py-1 text-[10px] text-white shadow-sm ${
            soldOut ? "top-10" : "top-2"
          }`}
        >
          {t("offer.percentOff", { n: off })}
        </span>
      )}

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

        {runningLow && (
          <p className="text-[11px] font-semibold text-copper">
            {t("stock.left", { n: product.stock ?? 0 })}
          </p>
        )}

        {/* Price. On offer it reads "was … now …": the old price struck
            through, then what the shopper actually pays. */}
        <div className="mt-auto flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          {onOffer && (
            <span className="font-display text-[13px] font-semibold text-ink-3 line-through decoration-rose/70 decoration-[1.5px] tabular-nums">
              {num(product.old_price as number)}
            </span>
          )}
          <p
            className={`font-display text-base font-semibold tracking-tight tabular-nums ${
              onOffer ? "text-rose" : "text-[#211d17]"
            }`}
          >
            {num(product.price)}
            <span
              className={`ms-1 font-sans text-[10px] font-semibold tracking-[0.08em] ${
                onOffer ? "text-rose/70" : "text-[#8c8073]"
              }`}
            >
              {t("common.currency")}
            </span>
          </p>
        </div>

        {/* Actions */}
        {mode === "shop" ? (
          qty === 0 ? (
            <button
              onClick={() => onAdd(product)}
              disabled={soldOut}
              className="mt-1.5 h-9 w-full rounded-md bg-brand text-[13px] font-semibold tracking-[0.01em] text-cart
                         transition-colors duration-200 hover:bg-brand-deep active:scale-[0.98]
                         disabled:pointer-events-none disabled:bg-line-strong disabled:text-ink-3"
            >
              {soldOut ? t("stock.outOfStock") : t("product.addToCart")}
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
                disabled={atStockLimit}
                aria-label={t("product.addOne", { name })}
                className="flex h-7 w-8 items-center justify-center rounded text-ink-2 transition hover:bg-brand/10 hover:text-brand active:scale-90 disabled:pointer-events-none disabled:opacity-30"
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
              disabled={soldOut || atStockLimit}
              aria-label={t("product.addAria", { name })}
              className="flex h-8 w-9 items-center justify-center rounded-md bg-brand text-on-brand
                         transition hover:bg-brand-deep active:scale-90
                         disabled:pointer-events-none disabled:opacity-30"
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
