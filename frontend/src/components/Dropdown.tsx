"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { useI18n } from "@/lib/LanguageProvider";

export interface DropdownOption {
  value: string;
  label: string;
  /** Shown greyed at the end of the row — a count, a hint, anything short. */
  meta?: string;
  /** Extra text the search box matches on but never displays. */
  keywords?: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  /** Adds a filter box above the list. Worth it past a dozen or so options. */
  searchable?: boolean;
  placeholder?: string;
}

/** Fully theme-styled dropdown (native select popups can't be themed). */
export default function Dropdown({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  searchable = false,
  placeholder,
}: DropdownProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Put the caret in the filter box on open so you can just start typing.
  // (The query itself is cleared by the toggle handler, not here — resetting
  // state from an effect would re-render the list a second time for nothing.)
  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  const toggleOpen = () =>
    setOpen((wasOpen) => {
      if (!wasOpen) setQuery("");
      return !wasOpen;
    });

  const active = options.find((o) => o.value === value);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.keywords ?? "").toLowerCase().includes(q),
    );
  }, [options, query]);

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="flex h-10 w-full items-center justify-between gap-2.5 rounded-md border border-line bg-surface px-3.5
                   text-sm font-medium text-ink transition hover:border-line-strong
                   focus-visible:border-brand/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/25"
      >
        <span className="min-w-0 flex-1 truncate text-start">
          {active ? <bdi>{active.label}</bdi> : (placeholder ?? "…")}
        </span>
        {active?.meta && (
          <span className="shrink-0 rounded-full bg-sunken px-1.5 text-[11px] text-ink-3 tabular-nums">
            {active.meta}
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className="pop absolute start-0 top-[calc(100%+6px)] z-50 w-full min-w-56 overflow-hidden
                     rounded-md border border-line bg-surface shadow-[0_18px_44px_-16px_rgba(0,0,0,0.35)]"
        >
          {searchable && (
            <div className="relative border-b border-line p-2">
              <Search className="pointer-events-none absolute start-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("dropdown.search")}
                aria-label={t("dropdown.search")}
                className="h-8 w-full rounded border border-line bg-sunken ps-8 pe-2 text-sm text-ink
                           outline-none transition placeholder:text-ink-3 focus:border-brand/50"
              />
            </div>
          )}

          <ul
            role="listbox"
            aria-label={ariaLabel}
            className="scroll-thin max-h-72 overflow-y-auto p-1"
          >
            {visible.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-ink-3">
                {t("dropdown.noResults")}
              </li>
            ) : (
              visible.map((option) => {
                const selected = option.value === value;
                return (
                  <li key={option.value} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-start text-sm transition-colors ${
                        selected
                          ? "bg-brand/10 font-semibold text-brand"
                          : "text-ink-2 hover:bg-sunken hover:text-ink"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        <bdi>{option.label}</bdi>
                      </span>
                      {option.meta && (
                        <span
                          className={`shrink-0 text-[11px] tabular-nums ${
                            selected ? "text-brand" : "text-ink-3"
                          }`}
                        >
                          {option.meta}
                        </span>
                      )}
                      {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
