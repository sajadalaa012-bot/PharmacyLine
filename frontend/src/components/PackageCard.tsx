"use client";

import { useState } from "react";
import {
  Package as PackageType,
  Product,
  isDiscounted,
  discountPercent,
  packageAsProduct,
  packageContents,
  packageItemCount,
} from "@/types";
import { Package, Plus, Minus, ChevronDown, Boxes } from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";
import { localized } from "@/lib/i18n";
import { num } from "@/lib/format";

interface PackageCardProps {
  pkg: PackageType;
  /** The whole catalogue, so the card can name what is inside. */
  products: Product[];
  /** How many of this package are in the basket. */
  qty: number;
  onAdd: (product: Product) => void;
  onRemove: (product: Product) => void;
  index?: number;
}

/**
 * One package on the storefront — a set of products sold together for one
 * price. A wider card than a product's: what makes a package worth buying is
 * the list of what is in it, so that list has to fit on the card rather than
 * behind a tap. It opens closed all the same, since six product names above
 * the price would push the price off a phone screen.
 *
 * The package goes into the basket as a single line. See packageAsProduct —
 * the cart, the checkout and the receipt never learn that packages exist.
 */
export default function PackageCard({
  pkg,
  products,
  qty,
  onAdd,
  onRemove,
  index = 0,
}: PackageCardProps) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);

  const name = localized(pkg, "name", lang);
  const blurb = localized(pkg, "description", lang);
  const contents = packageContents(pkg, products);
  const count = packageItemCount(pkg);

  // The same offer rule as a product: a "was" price only counts when it is
  // genuinely above what the package sells for. See isDiscounted.
  const onOffer = isDiscounted(pkg);
  const saving = onOffer ? (pkg.old_price as number) - pkg.price : 0;
  const off = discountPercent(pkg);

  // What the cart is handed. Built here rather than by the parent so the
  // parent never has to hold a product that isn't one.
  const asProduct = packageAsProduct(pkg);

  return (
    <article
      className="rise relative flex flex-col overflow-hidden rounded-2xl tint-4 ring-1 ring-black/[0.05]
                 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgba(27,39,51,0.45)]"
      style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }}
    >
      {onOffer && (
        <span className="label-caps absolute start-2 top-2 z-10 rounded-full bg-rose px-2 py-1 text-[10px] text-paper shadow-sm">
          {t("offer.percentOff", { n: off })}
        </span>
      )}

      {qty > 0 && (
        <span className="pop absolute end-2 top-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-on-brand shadow-md">
          {qty}
        </span>
      )}

      <div className="flex gap-3 p-2.5">
        {/* Photo — a plate the same shape as a product card's, so a row of
            packages and a row of products read as the same shop. */}
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-2 sm:h-28 sm:w-28">
          {pkg.image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={pkg.image_url}
              alt={name}
              loading="lazy"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <Boxes className="h-8 w-8 text-line-strong" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="label-caps self-start rounded-sm border border-brand/25 bg-brand/[0.07] px-1.5 py-0.5 text-brand">
            {t("pkg.title")}
          </span>

          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[#1b2733]">
            <bdi>{name}</bdi>
          </h3>

          {blurb && (
            <p className="line-clamp-2 text-[11px] leading-snug text-[#5b6b7c]">
              <bdi>{blurb}</bdi>
            </p>
          )}

          {/* Price — "was … now …", the product card's shape exactly. */}
          <div className="mt-auto flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 pt-1">
            {onOffer && (
              <span className="font-display text-[13px] font-semibold text-ink-3 line-through decoration-rose/70 decoration-[1.5px] tabular-nums">
                {num(pkg.old_price as number)}
              </span>
            )}
            <p
              className={`font-display text-lg font-semibold tracking-tight tabular-nums ${
                onOffer ? "text-rose" : "text-[#1b2733]"
              }`}
            >
              {num(pkg.price)}
              <span
                className={`ms-1 font-sans text-[10px] font-semibold tracking-[0.08em] ${
                  onOffer ? "text-rose/70" : "text-[#8294a6]"
                }`}
              >
                {t("common.currency")}
              </span>
            </p>
          </div>

          {saving > 0 && (
            <p className="text-[11px] font-semibold text-copper">
              {t("pkg.save", { n: `${num(saving)} ${t("common.currency")}` })}
            </p>
          )}
        </div>
      </div>

      <div className="px-2.5 pb-2.5">
        {/* What's inside. A package with nothing listed still sells — the
            shop may be putting it together by hand — it just says so. */}
        {contents.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={t(open ? "pkg.hideContents" : "pkg.showContents", {
                name,
              })}
              className="flex w-full items-center justify-between gap-2 rounded-lg bg-white/60 px-3 py-2 text-start transition hover:bg-white"
            >
              <span className="flex items-baseline gap-2 text-[12px] font-semibold text-[#1b2733]">
                {t("pkg.whatsInside")}
                <span className="label-caps text-[#8294a6]">
                  {count === 1
                    ? t("pkg.oneItem")
                    : t("pkg.itemsCount", { n: count })}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#8294a6] transition-transform duration-200 ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>

            {open && (
              <ul className="mt-1.5 space-y-1 rounded-lg bg-white/45 px-3 py-2">
                {contents.map(({ product, quantity }) => (
                  <li
                    key={product.id}
                    className="flex items-baseline gap-2 text-[12px] leading-snug text-[#3d4d5e]"
                  >
                    <Package className="h-3 w-3 shrink-0 translate-y-0.5 text-[#8294a6]" />
                    <span className="min-w-0 flex-1">
                      <bdi>{localized(product, "name", lang)}</bdi>
                    </span>
                    {quantity > 1 && (
                      <span className="shrink-0 font-semibold tabular-nums text-[#8294a6]">
                        {t("pkg.timesQty", { n: quantity })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="rounded-lg bg-white/60 px-3 py-2 text-[12px] text-[#5b6b7c]">
            {t("pkg.emptyNote")}
          </p>
        )}

        {/* Actions — the product card's stepper, so adding a package feels
            like adding anything else. */}
        {qty === 0 ? (
          <button
            onClick={() => onAdd(asProduct)}
            className="mt-2 h-10 w-full rounded-md bg-brand text-[13px] font-semibold tracking-[0.01em] text-cart
                       transition-colors duration-200 hover:bg-brand-deep active:scale-[0.98]"
          >
            {t("pkg.addToCart")}
          </button>
        ) : (
          <div className="mt-2 flex h-10 items-center justify-between rounded-md border border-line-strong bg-sunken px-1">
            <button
              onClick={() => onRemove(asProduct)}
              aria-label={t("product.removeOne", { name })}
              className="flex h-8 w-9 items-center justify-center rounded text-ink-2 transition hover:bg-rose/10 hover:text-rose active:scale-90"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-sm font-bold text-ink tabular-nums">{qty}</span>
            <button
              onClick={() => onAdd(asProduct)}
              aria-label={t("product.addOne", { name })}
              className="flex h-8 w-9 items-center justify-center rounded text-ink-2 transition hover:bg-brand/10 hover:text-brand active:scale-90"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
