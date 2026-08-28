"use client";

import { useEffect, useRef, useState } from "react";
import {
  Product,
  ProductVariant,
  isOutOfStock,
  isStockTracked,
  isDiscounted,
  discountPercent,
  variantsOf,
  variantPricing,
  variantStock,
  variantCode,
} from "@/types";
import { useI18n } from "@/lib/LanguageProvider";
import { localized } from "@/lib/i18n";
import { num } from "@/lib/format";
import {
  X,
  Package,
  Plus,
  Minus,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  FlaskConical,
  ClipboardList,
  Info,
} from "lucide-react";

interface ProductDetailModalProps {
  product: Product;
  /** How many of one option are in the basket — the modal picks the option. */
  qtyOf: (variantId?: string) => number;
  onClose: () => void;
  onAdd: (product: Product, variant?: ProductVariant | null) => void;
  onRemove: (product: Product, variant?: ProductVariant | null) => void;
}

/** Split a multi-line field into clean, non-empty lines. */
function lines(text?: string): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[•\-\*]\s*/, "").trim())
    .filter(Boolean);
}

export default function ProductDetailModal({
  product,
  qtyOf,
  onClose,
  onAdd,
  onRemove,
}: ProductDetailModalProps) {
  const { t, lang } = useI18n();
  const [zoomOpen, setZoomOpen] = useState(false);

  // Shopper-facing copy, Arabic where the admin has written it.
  const name = localized(product, "name", lang);
  const description = localized(product, "description", lang);

  // ── Options ──
  // Opens on the first option that is actually in stock, so the price and the
  // add button never start out describing something nobody can buy.
  const variants = variantsOf(product);
  const firstAvailable =
    variants.find((v) => !isOutOfStock({ stock: variantStock(product, v) })) ??
    variants[0];
  const [chosenId, setChosenId] = useState<string | undefined>(firstAvailable?.id);
  const variant = variants.find((v) => v.id === chosenId) ?? firstAvailable ?? null;

  const pricing = variantPricing(product, variant);
  const stock = variantStock(product, variant);
  const qty = qtyOf(variant?.id);

  const soldOut = isOutOfStock({ stock });
  const onOffer = isDiscounted(pricing);
  const off = discountPercent(pricing);
  const atStockLimit = isStockTracked({ stock }) && qty >= (stock ?? 0);

  // Close on Escape (closes the zoom viewer first, then the modal).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (zoomOpen) setZoomOpen(false);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomOpen, onClose]);

  // Lock background scroll while the modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const benefitLines = lines(localized(product, "benefits", lang));
  const ingredientLines = lines(localized(product, "ingredients", lang));
  const usageLines = lines(localized(product, "usage", lang));
  const hasDetails =
    !!description.trim() ||
    benefitLines.length > 0 ||
    ingredientLines.length > 0 ||
    usageLines.length > 0;

  const Section = ({
    icon: Icon,
    title,
    children,
  }: {
    icon: typeof Sparkles;
    title: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h4 className="mb-2 flex items-center gap-2 font-display text-sm font-semibold tracking-tight text-ink">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand/10 text-brand">
          <Icon className="h-3.5 w-3.5" />
        </span>
        {title}
      </h4>
      <div className="ps-8 text-[13px] leading-relaxed text-ink-2">
        {children}
      </div>
    </section>
  );

  return (
    <div className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-[2px] sm:items-center sm:p-4">
      {/* Backdrop click closes */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="pop relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line-strong bg-surface shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-sunken/50 px-5 py-3.5">
          <span className="label-caps rounded-sm border border-brand/25 bg-brand/[0.08] px-1.5 py-0.5 text-brand">
            {variantCode(product, variant)}
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
          <div className="flex flex-col gap-5 p-5 sm:flex-row">
            {/* Image — tap to magnify */}
            <button
              type="button"
              onClick={() => product.image_url && setZoomOpen(true)}
              disabled={!product.image_url}
              aria-label={t("product.magnifyAria")}
              className="group relative mx-auto flex h-56 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white p-4 sm:mx-0 sm:h-64 sm:w-64"
              style={{ cursor: product.image_url ? "zoom-in" : "default" }}
            >
              {product.image_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.image_url}
                    alt={name}
                    className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute bottom-2 end-2 flex items-center gap-1 rounded-full bg-ink/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                    <Maximize2 className="h-3 w-3" />
                    {t("product.magnify")}
                  </span>
                </>
              ) : (
                <Package className="h-12 w-12 text-line-strong" />
              )}
            </button>

            {/* Title / price / cart */}
            <div className="flex min-w-0 flex-1 flex-col">
              <h3 className="font-display text-xl font-semibold leading-snug tracking-tight text-ink">
                <bdi>{name}</bdi>
              </h3>

              {/* Price — "was … now …" while the product is on offer. */}
              <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <p
                  className={`font-display text-2xl font-semibold tracking-tight tabular-nums ${
                    onOffer ? "text-rose" : "text-ink"
                  }`}
                >
                  {num(pricing.price)}
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
                      {num(pricing.old_price as number)}
                    </span>
                    <span className="label-caps rounded-full bg-rose px-2 py-0.5 text-[10px] text-white">
                      {t("offer.percentOff", { n: off })}
                    </span>
                  </>
                )}
              </div>

              {onOffer && (
                <p className="mt-1.5 text-xs font-semibold text-rose">
                  {t("offer.youSave", {
                    n: num((pricing.old_price as number) - pricing.price),
                    currency: t("common.currency"),
                  })}
                </p>
              )}

              {/* Options, as tappable chips — the whole set is visible at
                  once here, where there is room for it. */}
              {variants.length > 0 && (
                <div className="mt-4">
                  <p className="label-caps mb-2 text-ink-3">
                    {t("variants.chooseLabel")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v) => {
                      const vStock = variantStock(product, v);
                      const vOut = isOutOfStock({ stock: vStock });
                      const chosen = v.id === variant?.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setChosenId(v.id)}
                          disabled={vOut}
                          aria-pressed={chosen}
                          className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition ${
                            chosen
                              ? "border-brand bg-brand/10 text-brand"
                              : "border-line bg-sunken text-ink-2 hover:border-brand/40 hover:text-ink"
                          } ${vOut ? "cursor-not-allowed opacity-40 line-through" : ""}`}
                        >
                          <bdi>{localized(v, "name", lang)}</bdi>
                          {/* Only worth showing when the options differ in
                              price — otherwise it is the same number twice. */}
                          {v.price != null && (
                            <span className="ms-1.5 text-[11px] text-ink-3 tabular-nums">
                              {num(variantPricing(product, v).price)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {isStockTracked({ stock }) && (
                <p
                  className={`mt-2 text-xs font-semibold ${
                    soldOut
                      ? "text-rose"
                      : (stock ?? 0) <= 5
                        ? "text-copper"
                        : "text-ink-3"
                  }`}
                >
                  {soldOut
                    ? t("stock.outOfStock")
                    : t("stock.inStock", { n: stock ?? 0 })}
                </p>
              )}

              {description.trim() && (
                <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
                  {description.trim()}
                </p>
              )}

              {/* Add to cart */}
              <div className="mt-auto pt-5">
                {qty === 0 ? (
                  <button
                    onClick={() => onAdd(product, variant)}
                    disabled={soldOut}
                    className="h-11 w-full rounded-md bg-brand text-sm font-semibold text-on-brand transition-colors hover:bg-brand-deep active:scale-[0.99] disabled:pointer-events-none disabled:bg-line-strong disabled:text-ink-3"
                  >
                    {soldOut ? t("stock.outOfStock") : t("product.addToCart")}
                  </button>
                ) : (
                  <div className="flex h-11 items-center justify-between rounded-md border border-line-strong bg-sunken px-1.5">
                    <button
                      onClick={() => onRemove(product, variant)}
                      aria-label={t("product.removeOne", { name })}
                      className="flex h-8 w-10 items-center justify-center rounded text-ink-2 transition hover:bg-rose/10 hover:text-rose active:scale-90"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-base font-bold text-ink tabular-nums">
                      {t("product.inCart", { n: qty })}
                    </span>
                    <button
                      onClick={() => onAdd(product, variant)}
                      disabled={atStockLimit}
                      aria-label={t("product.addOne", { name })}
                      className="flex h-8 w-10 items-center justify-center rounded text-ink-2 transition hover:bg-brand/10 hover:text-brand active:scale-90 disabled:pointer-events-none disabled:opacity-30"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detail sections */}
          <div className="space-y-5 border-t border-line px-5 py-5">
            {benefitLines.length > 0 && (
              <Section icon={Sparkles} title={t("product.benefits")}>
                <ul className="space-y-1.5">
                  {benefitLines.map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {ingredientLines.length > 0 && (
              <Section icon={FlaskConical} title={t("product.ingredients")}>
                <p className="whitespace-pre-line">
                  {ingredientLines.join("\n")}
                </p>
              </Section>
            )}

            {usageLines.length > 0 && (
              <Section icon={ClipboardList} title={t("product.howToUse")}>
                {usageLines.length > 1 ? (
                  <ol className="list-decimal space-y-1.5 ps-4 marker:text-ink-3">
                    {usageLines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ol>
                ) : (
                  <p>{usageLines[0]}</p>
                )}
              </Section>
            )}

            {!hasDetails && (
              <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-line-strong bg-sunken/40 px-4 py-5 text-[13px] text-ink-3">
                <Info className="h-4 w-4 shrink-0" />
                {t("product.noDetails")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Magnify viewer — a zoomable/pannable full-screen photo */}
      {zoomOpen && product.image_url && (
        <ImageZoom
          src={product.image_url}
          alt={name}
          onClose={() => setZoomOpen(false)}
        />
      )}
    </div>
  );
}

// ── Full-screen image magnifier ─────────────────────────────────────
// Scroll / pinch to zoom, drag to pan, double-tap to reset, +/− buttons.

function ImageZoom({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null
  );
  // Active pointers, for pinch-to-zoom on touch devices.
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);

  const MIN = 1;
  const MAX = 5;
  const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));

  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  const zoomBy = (factor: number) => {
    setScale((s) => {
      const next = clamp(s * factor);
      if (next === 1) setPos({ x: 0, y: 0 });
      return next;
    });
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale,
      };
    } else if (scale > 1) {
      drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      setScale(
        clamp((dist / pinchStart.current.dist) * pinchStart.current.scale)
      );
      return;
    }
    if (drag.current) {
      setPos({
        x: drag.current.ox + (e.clientX - drag.current.x),
        y: drag.current.oy + (e.clientY - drag.current.y),
      });
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) drag.current = null;
    setScale((s) => {
      if (s <= 1) {
        setPos({ x: 0, y: 0 });
        return 1;
      }
      return s;
    });
  };

  return (
    <div
      className="fade-in fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black/90 touch-none"
      onClick={onClose}
    >
      {/* Controls */}
      <div
        className="absolute end-3 top-3 z-10 flex items-center gap-2"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => zoomBy(1 / 1.4)}
          aria-label={t("product.zoomOut")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <button
          onClick={() => zoomBy(1.4)}
          aria-label={t("product.zoomIn")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <button
          onClick={onClose}
          aria-label={t("product.closeViewer")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-[11px] font-medium text-white/60">
        {t("product.zoomHint")}
      </p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={reset}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        className="max-h-[90vh] max-w-[92vw] touch-none select-none object-contain"
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          transition: drag.current || pinchStart.current
            ? "none"
            : "transform 0.15s ease-out",
          cursor: scale > 1 ? "grab" : "zoom-in",
        }}
      />
    </div>
  );
}
