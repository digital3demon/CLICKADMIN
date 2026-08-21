"use client";

import { useState, type ReactNode } from "react";

/** Вторичные поля строки списка: на laptop спрятаны в «Ещё», на shell-desktop колонки видны сами. */
export function ListRowUnfold({
  children,
  label = "Ещё",
}: {
  children: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-left" data-row-click-ignore>
      <button
        type="button"
        className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 text-[11px] font-semibold text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)]"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {open ? "Свернуть" : label}
      </button>
      {open ? (
        <div className="mt-1.5 space-y-1 break-words text-[11px] leading-snug text-[var(--text-secondary)]">
          {children}
        </div>
      ) : null}
    </div>
  );
}
