"use client";

// Holds the reader's language for the React tree.
//
// The chosen language is stored in a cookie rather than localStorage so the
// server render already knows it: the root layout reads the cookie, stamps
// lang/dir on <html>, and seeds this provider. That means no hydration
// mismatch on translated text and no flash of the wrong language — the
// trade-off localStorage alone cannot make, because the server cannot read it.

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  LANG_KEY,
  Lang,
  MessageKey,
  Vars,
  dirOf,
  setActiveLang,
  translate,
} from "./i18n";

interface LanguageContext {
  lang: Lang;
  dir: "rtl" | "ltr";
  /** True while reading Arabic — handy for direction-dependent layout. */
  rtl: boolean;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: MessageKey, vars?: Vars) => string;
}

const Ctx = createContext<LanguageContext | null>(null);

/** Persist for a year; the cookie is the source of truth on the next load. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function persist(lang: Lang) {
  document.cookie = `${LANG_KEY}=${lang}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Private mode / storage disabled — the cookie alone is enough.
  }
}

export function LanguageProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  // Keep the ambient language (used by lib/api.ts and lib/format.ts) in step
  // with React state. Done during render, not in an effect, so the very first
  // paint and any error thrown by that first data call are already translated.
  setActiveLang(lang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    persist(next);
    const root = document.documentElement;
    root.lang = next;
    root.dir = dirOf(next);
  }, []);

  const toggleLang = useCallback(
    () => setLang(lang === "ar" ? "en" : "ar"),
    [lang, setLang],
  );

  // No first-visit detection here on purpose: the server already picked the
  // language from Accept-Language before rendering (see app/layout.tsx), so
  // there is nothing left to correct once this component mounts.

  const value = useMemo<LanguageContext>(
    () => ({
      lang,
      dir: dirOf(lang),
      rtl: lang === "ar",
      setLang,
      toggleLang,
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang, setLang, toggleLang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): LanguageContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useI18n must be used inside <LanguageProvider>.");
  }
  return ctx;
}
