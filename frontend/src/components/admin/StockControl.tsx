"use client";

import { useEffect, useRef, useState } from "react";
import { Product, isOutOfStock, isStockTracked } from "@/types";
import { Package, Minus, Plus, Check, X } from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";

interface StockControlProps {
  product: Product;
  /** `undefined` turns tracking off again. */
  onSave: (stock: number | undefined) => Promise<void>;
}

/**
 * The stock chip in the admin product list. Shows the count at a glance and
 * opens a stepper to change it — the common case is nudging by one after a
 * delivery or a shelf count, so +/- is the primary control and typing an exact
 * figure is there when a full recount is needed.
 */
export default function StockControl({ product, onSave }: StockControlProps) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const tracked = isStockTracked(product);
  const out = isOutOfStock(product);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const openEditor = () => {
    setDraft(tracked ? String(product.stock) : "0");
    setError(false);
    setOpen(true);
  };

  const step = (by: number) => {
    const current = parseInt(draft, 10);
    setDraft(String(Math.max(0, (Number.isFinite(current) ? current : 0) + by)));
  };

  const commit = async (value: number | undefined) => {
    setSaving(true);
    setError(false);
    try {
      await onSave(value);
      setOpen(false);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    const parsed = parseInt(draft, 10);
    commit(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
  };

  // Colour carries the state: red at zero, amber when it is nearly gone.
  const chipTone = !tracked
    ? "border-line text-ink-3 hover:border-brand/40 hover:text-brand"
    : out
      ? "border-rose/40 bg-rose/10 text-rose"
      : (product.stock ?? 0) <= 5
        ? "border-copper/40 bg-copper/10 text-copper"
        : "border-brand/30 bg-brand/10 text-brand";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={openEditor}
        title={t("stock.edit", { name: product.name })}
        aria-label={t("stock.edit", { name: product.name })}
        className={`flex h-8 min-w-14 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-bold tabular-nums transition ${chipTone}`}
      >
        <Package className="h-3.5 w-3.5 shrink-0" />
        {tracked ? product.stock : "—"}
      </button>

      {open && (
        <div
          className={`pop absolute z-50 mt-1.5 w-56 rounded-md border border-line bg-surface p-3 shadow-[0_18px_44px_-16px_rgba(0,0,0,0.35)] ${
            lang === "ar" ? "start-0" : "end-0"
          }`}
        >
          <p className="label-caps mb-2 text-ink-3">{t("stock.label")}</p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={saving}
              aria-label={t("stock.decrease")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line text-ink-2 transition hover:border-rose/40 hover:text-rose active:scale-90 disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              min={0}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
              }}
              autoFocus
              dir="ltr"
              aria-label={t("stock.label")}
              className="h-9 w-full rounded-md border border-line bg-sunken px-2 text-center text-sm font-bold text-ink tabular-nums outline-none transition focus:border-brand/50 focus:ring-1 focus:ring-brand/25"
            />
            <button
              type="button"
              onClick={() => step(1)}
              disabled={saving}
              aria-label={t("stock.increase")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line text-ink-2 transition hover:border-brand/40 hover:text-brand active:scale-90 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <p className="mt-2 text-[11px] text-rose">{t("stock.saveFailed")}</p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="label-caps flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-brand text-on-brand transition hover:bg-brand-deep disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              {saving ? t("common.saving") : t("common.save")}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={saving}
              aria-label={t("common.cancel")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line text-ink-3 transition hover:bg-sunken hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Escape hatch back to "not tracked" for products you don't count. */}
          {tracked ? (
            <button
              type="button"
              onClick={() => commit(undefined)}
              disabled={saving}
              className="mt-2 w-full rounded-md px-2 py-1 text-[11px] text-ink-3 transition hover:bg-sunken hover:text-ink"
            >
              {t("stock.stopTracking")}
            </button>
          ) : (
            <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
              {t("stock.untrackedHint")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
