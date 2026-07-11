"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}

/** Fully theme-styled dropdown (native select popups can't be themed). */
export default function Dropdown({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const active = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="flex h-10 w-full items-center justify-between gap-3 rounded-md border border-line bg-surface px-3.5
                   text-sm font-medium text-ink transition hover:border-line-strong
                   focus-visible:border-brand/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/25"
      >
        <span className="truncate">{active?.label ?? "Select…"}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="pop scroll-thin absolute left-0 top-[calc(100%+6px)] z-50 max-h-72 w-full min-w-56 overflow-y-auto
                     rounded-md border border-line bg-surface p-1 shadow-[0_18px_44px_-16px_rgba(0,0,0,0.35)]"
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm transition-colors ${
                    selected
                      ? "bg-brand/10 font-semibold text-brand"
                      : "text-ink-2 hover:bg-sunken hover:text-ink"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
