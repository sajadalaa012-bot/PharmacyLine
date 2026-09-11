"use client";

// The prize wheel, as the shop sets it up.
//
// Two lists and a test box:
//
//   Prizes        everything that can be won, with how likely each one is.
//   Price ranges  what an order of a given size is playing for. Each range
//                 ticks the prizes that belong to it, so a 10,000 order and a
//                 100,000 one turn different wheels.
//   Try a total   type any total and see exactly which range it lands in and
//                 what it could win, without placing an order to find out.
//
// The customer spins once, on the screen that confirms their order, and the
// result is written onto the order - so the Orders page shows what each one
// won and the shop knows what to put in the box.

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DEFAULT_WHEEL,
  Product,
  WheelConfig,
  WheelPrize,
  WheelTier,
  prizeOdds,
  tierFor,
  wheelPrizesFor,
} from "@/types";
import { fetchProducts, fetchWheel, updateWheel } from "@/lib/api";
import { money } from "@/lib/format";
import { Check, Eye, EyeOff, Gift, Plus, Store, Trash2 } from "lucide-react";
import Dropdown from "@/components/Dropdown";
import PhotoPicker from "@/components/admin/PhotoPicker";
import { useI18n } from "@/lib/LanguageProvider";
import { localized } from "@/lib/i18n";

const inputCls =
  "w-full rounded-md border border-line bg-sunken px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand/50 focus:ring-1 focus:ring-brand/25";
const labelCls = "label-caps mb-1.5 block text-ink-3";

