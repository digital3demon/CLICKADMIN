"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { KanbanAppState } from "@/lib/kanban/types";
import { IconBoard, IconListRows } from "./kanban-icons";

export type KanbanViewMode = KanbanAppState["viewMode"];

const VIEW_OPTIONS: {
  id: KanbanViewMode;
  label: string;
  icon?: ReactNode;
}[] = [
  { id: "board", label: "Доска", icon: <IconBoard /> },
  { id: "calendar", label: "Календарь" },
  { id: "list", label: "Список", icon: <IconListRows /> },
];

function viewModeLabel(mode: KanbanViewMode): string {
  return VIEW_OPTIONS.find((o) => o.id === mode)?.label ?? "Доска";
}

export function KanbanViewModePicker({
  viewMode,
  onChange,
}: {
  viewMode: KanbanViewMode;
  onChange: (mode: KanbanViewMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="inline-flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] px-3 py-2 text-[0.8125rem] font-semibold text-[var(--kanban-text)] hover:brightness-[0.98] dark:hover:brightness-110 sm:text-[0.875rem]"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>Вид</span>
        <span className="text-[var(--kanban-text-muted)]">·</span>
        <span className="max-w-[5.5rem] truncate font-medium text-[var(--kanban-text)] sm:max-w-none">
          {viewModeLabel(viewMode)}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={`shrink-0 text-[var(--kanban-text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Режим отображения канбана"
          className="absolute right-0 top-[calc(100%+0.35rem)] z-[120] min-w-[10.5rem] overflow-hidden rounded-lg border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] py-1 shadow-[var(--kanban-shadow-elevated)]"
        >
          {VIEW_OPTIONS.map((opt) => {
            const active = viewMode === opt.id;
            return (
              <li key={opt.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-[0.8125rem] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] sm:text-[0.875rem] ${
                    active
                      ? "bg-black/[0.05] font-semibold text-[var(--kanban-text)] dark:bg-white/[0.08]"
                      : "font-medium text-[var(--kanban-text)]"
                  }`}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  {opt.icon ? (
                    <span className="inline-flex shrink-0 text-[var(--kanban-text-muted)]">
                      {opt.icon}
                    </span>
                  ) : null}
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
