"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";

/** The paper each theme sits on — also what the browser paints its chrome. */
const PAPER = { light: "#f5f2ec", dark: "#16130e" };

/** Repaint the status bar / browser chrome to match the theme in force. */
function paintChrome(dark: boolean) {
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute("content", dark ? PAPER.dark : PAPER.light));
}

export default function ThemeToggle() {
  const { t } = useI18n();
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
    setMounted(true);
    paintChrome(isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    paintChrome(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? t("theme.toLight") : t("theme.toDark")}
      title={dark ? t("theme.light") : t("theme.dark")}
      className="flex h-10 w-10 items-center justify-center rounded-md text-ink-2 transition hover:bg-sunken hover:text-ink active:scale-90"
    >
      {/* Render a stable icon until mounted to avoid hydration mismatch */}
      {mounted && dark ? (
        <Moon className="h-4.5 w-4.5" />
      ) : (
        <Sun className="h-4.5 w-4.5" />
      )}
    </button>
  );
}
