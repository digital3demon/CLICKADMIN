"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  URGENT_MENU_OPTIONS,
  URGENT_NO_COEF,
  URGENT_UNSET,
} from "@/lib/order-urgency";
import { useMenuDismiss } from "@/components/orders/LabStatusPillMenu";

function ChevronMini({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3 w-3 shrink-0 opacity-75 transition-transform duration-200 sm:h-3.5 sm:w-3.5 ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

const BTN =
  "inline-flex min-h-7 max-w-[5.75rem] items-center gap-0.5 rounded-full border border-sky-200/80 bg-sky-50 px-1.5 py-0.5 text-left text-[10px] font-semibold leading-tight text-sky-950 shadow-sm dark:border-sky-800/50 dark:bg-sky-950/35 dark:text-sky-100 sm:min-h-9 sm:max-w-[min(100vw-8rem,12rem)] sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-[11px] md:min-h-10 md:px-3 md:text-xs";

export function UrgentPillMenu({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useMenuDismiss(open, close, wrapRef);

  const label = useMemo(() => {
    const o = URGENT_MENU_OPTIONS.find((x) => x.value === value);
    return o?.label ?? "Срочность";
  }, [value]);

  /** Короткая подпись в узкой пилюле (книжная ориентация). */
  const shortLabel = useMemo(() => {
    if (value === URGENT_UNSET) return "—";
    if (value === URGENT_NO_COEF) return "б/к";
    const o = URGENT_MENU_OPTIONS.find((x) => x.value === value);
    return o?.label ?? "…";
  }, [value]);

  return (
    <div className="relative z-[60]" ref={wrapRef}>
      <button
        type="button"
        className={BTN}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Срочность: ${label}. Открыть список`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-0 truncate sm:max-w-none">
          <span className="sm:hidden">С&nbsp;{shortLabel}</span>
          <span className="hidden sm:inline">Срочн.: {label}</span>
        </span>
        <ChevronMini open={open} />
      </button>
      {open ? (
        <ul
          className="absolute right-0 top-full z-[200] mt-1 max-h-80 min-w-[12.5rem] overflow-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] py-1 shadow-xl sm:left-0 sm:right-auto"
          role="listbox"
          aria-label="Срочность"
        >
          {URGENT_MENU_OPTIONS.map((opt) => (
            <li key={opt.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={opt.value === value}
                className={`flex w-full items-center px-3 py-2 text-left text-xs font-medium hover:bg-[var(--surface-hover)] ${
                  opt.value === value
                    ? "bg-[var(--surface-hover)] text-[var(--app-text)]"
                    : "text-[var(--text-body)]"
                }`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
