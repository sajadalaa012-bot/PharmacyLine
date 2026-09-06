"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";

/**
 * The way through to the consultation form, on the home screen.
 *
 * A whole row rather than a bare button: someone who does not already know
 * the shop offers this needs telling what it is before they will tap it, and
 * a word like "Consultation" on its own does not do that.
 */
export default function ConsultationInvite({
  onOpen,
}: {
  onOpen: () => void;
}) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-4 rounded-3xl border border-brand/25 bg-brand/[0.07] p-4 text-start
                 transition hover:border-brand/50 hover:bg-brand/10 active:scale-[0.99] sm:p-6"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand sm:h-12 sm:w-12">
        <Sparkles className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block font-display text-[16px] font-semibold tracking-tight text-ink sm:text-lg">
          {t("consult.eyebrow")}
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-2 sm:text-[13.5px]">
          {t("consult.inviteBody")}
        </span>
      </span>

      <ArrowRight className="h-5 w-5 shrink-0 text-brand flip-rtl transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
