"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, MessageCircle, Phone, RotateCcw, Trash2 } from "lucide-react";
import {
  Consultation,
  Gender,
  PregnancyState,
  SkinConcern,
  SkinType,
} from "@/types";
import {
  fetchConsultations,
  updateConsultationStatus,
  deleteConsultation,
} from "@/lib/api";
import { shortDate, shortTime, whatsAppTo } from "@/lib/format";
import { useI18n } from "@/lib/LanguageProvider";
import { MessageKey } from "@/lib/i18n";

// Same maps the form uses, so the back office reads a request in whatever
// language the admin is browsing in - the stored keys carry no words.
const SKIN_TYPE_LABEL: Record<SkinType, MessageKey> = {
  normal: "consult.skinNormal",
  dry: "consult.skinDry",
  oily: "consult.skinOily",
  combination: "consult.skinCombination",
  sensitive: "consult.skinSensitive",
};

const GENDER_LABEL: Record<Gender, MessageKey> = {
  female: "consult.genderFemale",
  male: "consult.genderMale",
};

const PREGNANCY_LABEL: Record<PregnancyState, MessageKey> = {
  pregnant: "consult.pregnant",
  breastfeeding: "consult.breastfeeding",
  neither: "consult.pregnancyNeither",
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

export default function AdminConsultationsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "new">("new");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await fetchConsultations());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (c: Consultation) => {
    setBusyId(c.id);
    setError(null);
    try {
      const next = c.status === "done" ? "new" : "done";
      const saved = await updateConsultationStatus(c.id, next);
      setItems((list) => list.map((x) => (x.id === c.id ? saved : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("err.updateConsult"));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c: Consultation) => {
    // Two taps, like every other delete in the back office.
    if (confirmId !== c.id) {
      setConfirmId(c.id);
      return;
    }
    setBusyId(c.id);
    setError(null);
    try {
      await deleteConsultation(c.id);
      setItems((list) => list.filter((x) => x.id !== c.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("err.deleteConsult"));
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  const shown = filter === "new" ? items.filter((c) => c.status === "new") : items;
  const waiting = items.filter((c) => c.status === "new").length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          {t("nav.consultations")}
        </h1>
        <div className="flex items-center gap-2">
          {(["new", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-9 rounded-full px-4 text-[13px] font-medium transition ${
                filter === f
                  ? "bg-brand text-on-brand"
                  : "border border-line-strong text-ink-2 hover:bg-sunken"
              }`}
            >
              {f === "new"
                ? t("consult.filterWaiting", { n: waiting })
                : t("consult.filterAll")}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-rose/30 bg-rose/10 p-3 text-xs text-rose">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-10 text-center text-[13px] text-ink-3">
          {t("shop.loading")}
        </p>
      ) : shown.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-line-strong bg-sunken/40 px-4 py-8 text-center text-[13px] text-ink-3">
          {filter === "new" ? t("consult.noneWaiting") : t("consult.noneYet")}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {shown.map((c) => {
            const done = c.status === "done";
            return (
              <li
                key={c.id}
                className={`rounded-xl border p-4 transition ${
                  done
                    ? "border-line bg-sunken/40"
                    : "border-line-strong bg-surface"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      <bdi>{c.name}</bdi>
                      {c.age.trim() && (
                        <span className="ms-2 text-[13px] font-normal text-ink-3">
                          {c.age.trim()}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-3 tabular-nums">
                      {shortDate(c.created_at)} · {shortTime(c.created_at)}
                    </p>
                  </div>
                  {done ? (
                    <span className="label-caps rounded-full bg-sunken px-2.5 py-1 text-ink-3">
                      {t("consult.done")}
                    </span>
                  ) : (
                    <span className="label-caps rounded-full bg-copper px-2.5 py-1 text-paper">
                      {t("consult.waiting")}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={`tel:${c.phone}`}
                    className="flex h-9 items-center gap-2 rounded-md border border-line-strong px-3.5 text-[13px] font-semibold text-ink transition hover:bg-sunken"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span dir="ltr" className="tabular-nums">
                      {c.phone}
                    </span>
                  </a>
                  <a
                    href={whatsAppTo(c.phone, t("consult.waMessage", { name: c.name }))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 items-center gap-2 rounded-md bg-[#25d366] px-3.5 text-[13px] font-semibold text-[#08301b] transition hover:brightness-95"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {t("consult.whatsapp")}
                  </a>
                </div>

                {/* The photograph, when one was sent. First, because it is
                    the thing worth looking at before reading anything. */}
                {c.photo_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={c.photo_url}
                    alt=""
                    className="mt-3 h-40 w-40 rounded-lg border border-line object-cover"
                  />
                )}

                <dl className="mt-3 space-y-1.5 text-[13px]">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-ink-3">{t("consult.skinType")}:</dt>
                    <dd className="font-medium text-ink">
                      {t(SKIN_TYPE_LABEL[c.skin_type])}
                    </dd>
                  </div>
                  {c.gender && (
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="text-ink-3">{t("consult.gender")}:</dt>
                      <dd className="font-medium text-ink">
                        {t(GENDER_LABEL[c.gender])}
                      </dd>
                    </div>
                  )}
                  {c.city.trim() && (
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="text-ink-3">{t("consult.city")}:</dt>
                      <dd className="font-medium text-ink">
                        <bdi>{c.city.trim()}</bdi>
                      </dd>
                    </div>
                  )}
                  {c.concerns.length > 0 && (
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="text-ink-3">{t("consult.concerns")}</dt>
                      <dd className="font-medium text-ink">
                        {c.concerns.map((k) => t(CONCERN_LABEL[k])).join("، ")}
                      </dd>
                    </div>
                  )}
                  {/* Said in the same copper the allergies wear: both are
                      answers about what must not be recommended. */}
                  {c.pregnancy && c.pregnancy !== "neither" && (
                    <div className="flex flex-wrap gap-x-2 rounded-md border border-copper/30 bg-copper/[0.08] px-3 py-2">
                      <dt className="text-ink-3">{t("consult.pregnancy")}:</dt>
                      <dd className="font-semibold text-ink">
                        {t(PREGNANCY_LABEL[c.pregnancy])}
                      </dd>
                    </div>
                  )}
                  {c.budget.trim() && (
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="text-ink-3">{t("consult.budget")}:</dt>
                      <dd className="font-medium text-ink">
                        <bdi>{c.budget.trim()}</bdi>
                      </dd>
                    </div>
                  )}
                  {c.routine.trim() && (
                    <div className="rounded-md bg-sunken px-3 py-2 leading-relaxed text-ink-2">
                      <span className="text-ink-3">
                        {t("consult.routine")}:{" "}
                      </span>
                      {c.routine.trim()}
                    </div>
                  )}
                  {c.allergies.trim() && (
                    <div className="rounded-md border border-copper/30 bg-copper/[0.08] px-3 py-2 leading-relaxed text-ink-2">
                      <span className="text-ink-3">
                        {t("consult.allergies")}:{" "}
                      </span>
                      {c.allergies.trim()}
                    </div>
                  )}
                  {c.notes.trim() && (
                    <div className="rounded-md bg-sunken px-3 py-2 leading-relaxed text-ink-2">
                      {c.notes.trim()}
                    </div>
                  )}
                </dl>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setStatus(c)}
                    disabled={busyId === c.id}
                    className="flex h-9 items-center gap-2 rounded-md bg-brand px-3.5 text-[13px] font-semibold text-on-brand transition hover:bg-brand-deep active:scale-[0.98] disabled:opacity-50"
                  >
                    {done ? (
                      <RotateCcw className="h-3.5 w-3.5" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    {done ? t("consult.reopen") : t("consult.markDone")}
                  </button>
                  <button
                    onClick={() => remove(c)}
                    disabled={busyId === c.id}
                    className={`ms-auto flex h-9 items-center gap-2 rounded-md px-3.5 text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-50 ${
                      confirmId === c.id
                        ? "animate-pulse bg-rose text-paper"
                        : "border border-rose/35 text-rose hover:bg-rose/10"
                    }`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {confirmId === c.id ? t("common.sure") : t("common.delete")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
