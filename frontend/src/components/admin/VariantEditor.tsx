"use client";

import { ProductVariant } from "@/types";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";

interface VariantEditorProps {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
  /** The product's own price, shown as the placeholder an option inherits. */
  basePrice: string;
  /** The product's own code, shown in the built-up option code preview. */
  baseCode: string;
}

/** A fresh id. Only has to be unique inside one product. */
function newId(): string {
  return `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * The options a product is sold in — sizes, flavours, shades.
 *
 * Every field except the name is an override: left blank, the option inherits
 * the product's own price, offer and stock. That keeps a same-price set (two
 * flavours) down to two words of typing, while still letting a
 * different-price set (50 ml / 200 ml) say what each one costs.
 */
export default function VariantEditor({
  variants,
  onChange,
  basePrice,
  baseCode,
}: VariantEditorProps) {
  const { t } = useI18n();

  const patch = (id: string, fields: Partial<ProductVariant>) =>
    onChange(variants.map((v) => (v.id === id ? { ...v, ...fields } : v)));

  const removeAt = (id: string) => onChange(variants.filter((v) => v.id !== id));

  const move = (index: number, by: number) => {
    const to = index + by;
    if (to < 0 || to >= variants.length) return;
    const next = [...variants];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  };

  const addOne = () =>
    onChange([...variants, { id: newId(), name: "" }]);

  const inputCls =
    "w-full rounded-md border border-line bg-surface px-2.5 py-2 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand/60 focus:ring-1 focus:ring-brand/30";
  const labelCls = "label-caps mb-1 block text-[10px] text-ink-3";

  /** A number field, or "" for "inherit from the product". */
  const numValue = (n: number | undefined) =>
    typeof n === "number" ? String(n) : "";
  const numPatch = (raw: string): number | undefined => {
    const trimmed = raw.trim();
    if (trimmed === "") return undefined;
    const n = parseFloat(trimmed);
    return Number.isFinite(n) ? n : undefined;
  };

  return (
    <div className="flex flex-col gap-3">
      {variants.length === 0 && (
        <p className="rounded-lg border border-dashed border-line-strong bg-sunken/40 px-4 py-4 text-[12px] leading-relaxed text-ink-3">
          {t("variants.emptyHint")}
        </p>
      )}

      {variants.map((v, i) => (
        <div
          key={v.id}
          className="rounded-lg border border-line bg-sunken/60 p-3"
        >
          {/* Row header — position, reorder, delete */}
          <div className="mb-2.5 flex items-center gap-1.5">
            <span className="label-caps flex h-5 min-w-5 items-center justify-center rounded-sm bg-brand/10 px-1 text-[10px] text-brand tabular-nums">
              {i + 1}
            </span>
            <span className="text-[11px] text-ink-3">
              {/* The code a receipt will actually carry for this option. */}
              {v.code?.trim()
                ? `${baseCode || "CODE"}-${v.code.trim().toUpperCase()}`
                : baseCode || "CODE"}
            </span>
            <div className="ms-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={t("variants.moveUp")}
                className="flex h-7 w-7 items-center justify-center rounded text-ink-3 transition hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-25"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === variants.length - 1}
                aria-label={t("variants.moveDown")}
                className="flex h-7 w-7 items-center justify-center rounded text-ink-3 transition hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-25"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => removeAt(v.id)}
                aria-label={t("variants.removeOption")}
                className="flex h-7 w-7 items-center justify-center rounded text-ink-3 transition hover:bg-rose/10 hover:text-rose"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Names — English drives the shop, Arabic falls back to it. */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={labelCls}>{t("variants.name")}</label>
              <input
                type="text"
                value={v.name}
                onChange={(e) => patch(v.id, { name: e.target.value })}
                placeholder={t("variants.namePlaceholder")}
                dir="ltr"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t("variants.nameAr")}</label>
              <input
                type="text"
                value={v.name_ar ?? ""}
                onChange={(e) => patch(v.id, { name_ar: e.target.value })}
                placeholder={t("variants.nameArPlaceholder")}
                dir="rtl"
                className={inputCls}
              />
            </div>
          </div>

          {/* Overrides — every one of these may be left blank. */}
          <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div>
              <label className={labelCls}>{t("variants.codeSuffix")}</label>
              <input
                type="text"
                value={v.code ?? ""}
                onChange={(e) => patch(v.id, { code: e.target.value })}
                placeholder={t("variants.codePlaceholder")}
                dir="ltr"
                className={`${inputCls} uppercase`}
              />
            </div>
            <div>
              <label className={labelCls}>{t("variants.price")}</label>
              <input
                type="number"
                min={0}
                value={numValue(v.price)}
                onChange={(e) => patch(v.id, { price: numPatch(e.target.value) })}
                placeholder={basePrice.trim() || t("variants.inherits")}
                dir="ltr"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t("variants.oldPrice")}</label>
              <input
                type="number"
                min={0}
                value={numValue(v.old_price)}
                onChange={(e) =>
                  patch(v.id, { old_price: numPatch(e.target.value) })
                }
                placeholder={t("modal.noOffer")}
                dir="ltr"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t("stock.label")}</label>
              <input
                type="number"
                min={0}
                value={numValue(v.stock)}
                onChange={(e) => patch(v.id, { stock: numPatch(e.target.value) })}
                placeholder={t("variants.inherits")}
                dir="ltr"
                className={inputCls}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addOne}
        className="label-caps flex h-10 items-center justify-center gap-1.5 rounded-md border border-dashed border-brand/40 bg-brand/[0.06] text-brand transition hover:bg-brand/15"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("variants.addOption")}
      </button>
    </div>
  );
}
