"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { DeckSlide, DEFAULT_DECK, HomeDeck } from "@/types";
import { fetchHomeDeck, updateHomeDeck, uploadProductImage } from "@/lib/api";
import { Eye, EyeOff, Boxes, Check, RotateCcw, Image as ImageIcon, X } from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";

/** The two editable slides, and which built-in wording each falls back to. */
type SlideKey = "brief" | "offer";

const inputCls =
  "w-full rounded-md border border-line bg-sunken px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand/50 focus:ring-1 focus:ring-brand/25";
const labelCls = "label-caps mb-1.5 block text-ink-3";

/**
 * The home slideshow's own copy.
 *
 * Every field here is optional. Blank means the slide keeps the wording the
 * shop shipped with - in both languages - so this page is somewhere to
 * override the deck rather than somewhere that has to be filled in before the
 * deck works. That is also why the boxes start empty rather than pre-filled
 * with the current English: pre-filling would quietly throw the Arabic away
 * the first time anybody pressed Save.
 */
export default function AdminHomePage() {
  const { t } = useI18n();
  const [deck, setDeck] = useState<HomeDeck>(DEFAULT_DECK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDeck(await fetchHomeDeck());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Change one field of one slide. */
  const set = <K extends SlideKey>(
    key: K,
    patch: Partial<HomeDeck[K]>,
  ) => {
    setSaved(false);
    setDeck((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      setDeck(await updateHomeDeck(deck));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

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
          {t("nav.homeSlides")}
        </h1>
        <p className="mt-1 max-w-lg text-xs text-ink-3">{t("deck.subtitle")}</p>
      </div>

      {error && (
        <div className="rounded-md border border-rose/30 bg-rose/10 p-3 text-xs text-rose">
          {error}
        </div>
      )}

      <p className="rounded-md border border-line bg-sunken/50 px-3.5 py-2.5 text-[11px] text-ink-3">
        {t("deck.blankHint")}
      </p>

      <SlideEditor
        onChange={(patch) => set("brief", patch)}
        onError={setError}
        title={t("deck.brief")}
        hint={t("deck.briefHint")}
        slide={deck.brief}
        placeholders={{
          eyebrow: t("shop.eyebrow"),
          title: `${t("shop.headline1")}\n${t("shop.headline2")}`,
          body: t("shop.lede"),
        }}
        extra={
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-sunken/40 px-3 py-2.5">
            <input
              type="checkbox"
              checked={deck.brief.stats}
              onChange={(e) => set("brief", { stats: e.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
            />
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-ink">
                {t("deck.stats")}
              </span>
              <span className="mt-0.5 block text-[11px] text-ink-3">
                {t("deck.statsHint")}
              </span>
            </span>
          </label>
        }
      />

      {/* Packages are slides too, but they are edited where they are built. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-line px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <Boxes className="h-5 w-5 shrink-0 text-ink-3" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">
              {t("deck.packages")}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-3">
              {t("deck.packagesHint")}
            </p>
          </div>
        </div>
        <Link
          href="/admin/packages"
          className="label-caps shrink-0 rounded-md border border-brand/40 bg-brand/10 px-3 py-2 text-brand transition hover:bg-brand/20"
        >
          {t("nav.packages")}
        </Link>
      </div>

      <SlideEditor
        onChange={(patch) => set("offer", patch)}
        onError={setError}
        title={t("deck.offer")}
        hint={t("deck.offerHint")}
        slide={deck.offer}
        placeholders={{
          eyebrow: t("promo.eyebrow"),
          title: t("promo.title", { n: deck.offer.percent }),
          body: t("promo.body"),
        }}
        extra={
          <div>
            <label className={labelCls}>{t("deck.percent")}</label>
            <input
              type="number"
              min={1}
              max={99}
              value={deck.offer.percent}
              onChange={(e) =>
                set("offer", { percent: parseInt(e.target.value, 10) || 1 })
              }
              dir="ltr"
              className={`${inputCls} max-w-32`}
            />
            <p className="mt-1 text-[11px] text-ink-3">
              {t("deck.percentHint")}
            </p>
          </div>
        }
      />

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
          onClick={() => {
            setDeck(DEFAULT_DECK);
            setSaved(false);
          }}
          disabled={saving}
          title={t("deck.resetHint")}
          className="label-caps flex h-10 items-center gap-1.5 rounded-md border border-line px-4 text-ink-2 transition hover:bg-sunken hover:text-ink disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t("deck.reset")}
        </button>
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

/**
 * One slide's editor - the same six boxes for both.
 *
 * At module scope on purpose. Declared inside the page it would be a new
 * component type on every keystroke, so React would throw the inputs away and
 * build them again, and the caret would jump out of the box being typed in.
 */
function SlideEditor({
  title,
  hint,
  slide,
  placeholders,
  extra,
  onChange,
  onError,
}: {
  title: string;
  hint: string;
  slide: DeckSlide;
  /** The built-in wording, shown greyed so it is clear what blank means. */
  placeholders: { eyebrow: string; title: string; body: string };
  extra?: React.ReactNode;
  onChange: (patch: Partial<DeckSlide>) => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadProductImage(file);
      onChange({ image_url: res.image_url });
    } catch (err) {
      onError(err instanceof Error ? err.message : t("err.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold tracking-tight text-ink">
            {title}
          </h2>
          <p className="mt-0.5 text-[11px] text-ink-3">{hint}</p>
        </div>
        {/* On or off, without having to clear the copy to hide a slide. */}
        <button
          type="button"
          onClick={() => onChange({ enabled: !slide.enabled })}
          className={`label-caps flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 transition ${
            slide.enabled
              ? "bg-brand/12 text-brand hover:bg-brand/20"
              : "bg-sunken text-ink-3 hover:text-ink"
          }`}
        >
          {slide.enabled ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
          {t(slide.enabled ? "deck.shown" : "deck.hiddenSlide")}
        </button>
      </div>

      <div
        className={`space-y-4 p-4 transition-opacity ${
          slide.enabled ? "" : "opacity-50"
        }`}
      >
        {/* Photo. A slide with one is drawn as the picture edge to edge with
            the copy over it; without one it keeps the copy-beside-plates
            layout, so this is a change of shape, not just decoration. */}
        <div>
          <label className={labelCls}>{t("deck.photo")}</label>
          <p className="mb-2 text-[11px] text-ink-3">{t("deck.photoHint")}</p>
          <div className="flex gap-4">
            <div className="relative flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-sunken">
              {slide.image_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.image_url}
                    alt={t("modal.preview")}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onChange({ image_url: "" })}
                    aria-label={t("modal.removePhoto")}
                    className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose text-paper shadow hover:opacity-90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <ImageIcon className="h-6 w-6 text-line-strong" />
              )}
            </div>
            <div className="flex flex-1 flex-col justify-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="label-caps h-9 rounded-md border border-brand/40 bg-brand/10 text-brand transition hover:bg-brand/20 active:scale-[0.98] disabled:opacity-50"
              >
                {uploading ? t("modal.uploading") : t("modal.uploadPhoto")}
              </button>
              <input
                type="file"
                ref={fileRef}
                onChange={pickPhoto}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>
        </div>

        {extra}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{t("deck.eyebrow")}</label>
            <input
              type="text"
              value={slide.eyebrow}
              onChange={(e) => onChange({ eyebrow: e.target.value })}
              placeholder={placeholders.eyebrow}
              dir="ltr"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t("deck.eyebrowAr")}</label>
            <input
              type="text"
              value={slide.eyebrow_ar}
              onChange={(e) => onChange({ eyebrow_ar: e.target.value })}
              dir="rtl"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{t("deck.headline")}</label>
            <textarea
              rows={2}
              value={slide.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder={placeholders.title}
              dir="ltr"
              className={`${inputCls} resize-y`}
            />
          </div>
          <div>
            <label className={labelCls}>{t("deck.headlineAr")}</label>
            <textarea
              rows={2}
              value={slide.title_ar}
              onChange={(e) => onChange({ title_ar: e.target.value })}
              dir="rtl"
              className={`${inputCls} resize-y`}
            />
          </div>
        </div>
        <p className="-mt-2 text-[11px] text-ink-3">{t("deck.headlineHint")}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{t("deck.body")}</label>
            <textarea
              rows={3}
              value={slide.body}
              onChange={(e) => onChange({ body: e.target.value })}
              placeholder={placeholders.body}
              dir="ltr"
              className={`${inputCls} resize-y`}
            />
          </div>
          <div>
            <label className={labelCls}>{t("deck.bodyAr")}</label>
            <textarea
              rows={3}
              value={slide.body_ar}
              onChange={(e) => onChange({ body_ar: e.target.value })}
              dir="rtl"
              className={`${inputCls} resize-y`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
