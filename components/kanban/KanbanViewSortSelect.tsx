"use client";

import {
  BOARD_COLUMN_SORT_MANUAL,
  LIST_SORT_SELECT_OPTIONS,
  sortToSelectValue,
  type KanbanViewSortPref,
} from "@/lib/kanban/list-view-sort";

export function KanbanViewSortSelect({
  pref,
  showBoardManual,
  onChange,
}: {
  pref: KanbanViewSortPref;
  showBoardManual: boolean;
  onChange: (next: KanbanViewSortPref) => void;
}) {
  const value =
    pref === BOARD_COLUMN_SORT_MANUAL
      ? BOARD_COLUMN_SORT_MANUAL
      : sortToSelectValue(pref);
  return (
    <select
      id="kanban-view-sort"
      aria-label="Сортировка"
      title={
        pref === BOARD_COLUMN_SORT_MANUAL
          ? "Порядок карточек, как сохранён на доске"
          : "Сортировка только для отображения. На доске перетаскивание внутри колонки отключено."
      }
      className="inline-flex h-9 min-w-0 max-w-[10.5rem] shrink-0 rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] px-1.5 text-[0.68rem] font-medium text-[var(--kanban-text)] shadow-sm sm:max-w-[16rem] sm:px-2 sm:text-[0.8125rem]"
      value={
        !showBoardManual && pref === BOARD_COLUMN_SORT_MANUAL
          ? sortToSelectValue({ key: "created", dir: "desc" })
          : value
      }
      onChange={(e) => {
        if (e.target.value === BOARD_COLUMN_SORT_MANUAL) {
          onChange(BOARD_COLUMN_SORT_MANUAL);
          return;
        }
        const opt = LIST_SORT_SELECT_OPTIONS.find((o) => o.value === e.target.value);
        if (opt) onChange(opt.sort);
      }}
    >
      {showBoardManual ? (
        <option value={BOARD_COLUMN_SORT_MANUAL}>Порядок на доске</option>
      ) : null}
      {LIST_SORT_SELECT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
