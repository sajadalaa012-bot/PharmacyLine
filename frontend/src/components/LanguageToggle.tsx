"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";

/** One-tap EN ⇄ ع switch. Sits beside ThemeToggle in both shells. */
export default function LanguageToggle() {
  const { t, toggleLang } = useI18n();

  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label={t("lang.switchTo")}
      title={t("lang.switchTo")}
      className="flex h-10 items-center gap-1.5 rounded-md px-2.5 text-ink-2 transition hover:bg-sunken hover:text-ink active:scale-90"
    >
      <Languages className="h-4.5 w-4.5" />
      <span className="text-xs font-bold tracking-wide">{t("lang.label")}</span>
    </button>
  );
}
