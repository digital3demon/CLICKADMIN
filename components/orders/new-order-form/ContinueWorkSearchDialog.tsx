"use client";

import { useMemo, useState } from "react";

export type PickedOrder = {
  id: string;
  number: string;
  label: string;
  href: string;
};

type ContinueWorkSearchDialogProps = {
  open: boolean;
  onClose: () => void;
  onPick: (order: PickedOrder) => void;
};

type MockRow = { id: string; number: string; patient: string };

/** Заглушка: позже заменить на запрос к API списка нарядов */
const MOCK_ORDERS: MockRow[] = [
  { id: "m1", number: "2603-102", patient: "Иванов А.А." },
  { id: "m2", number: "2603-088", patient: "Петрова М.И." },
  { id: "m3", number: "2602-441", patient: "Сидоров К.К." },
  { id: "m4", number: "2601-015", patient: "Анонимный пациент" },
];

function toPicked(o: MockRow): PickedOrder {
  return {
    id: o.id,
    number: o.number,
    label: `Наряд ${o.number} · ${o.patient}`,
    href: `/orders?continue=${encodeURIComponent(o.id)}&ref=${encodeURIComponent(o.number)}`,
  };
}

export function ContinueWorkSearchDialog({
  open,
  onClose,
  onPick,
}: ContinueWorkSearchDialogProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = MOCK_ORDERS.map(toPicked);
    if (!q) return list;
    return list.filter(
      (o) =>
        o.number.toLowerCase().includes(q) ||
        o.label.toLowerCase().includes(q),
    );
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="continue-work-search-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(80vh,520px)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
          <h2
            id="continue-work-search-title"
            className="text-sm font-semibold text-[var(--app-text)]"
          >
            Поиск наряда для продолжения
          </h2>
          <button
            type="button"
            className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <div className="border-b border-[var(--border-subtle)] p-3">
          <input
            type="search"
            className="w-full rounded-md border border-[var(--input-border)] px-3 py-2 text-sm outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
            placeholder="Номер наряда, ФИО…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
              Ничего не найдено
            </li>
          ) : (
            filtered.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--surface-hover)]"
                  onClick={() => onPick(o)}
                >
                  <span className="font-medium text-[var(--sidebar-blue)]">
                    Наряд {o.number}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                    {o.label.includes("·")
                      ? o.label.split("·")[1]?.trim()
                      : ""}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
