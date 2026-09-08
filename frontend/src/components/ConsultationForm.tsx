"use client";

import { useState } from "react";
import { Check, Loader2, Stethoscope } from "lucide-react";
import {
  ConsultationCreate,
  EMPTY_CONSULTATION,
  SKIN_CONCERNS,
  SKIN_TYPES,
  SkinConcern,
  SkinType,
  hasConsultationDetails,
} from "@/types";
import { createConsultation } from "@/lib/api";
import { useI18n } from "@/lib/LanguageProvider";
import { MessageKey } from "@/lib/i18n";

// The stored keys carry no words of their own - these map them to copy, in
// whichever language the shopper is reading. Written out rather than built
// from a template so a missing string is a compile error, like every other
// lookup in the dictionary.
const SKIN_TYPE_LABEL: Record<SkinType, MessageKey> = {
  normal: "consult.skinNormal",
  dry: "consult.skinDry",
  oily: "consult.skinOily",
  combination: "consult.skinCombination",
  sensitive: "consult.skinSensitive",
};

const CONCERN_LABEL: Record<SkinConcern, MessageKey> = {
  acne: "consult.concernAcne",
  darkSpots: "consult.concernDarkSpots",
  ageing: "consult.concernAgeing",
  dryness: "consult.concernDryness",
  sensitivity: "consult.concernSensitivity",
  pores: "consult.concernPores",
  sunDamage: "consult.concernSunDamage",
};

const field =
  "h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[14px] text-ink " +
  "placeholder:text-ink-3 transition focus:border-brand focus:outline-none " +
  "focus:ring-2 focus:ring-brand/20";

/**
 * The skincare consultation request on the home screen.
 *
 * The shop's side of this is a phone call, so the form asks for the least
 * that makes one worth making: who to ask for, a number to reach them on, and
 * what their skin is like. Everything else is optional - an enquiry that
 * stalls on a question nobody wanted to answer is an enquiry the shop never
 * gets.
 */
export default function ConsultationForm() {
  const { t } = useI18n();
  const [form, setForm] = useState<ConsultationCreate>(EMPTY_CONSULTATION);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ConsultationCreate>(
    key: K,
    value: ConsultationCreate[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const toggleConcern = (c: SkinConcern) =>
    setForm((f) => ({
      ...f,
      concerns: f.concerns.includes(c)
        ? f.concerns.filter((x) => x !== c)
        : [...f.concerns, c],
    }));

  const ready = hasConsultationDetails(form);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || sending) return;
    setSending(true);
    setError(null);
    try {
      await createConsultation(form);
      setForm(EMPTY_CONSULTATION);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("err.sendConsult"));
    } finally {
      setSending(false);
    }
  };

  // What was sent has been sent. Rather than leave a filled-in form that
  // could be submitted twice, the panel becomes the acknowledgement, with a
  // way back for someone asking on behalf of a second person.
  if (sent) {
    return (
      <section className="rounded-3xl border border-line bg-surface p-6 text-center shadow-[0_20px_50px_-32px_rgba(27,39,51,0.5)] sm:p-10">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/12 text-brand">
          <Check className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {t("consult.sentTitle")}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-2 sm:text-[14px]">
          {t("consult.sentBody")}
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-5 h-10 rounded-full border border-line-strong px-5 text-[13px] font-semibold text-ink transition hover:bg-sunken active:scale-[0.98]"
        >
          {t("consult.sendAnother")}
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-[0_20px_50px_-32px_rgba(27,39,51,0.5)] sm:p-8">
      <span className="label-caps flex items-center gap-1.5 text-brand">
        <Stethoscope className="h-3.5 w-3.5" />
        {t("consult.eyebrow")}
      </span>
      <h2 className="mt-2 font-display text-[22px] font-semibold leading-tight tracking-tight text-ink sm:text-3xl">
        {t("consult.title")}
      </h2>
      <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-2 sm:text-[14px]">
        {t("consult.body")}
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label-caps text-ink-3">
              {t("consult.name")} *
            </span>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={t("consult.namePlaceholder")}
              autoComplete="name"
              required
              className={`mt-1.5 ${field}`}
            />
          </label>

          <label className="block">
            <span className="label-caps text-ink-3">
              {t("consult.phone")} *
            </span>
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder={t("consult.phonePlaceholder")}
              // A number pad rather than a keyboard, and never spell-checked.
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              required
              className={`mt-1.5 text-start ${field}`}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label-caps text-ink-3">{t("consult.age")}</span>
            <input
              value={form.age}
              onChange={(e) => set("age", e.target.value)}
              placeholder={t("consult.agePlaceholder")}
              inputMode="numeric"
              className={`mt-1.5 ${field}`}
            />
          </label>
        </div>

        <fieldset>
          <legend className="label-caps text-ink-3">
            {t("consult.skinType")} *
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SKIN_TYPES.map((id) => {
              const on = form.skin_type === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => set("skin_type", id)}
                  aria-pressed={on}
                  className={`h-9 rounded-full border px-4 text-[13px] font-medium transition active:scale-[0.97] ${
                    on
                      ? "border-brand bg-brand text-on-brand"
                      : "border-line-strong bg-surface text-ink-2 hover:border-brand/50 hover:text-brand"
                  }`}
                >
                  {t(SKIN_TYPE_LABEL[id])}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label-caps text-ink-3">
            {t("consult.concerns")}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SKIN_CONCERNS.map((id) => {
              const on = form.concerns.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleConcern(id)}
                  aria-pressed={on}
                  className={`h-9 rounded-full border px-4 text-[13px] font-medium transition active:scale-[0.97] ${
                    on
                      ? "border-brand bg-brand/12 text-brand"
                      : "border-line-strong bg-surface text-ink-2 hover:border-brand/50 hover:text-brand"
                  }`}
                >
                  {t(CONCERN_LABEL[id])}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="block">
          <span className="label-caps text-ink-3">{t("consult.notes")}</span>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder={t("consult.notesPlaceholder")}
            rows={3}
            className="mt-1.5 w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-ink placeholder:text-ink-3 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-rose/30 bg-rose/10 px-3.5 py-2.5 text-[13px] text-rose"
          >
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={!ready || sending}
            className="flex h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-on-brand transition hover:bg-brand-deep active:scale-[0.98] disabled:pointer-events-none disabled:bg-line-strong disabled:text-ink-3 sm:h-12 sm:px-7"
          >
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            {sending ? t("consult.sending") : t("consult.submit")}
          </button>
          {/* Says what is still missing, rather than leaving a dead button. */}
          {!ready && (
            <p className="text-[12px] text-ink-3">{t("consult.required")}</p>
          )}
        </div>
      </form>
    </section>
  );
}
