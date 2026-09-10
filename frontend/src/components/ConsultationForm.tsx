"use client";

import { useRef, useState } from "react";
import { Check, Camera, Loader2, Stethoscope, X } from "lucide-react";
import {
  CALL_TIMES,
  CallTime,
  CONTACT_METHODS,
  ConsultationCreate,
  ContactMethod,
  EMPTY_CONSULTATION,
  GENDERS,
  Gender,
  SKIN_CONCERNS,
  SKIN_TYPES,
  SkinConcern,
  SkinType,
  hasConsultationDetails,
} from "@/types";
import { createConsultation, uploadProductImage } from "@/lib/api";
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

const GENDER_LABEL: Record<Gender, MessageKey> = {
  female: "consult.genderFemale",
  male: "consult.genderMale",
};

const CONTACT_LABEL: Record<ContactMethod, MessageKey> = {
  phone: "consult.contactPhone",
  whatsapp: "consult.contactWhatsapp",
  telegram: "consult.contactTelegram",
};

const TIME_LABEL: Record<CallTime, MessageKey> = {
  morning: "consult.timeMorning",
  afternoon: "consult.timeAfternoon",
  evening: "consult.timeEvening",
};

const field =
  "h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[14px] text-ink " +
  "placeholder:text-ink-3 transition focus:border-brand focus:outline-none " +
  "focus:ring-2 focus:ring-brand/20";

/** One row of choose-one chips. Pressing the chosen one again clears it:
 *  every one of these is optional, and a question answered by accident has
 *  to be un-answerable. */
function ChipRow<T extends string>({
  legend,
  options,
  value,
  onChange,
  label,
}: {
  legend: string;
  options: readonly T[];
  value: T | "";
  onChange: (v: T | "") => void;
  label: (v: T) => string;
}) {
  return (
    <fieldset>
      <legend className="label-caps text-ink-3">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((id) => {
          const on = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(on ? "" : id)}
              aria-pressed={on}
              className={`h-9 rounded-full border px-4 text-[13px] font-medium transition active:scale-[0.97] ${
                on
                  ? "border-brand bg-brand/12 text-brand"
                  : "border-line-strong bg-surface text-ink-2 hover:border-brand/50 hover:text-brand"
              }`}
            >
              {label(id)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

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
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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

  // The photograph goes through the same shrink every uploaded picture here
  // does: a phone camera file is several megabytes, which would be refused on
  // the way in and crawl on the way back out to the shop.
  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadProductImage(file);
      set("photo_url", res.image_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("err.uploadFailed"));
    } finally {
      setUploading(false);
      // Let the same file be chosen again after a failure or a removal.
      e.target.value = "";
    }
  };

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

          <label className="block">
            <span className="label-caps text-ink-3">{t("consult.city")}</span>
            <input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder={t("consult.cityPlaceholder")}
              autoComplete="address-level2"
              className={`mt-1.5 ${field}`}
            />
          </label>
        </div>

        <ChipRow
          legend={t("consult.gender")}
          options={GENDERS}
          value={form.gender}
          onChange={(v) => set("gender", v)}
          label={(id) => t(GENDER_LABEL[id])}
        />

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
          <span className="label-caps text-ink-3">{t("consult.routine")}</span>
          <textarea
            value={form.routine}
            onChange={(e) => set("routine", e.target.value)}
            placeholder={t("consult.routinePlaceholder")}
            rows={2}
            className="mt-1.5 w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-ink placeholder:text-ink-3 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <label className="block">
          <span className="label-caps text-ink-3">
            {t("consult.allergies")}
          </span>
          <textarea
            value={form.allergies}
            onChange={(e) => set("allergies", e.target.value)}
            placeholder={t("consult.allergiesPlaceholder")}
            rows={2}
            className="mt-1.5 w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-ink placeholder:text-ink-3 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label-caps text-ink-3">{t("consult.budget")}</span>
            <input
              value={form.budget}
              onChange={(e) => set("budget", e.target.value)}
              placeholder={t("consult.budgetPlaceholder")}
              inputMode="numeric"
              className={`mt-1.5 ${field}`}
            />
          </label>
        </div>

        <ChipRow
          legend={t("consult.contactMethod")}
          options={CONTACT_METHODS}
          value={form.contact_method}
          onChange={(v) => set("contact_method", v)}
          label={(id) => t(CONTACT_LABEL[id])}
        />

        <ChipRow
          legend={t("consult.bestTime")}
          options={CALL_TIMES}
          value={form.best_time}
          onChange={(v) => set("best_time", v)}
          label={(id) => t(TIME_LABEL[id])}
        />

        {/* The photograph. Blank is the normal state and stays that way
            unless somebody chooses one: a slot that looks like an empty
            requirement would stop a form that is otherwise finished. */}
        <div>
          <span className="label-caps text-ink-3">{t("consult.photo")}</span>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
            {t("consult.photoHint")}
          </p>

          {form.photo_url ? (
            <div className="relative mt-2 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.photo_url}
                alt=""
                className="h-32 w-32 rounded-xl border border-line object-cover"
              />
              <button
                type="button"
                onClick={() => set("photo_url", "")}
                aria-label={t("consult.photoRemove")}
                className="absolute end-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-rose text-paper shadow transition hover:opacity-90"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-2 flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-[13px] font-semibold text-ink transition hover:bg-sunken active:scale-[0.98] disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {uploading
              ? t("consult.photoUploading")
              : form.photo_url
                ? t("consult.photoReplace")
                : t("consult.photoAdd")}
          </button>
          <input
            type="file"
            ref={fileRef}
            onChange={pickPhoto}
            accept="image/*"
            className="hidden"
          />
        </div>

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
