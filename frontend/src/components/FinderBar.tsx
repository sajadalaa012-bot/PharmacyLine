"use client";

// The one place the catalogue is narrowed down.
//
// Search and filters used to be three separate things: a field at the top, a
// row of removable chips, and a Browse page you left the grid to visit. This
// is all of it in one band that sits directly above the products, so every
// change shows in the grid underneath as you make it and nothing takes you off
// the page.
//
// What is out in the open is what gets used daily: search, offers, and the
// categories, each carrying its own count. The long list of brands and the
// price range fold into a panel that opens in place, because a shopper does
// not want thirty-one brand chips between them and the products.

import { useId } from "react";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";
import { num } from "@/lib/format";

export interface FilterOption {
  id: number | "all";
  name: string;
  count: number;
}

/** One chip. The count is the point: it says whether tapping is worth it. */
function Chip({
  label,
  count,
  on,
  onClick,
}: {
  label: string;
  count?: number;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition active:scale-95 ${
        on
          ? "border-brand bg-brand text-white"
          : "border-line-strong bg-surface text-ink hover:border-brand hover:text-brand"
      }`}
    >
      <bdi>{label}</bdi>
      {count !== undefined && (
        <span
          className={`text-[11px] tabular-nums ${on ? "text-white/70" : "text-ink-3"}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** A single scrolling line of chips. Never wrapped: one dimension, one row. */
function ChipRow({
  options,
  active,
  onPick,
}: {
  options: FilterOption[];
  active: number | "all";
  onPick: (id: number | "all") => void;
}) {
  return (
    // pb-1 leaves room for the focus ring, which overflow would otherwise clip.
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {options.map((opt) => (
        <Chip
          key={String(opt.id)}
          label={opt.name}
          count={opt.count}
          on={active === opt.id}
          onClick={() => onPick(opt.id)}
        />
      ))}
    </div>
  );
}

interface FinderBarProps {
  query: string;
  onQuery: (value: string) => void;
  searchRef?: React.Ref<HTMLInputElement>;

  categories: FilterOption[];
  brands: FilterOption[];
  activeCategory: number | "all";
  activeBrand: number | "all";
  onPickCategory: (id: number | "all") => void;
  onPickBrand: (id: number | "all") => void;

  hasOffers: boolean;
  offersOnly: boolean;
  onToggleOffers: () => void;

  minPrice: string;
  maxPrice: string;
  onMinPrice: (value: string) => void;
  onMaxPrice: (value: string) => void;
  priceBounds: { min: number; max: number };

  /** How many products the grid below is showing right now. */
  resultCount: number;
  filtersOn: number;
  onClearAll: () => void;

  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FinderBar({
  query,
  onQuery,
  searchRef,
  categories,
  brands,
  activeCategory,
  activeBrand,
  onPickCategory,
  onPickBrand,
  hasOffers,
  offersOnly,
  onToggleOffers,
  minPrice,
  maxPrice,
  onMinPrice,
  onMaxPrice,
  priceBounds,
  resultCount,
  filtersOn,
  onClearAll,
  open,
  onOpenChange,
}: FinderBarProps) {
  const { t } = useI18n();
  const panelId = useId();

  const priceActive = minPrice.trim() !== "" || maxPrice.trim() !== "";
  const clearPrice = () => {
    onMinPrice("");
    onMaxPrice("");
  };

  const priceInput =
    "h-9 w-24 rounded-full border border-line bg-surface px-3.5 text-sm text-ink outline-none transition [appearance:textfield] placeholder:text-ink-3 focus:border-brand/50 focus:ring-2 focus:ring-brand/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  return (
    // Sticky on a phone so the filters stay within reach however far the grid
    // is scrolled. The desktop header is already sticky and would collide, so
    // there the band travels with the page.
    <div className="sticky top-0 z-30 -mx-4 bg-paper/95 px-4 pb-3 pt-3 backdrop-blur-md sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pt-0 sm:backdrop-blur-none">
      {/* Search - phone only; the desktop has the same field in its header. */}
      <div className="relative sm:hidden">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={t("shop.searchPlaceholder")}
          aria-label={t("shop.searchAria")}
          className="h-11 w-full rounded-full border border-line bg-surface ps-10 pe-9 text-sm text-ink
                     outline-none transition placeholder:text-ink-3
                     focus:border-brand/50 focus:ring-2 focus:ring-brand/15
                     [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <button
            onClick={() => onQuery("")}
            aria-label={t("common.clearSearch")}
            className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-3 transition hover:bg-sunken hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* The rail. Everyday filters out in the open, in one scrolling line. */}
      <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-1 sm:mt-0">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          aria-controls={panelId}
          className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition active:scale-95 ${
            open || filtersOn > 0
              ? "border-brand text-brand"
              : "border-line-strong bg-surface text-ink hover:border-brand hover:text-brand"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {t("finder.filters")}
          {filtersOn > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold tabular-nums text-on-brand">
              {filtersOn}
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* A hairline between the panel's handle and the filters themselves. */}
        <span className="h-5 w-px shrink-0 bg-line-strong" aria-hidden />

        {hasOffers && (
          <button
            type="button"
            onClick={onToggleOffers}
            aria-pressed={offersOnly}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition active:scale-95 ${
              offersOnly
                ? "border-rose bg-rose text-paper"
                : "border-rose/40 bg-surface text-rose hover:border-rose"
            }`}
          >
            {t("promo.onOffer")}
          </button>
        )}

        {categories.map((opt) => (
          <Chip
            key={String(opt.id)}
            label={opt.name}
            count={opt.count}
            on={activeCategory === opt.id}
            onClick={() => onPickCategory(opt.id)}
          />
        ))}
      </div>

      {/* The panel: the long list and the range, opened in place. */}
      <div className="reveal" data-open={open} id={panelId}>
        {/* inert while shut: a collapsed panel is still in the DOM, and without
            this you could tab into controls nobody can see. */}
        <div inert={!open}>
          <div className="mt-2 space-y-4 rounded-2xl border border-line bg-surface/70 p-4">
            <div>
              <p className="label-caps mb-2.5 text-ink-3">{t("browse.brand")}</p>
              <ChipRow
                options={brands}
                active={activeBrand}
                onPick={onPickBrand}
              />
            </div>

            <div>
              <p className="label-caps mb-2.5 text-ink-3">{t("shop.price")}</p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={minPrice}
                  onChange={(e) => onMinPrice(e.target.value)}
                  placeholder={
                    Number.isFinite(priceBounds.min)
                      ? t("shop.minWith", { n: num(priceBounds.min) })
                      : t("shop.min")
                  }
                  aria-label={t("shop.minAria")}
                  className={priceInput}
                />
                <span className="text-ink-3">–</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={maxPrice}
                  onChange={(e) => onMaxPrice(e.target.value)}
                  placeholder={
                    priceBounds.max > 0
                      ? t("shop.maxWith", { n: num(priceBounds.max) })
                      : t("shop.max")
                  }
                  aria-label={t("shop.maxAria")}
                  className={priceInput}
                />
                <span className="text-xs text-ink-3">{t("common.currency")}</span>
                {priceActive && (
                  <button
                    onClick={clearPrice}
                    className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-2 transition hover:border-brand/40 hover:text-brand"
                  >
                    <X className="h-3 w-3" />
                    {t("common.clear")}
                  </button>
                )}
              </div>
            </div>

            {/* What the panel currently adds up to. It closes rather than
                navigates: the results are already behind it. */}
            <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
              <button
                onClick={onClearAll}
                disabled={filtersOn === 0 && !priceActive && !query}
                className="text-xs font-semibold text-brand transition active:scale-95 disabled:text-ink-3"
              >
                {t("browse.clearAll")}
              </button>
              <button
                onClick={() => onOpenChange(false)}
                className="flex h-9 items-center rounded-full bg-brand px-5 text-[13px] font-semibold text-on-brand transition hover:bg-brand-deep active:scale-95"
              >
                {resultCount === 1
                  ? t("browse.showResultsOne")
                  : t("browse.showResults", { n: resultCount })}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