/** Ids only have to be unique inside one wheel and survive being saved. */
function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}${rand}`;
}

/** An empty box reads back as 0 from a number input, which is a real bound.
 *  These keep "" typeable while the shop is editing. */
const numOrEmpty = (v: number | null) => (v == null ? "" : String(v));
const parseBound = (v: string): number | null => {
  const trimmed = v.trim();
  if (trimmed === "") return null;
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) ? Math.max(0, n) : null;
};

export default function AdminWheelPage() {
  const { t, lang } = useI18n();
  const [wheel, setWheel] = useState<WheelConfig>(DEFAULT_WHEEL);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tryTotal, setTryTotal] = useState("");

  const load = useCallback(async () => {
    try {
      setWheel(await fetchWheel());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // The catalogue, to pick prizes off. Loaded on its own and allowed to fail
  // quietly: it is a shortcut for filling a prize in, and the wheel is still
  // entirely editable by hand without it.
  useEffect(() => {
    let alive = true;
    fetchProducts()
      .then((cats) => {
        if (alive) setProducts(cats.flatMap((cat) => cat.products));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const edit = (patch: Partial<WheelConfig>) => {
    setSaved(false);
    setWheel((prev) => ({ ...prev, ...patch }));
  };

  const setPrize = (id: string, patch: Partial<WheelPrize>) =>
    edit({
      prizes: wheel.prizes.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });

  const addPrize = () =>
    edit({
      prizes: [
        ...wheel.prizes,
        { id: newId("p"), name: "", name_ar: "", weight: 1 },
      ],
    });

  /**
   * A prize taken off the shelf: its name, both languages of it, and its
   * photograph, copied onto the wheel.
   *
   * Copied rather than looked up later, like every other snapshot here. A
   * prize that has been won is a promise about a particular bottle with a
   * particular picture, and re-pricing or re-photographing that bottle - or
   * deleting it - must not quietly change what is on the wheel. The id is
   * kept only so the editor knows this one is already on it.
   */
  const addProductPrize = (value: string) => {
    const product = products.find((p) => String(p.id) === value);
    if (!product) return;
    edit({
      prizes: [
        ...wheel.prizes,
        {
          id: newId("p"),
          name: product.name,
          name_ar: product.name_ar ?? "",
          image_url: product.image_url || undefined,
          product_id: product.id,
          weight: 1,
        },
      ],
    });
  };

  /** Removing a prize takes it off every range too: a range pointing at a
   *  prize that no longer exists would be a wedge nobody can win. */
  const removePrize = (id: string) =>
    edit({
      prizes: wheel.prizes.filter((p) => p.id !== id),
      tiers: wheel.tiers.map((tier) => ({
        ...tier,
        prize_ids: tier.prize_ids.filter((pid) => pid !== id),
      })),
    });

  const setTier = (id: string, patch: Partial<WheelTier>) =>
    edit({
      tiers: wheel.tiers.map((tier) =>
        tier.id === id ? { ...tier, ...patch } : tier,
      ),
    });

  const addTier = () => {
    // Start where the last range left off, which is nearly always what the
    // next one wants: ranges are written from the cheapest basket upwards.
    const last = wheel.tiers[wheel.tiers.length - 1];
    const min = last ? (last.max_total ?? last.min_total) + 1 : 0;
    edit({
      tiers: [
        ...wheel.tiers,
        { id: newId("t"), min_total: min, max_total: null, prize_ids: [] },
      ],
    });
  };

  const removeTier = (id: string) =>
    edit({ tiers: wheel.tiers.filter((tier) => tier.id !== id) });

  const togglePrizeInTier = (tier: WheelTier, prizeId: string) =>
    setTier(tier.id, {
      prize_ids: tier.prize_ids.includes(prizeId)
        ? tier.prize_ids.filter((id) => id !== prizeId)
        : [...tier.prize_ids, prizeId],
    });

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      setWheel(await updateWheel(wheel));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  /** What an order of the typed total would actually meet. */
  const trial = useMemo(() => {
    const total = parseBound(tryTotal);
    if (total == null) return null;
    return {
      total,
      tier: tierFor(wheel, total),
      // Deliberately the same function the server draws from, so what this
      // shows and what a customer gets cannot drift apart.
      prizes: wheelPrizesFor({ ...wheel, enabled: true }, total),
    };
  }, [tryTotal, wheel]);

  /** What is left to pick: a product already on the wheel is not offered
   *  again, because two wedges for the same bottle cannot be told apart. */
  const productOptions = useMemo(() => {
    const taken = new Set(
      wheel.prizes.map((p) => p.product_id).filter((id) => id != null),
    );
    return products
      .filter((p) => !taken.has(p.id))
      .map((p) => ({
        value: String(p.id),
        label: localized(p, "name", lang),
        meta: p.code,
        keywords: `${p.name} ${p.name_ar ?? ""} ${p.code}`,
        image: p.image_url || undefined,
      }));
  }, [products, wheel.prizes, lang]);

  const nameOf = (prize: WheelPrize) =>
    (lang === "ar" ? prize.name_ar?.trim() || prize.name : prize.name) ||
    t("wheel.untitled");

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-7">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          {t("nav.wheel")}
        </h1>
        <p className="mt-1 max-w-lg text-xs leading-relaxed text-ink-3">
          {t("wheel.lede")}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-rose/30 bg-rose/10 p-3 text-xs text-rose">
          {error}
        </div>
      )}

      {/* On or off, without having to clear anything to stop the promotion. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink">
            {t("wheel.enabled")}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-3">
            {t("wheel.enabledHint")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => edit({ enabled: !wheel.enabled })}
          className={`label-caps flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 transition ${
            wheel.enabled
              ? "bg-brand/12 text-brand hover:bg-brand/20"
              : "bg-sunken text-ink-3 hover:text-ink"
          }`}
        >
          {wheel.enabled ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
          {t(wheel.enabled ? "wheel.on" : "wheel.off")}
        </button>
      </div>

      {/* ── Prizes ──────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5">
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold tracking-tight text-ink">
              {t("wheel.prizes")}
            </h2>
            <p className="mt-0.5 text-[11px] text-ink-3">
              {t("wheel.prizesHint")}
            </p>
          </div>
          {/* Two ways to put a prize on the wheel: off the shelf, which
              fills in the name and brings the photograph with it, or empty,
              for the prizes that are not things - free delivery, a discount. */}
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {products.length > 0 && (
              <Dropdown
                value=""
                options={productOptions}
                onChange={addProductPrize}
                ariaLabel={t("wheel.pickProduct")}
                placeholder={t("wheel.pickProduct")}
                className="min-w-0 flex-1 sm:w-64 sm:flex-none"
                searchable
              />
            )}
            <button
              type="button"
              onClick={addPrize}
              className="label-caps flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-brand/40 bg-brand/10 px-3.5 text-brand transition hover:bg-brand/20"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("wheel.addPrize")}
            </button>
          </div>
        </div>

        <div className="space-y-3 p-4">
          {wheel.prizes.length === 0 && (
            <p className="rounded-md border border-dashed border-line px-3.5 py-6 text-center text-xs text-ink-3">
              {t("wheel.noPrizes")}
            </p>
          )}

          {products.length > 0 && productOptions.length === 0 && (
            <p className="text-[11px] text-ink-3">{t("wheel.allPicked")}</p>
          )}

          {wheel.prizes.map((prize) => (
            <div
              key={prize.id}
              className="rounded-lg border border-line bg-sunken/40 p-3.5"
            >
              <div className="flex flex-wrap gap-4 sm:flex-nowrap">
                <div className="w-28 shrink-0">
                  <PhotoPicker
                    label={t("wheel.photo")}
                    value={prize.image_url ?? ""}
                    onChange={(image_url) => setPrize(prize.id, { image_url })}
                    onError={setError}
                    shape="wide"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>
                        {t("wheel.name")}
                        {prize.product_id != null && (
                          <span className="ms-2 inline-flex items-center gap-1 rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-brand">
                            <Store className="h-3 w-3" />
                            {t("wheel.fromShop")}
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={prize.name}
                        onChange={(e) =>
                          setPrize(prize.id, { name: e.target.value })
                        }
                        placeholder={t("wheel.namePlaceholder")}
                        dir="ltr"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>{t("wheel.nameAr")}</label>
                      <input
                        type="text"
                        value={prize.name_ar ?? ""}
                        onChange={(e) =>
                          setPrize(prize.id, { name_ar: e.target.value })
                        }
                        dir="rtl"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <label className={labelCls}>{t("wheel.chance")}</label>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={prize.weight}
                        onChange={(e) =>
                          setPrize(prize.id, {
                            weight: Math.max(
                              0,
                              parseInt(e.target.value, 10) || 0,
                            ),
                          })
                        }
                        dir="ltr"
                        className={`${inputCls} w-28`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removePrize(prize.id)}
                      className="flex h-9 items-center gap-1.5 rounded-md border border-rose/35 px-3 text-[13px] font-semibold text-rose transition hover:bg-rose/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("common.delete")}
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-3">{t("wheel.chanceHint")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Price ranges ────────────────────────────────────────────── */}
      <section className="rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5">
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold tracking-tight text-ink">
              {t("wheel.ranges")}
            </h2>
            <p className="mt-0.5 text-[11px] text-ink-3">
              {t("wheel.rangesHint")}
            </p>
          </div>
          <button
            type="button"
            onClick={addTier}
            disabled={wheel.prizes.length === 0}
            className="label-caps flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-brand/40 bg-brand/10 px-3.5 text-brand transition hover:bg-brand/20 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("wheel.addRange")}
          </button>
        </div>

        <div className="space-y-3 p-4">
          {wheel.tiers.length === 0 && (
            <p className="rounded-md border border-dashed border-line px-3.5 py-6 text-center text-xs text-ink-3">
              {t(wheel.prizes.length === 0 ? "wheel.prizesFirst" : "wheel.noRanges")}
            </p>
          )}

          {wheel.tiers.map((tier) => {
            const chosen = wheel.prizes.filter((p) =>
              tier.prize_ids.includes(p.id),
            );
            return (
              <div
                key={tier.id}
                className="rounded-lg border border-line bg-sunken/40 p-3.5"
              >
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className={labelCls}>{t("wheel.from")}</label>
                    <input
                      type="number"
                      min={0}
                      value={tier.min_total}
                      onChange={(e) =>
                        setTier(tier.id, {
                          min_total: parseBound(e.target.value) ?? 0,
                        })
                      }
                      dir="ltr"
                      className={`${inputCls} w-36`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t("wheel.to")}</label>
                    <input
                      type="number"
                      min={0}
                      value={numOrEmpty(tier.max_total)}
                      onChange={(e) =>
                        setTier(tier.id, { max_total: parseBound(e.target.value) })
                      }
                      placeholder={t("wheel.noCeiling")}
                      dir="ltr"
                      className={`${inputCls} w-36`}
                    />
                  </div>
                  <span className="pb-2.5 text-[11px] text-ink-3">
                    {t("common.currency")}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeTier(tier.id)}
                    className="ms-auto flex h-9 items-center gap-1.5 rounded-md border border-rose/35 px-3 text-[13px] font-semibold text-rose transition hover:bg-rose/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("common.delete")}
                  </button>
                </div>

                {tier.max_total != null && tier.max_total < tier.min_total && (
                  <p className="mt-2 text-[11px] font-semibold text-rose">
                    {t("wheel.badRange")}
                  </p>
                )}

                <p className="label-caps mb-2 mt-3.5 text-ink-3">
                  {t("wheel.rangeWins")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {wheel.prizes.map((prize) => {
                    const on = tier.prize_ids.includes(prize.id);
                    return (
                      <button
                        key={prize.id}
                        type="button"
                        onClick={() => togglePrizeInTier(tier, prize.id)}
                        aria-pressed={on}
                        className={`flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition active:scale-95 ${
                          on
                            ? "border-brand bg-brand text-on-brand"
                            : "border-line-strong bg-surface text-ink hover:border-brand hover:text-brand"
                        }`}
                      >
                        {prize.image_url && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={prize.image_url}
                            alt=""
                            className="-ms-2 h-6 w-6 rounded-full border border-paper/40 bg-surface object-cover"
                          />
                        )}
                        <bdi>{nameOf(prize)}</bdi>
                        {on && (
                          <span className="text-[11px] tabular-nums opacity-75">
                            {prizeOdds(chosen, prize)}%
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {chosen.length === 0 && (
                  <p className="mt-2 text-[11px] text-ink-3">
                    {t("wheel.rangeEmpty")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Try a total ─────────────────────────────────────────────── */}
      <section className="rounded-lg border border-line bg-surface">
        <div className="border-b border-line px-4 py-3.5">
          <h2 className="font-display text-base font-semibold tracking-tight text-ink">
            {t("wheel.try")}
          </h2>
          <p className="mt-0.5 text-[11px] text-ink-3">{t("wheel.tryHint")}</p>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className={labelCls}>{t("wheel.tryTotal")}</label>
              <input
                type="number"
                min={0}
                value={tryTotal}
                onChange={(e) => setTryTotal(e.target.value)}
                placeholder="25000"
                dir="ltr"
                className={`${inputCls} w-40`}
              />
            </div>
            <span className="pb-2.5 text-[11px] text-ink-3">
              {t("common.currency")}
            </span>
          </div>

          {trial && (
            <div className="rounded-md border border-line bg-sunken/50 p-3.5">
              {trial.tier ? (
                <>
                  <p className="text-[13px] font-semibold text-ink">
                    {trial.tier.max_total == null
                      ? t("wheel.tryRangeOpen", {
                          from: money(trial.tier.min_total),
                        })
                      : t("wheel.tryRange", {
                          from: money(trial.tier.min_total),
                          to: money(trial.tier.max_total),
                        })}
                  </p>
                  {trial.prizes.length === 0 ? (
                    <p className="mt-1.5 text-xs text-ink-3">
                      {t("wheel.rangeEmpty")}
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {trial.prizes.map((prize) => (
                        <li
                          key={prize.id}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="flex min-w-0 items-center gap-1.5 text-ink-2">
                            {prize.image_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={prize.image_url}
                                alt=""
                                className="h-6 w-6 shrink-0 rounded border border-line bg-surface object-cover"
                              />
                            ) : (
                              <Gift className="h-3.5 w-3.5 shrink-0 text-brand" />
                            )}
                            <bdi className="truncate">{nameOf(prize)}</bdi>
                          </span>
                          <span className="shrink-0 font-semibold text-ink tabular-nums">
                            {prizeOdds(trial.prizes, prize)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!wheel.enabled && (
                    <p className="mt-2.5 text-[11px] font-semibold text-copper">
                      {t("wheel.tryWhileOff")}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-ink-3">{t("wheel.tryNoRange")}</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Save bar */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-line bg-paper/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        {saved && (
          <span className="label-caps flex items-center gap-1.5 text-brand">
            <Check className="h-3.5 w-3.5" />
            {t("deck.saved")}
          </span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="label-caps h-10 rounded-md bg-brand px-6 text-on-brand transition hover:bg-brand-deep active:scale-[0.98] disabled:opacity-40"
        >
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </div>
  );
}
