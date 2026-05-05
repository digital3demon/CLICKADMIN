"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useFixedDropdownPosition } from "@/components/ui/use-fixed-dropdown-position";
import {
  LAB_WORK_STATUS_LABELS,
  LAB_WORK_STATUS_ORDER,
  LAB_WORK_STATUS_PILL_STYLES,
  type LabWorkStatus,
} from "@/lib/lab-work-status";

export function useMenuDismiss(
  open: boolean,
  close: () => void,
  wrapRef: RefObject<HTMLElement | null>,
  popoverRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (popoverRef?.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, wrapRef, popoverRef]);
}

function ChevronMini({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 opacity-75 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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

export function LabStatusPillMenu({
  value,
  onChange,
  compact = false,
}: {
  value: LabWorkStatus;
  onChange: (v: LabWorkStatus) => void;
  /** Компактная кнопка для шапки наряда */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useMenuDismiss(open, close, wrapRef, listRef);
  const pos = useFixedDropdownPosition(open, buttonRef, {
    maxListHeight: 288,
    minWidthPx: 200,
  });
  const pillClass = LAB_WORK_STATUS_PILL_STYLES[value];
  const label = LAB_WORK_STATUS_LABELS[value];
  const sizeClass = compact
    ? "min-h-9 max-w-[min(100vw-8rem,14rem)] px-2.5 py-1.5 text-[11px] sm:min-h-10 sm:px-3 sm:text-xs"
    : "min-h-11 max-w-[min(100vw-10rem,15rem)] px-3 py-2 text-xs";

  return (
    <div className="relative z-[60]" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`inline-flex items-center gap-1.5 rounded-full text-left font-semibold uppercase tracking-wide shadow-sm ${sizeClass} ${pillClass}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Статус: ${label}. Открыть список`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">{label}</span>
        <ChevronMini open={open} />
      </button>
      {typeof document !== "undefined" && open
        ? createPortal(
            <ul
              ref={listRef}
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxHeight,
                zIndex: 10000,
              }}
              className="overflow-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] py-1 shadow-xl"
              role="listbox"
              aria-label="Выбор статуса работы"
            >
              {LAB_WORK_STATUS_ORDER.map((key) => (
                <li key={key} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={key === value}
                    className={`flex w-full items-center px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide hover:bg-[var(--surface-hover)] ${
                      key === value ? "bg-[var(--surface-hover)] text-[var(--app-text)]" : "text-[var(--text-body)]"
                    }`}
                    onClick={() => {
                      onChange(key);
                      setOpen(false);
                    }}
                  >
                    {LAB_WORK_STATUS_LABELS[key]}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
