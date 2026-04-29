"use client";

import type { KanbanAppState, KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import {
  cardMatchesFilters,
  getCardTypeAccent,
  isKanbanAggregateBoardId,
  textOnAccentHex,
} from "@/lib/kanban/model";

type KanbanCalendarProps = {
  appState: KanbanAppState;
  board: KanbanBoard;
  resolveCardHomeBoard: (card: KanbanCard) => KanbanBoard;
  onOpenCard: (id: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

function allBoardCards(board: KanbanBoard) {
  const out: KanbanCard[] = [];
  board.columns.forEach((col) => {
    col.cards.forEach((c) => out.push(c));
  });
  return out;
}

export function KanbanCalendar({
  appState,
  board,
  resolveCardHomeBoard,
  onOpenCard,
  onPrevMonth,
  onNextMonth,
}: KanbanCalendarProps) {
  const { y, m } = appState.calendarMonth;
  const first = new Date(y, m, 1);
  const label = first.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const dow = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevMonthLast = new Date(y, m, 0);
  const prevYear = prevMonthLast.getFullYear();
  const prevMonth = prevMonthLast.getMonth();
  const daysInPrev = prevMonthLast.getDate();

  const cells: {
    day: number;
    inMonth: boolean;
    cy: number;
    cm: number;
  }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    const day = daysInPrev - startWeekday + i + 1;
    cells.push({ day, inMonth: false, cy: prevYear, cm: prevMonth });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, cy: y, cm: m });
  }
  let nextY = m === 11 ? y + 1 : y;
  let nextM = m === 11 ? 0 : m + 1;
  let nd = 1;
  while (cells.length < 42) {
    cells.push({ day: nd++, inMonth: false, cy: nextY, cm: nextM });
  }

  const byDate: Record<string, KanbanCard[]> = {};
  allBoardCards(board).forEach((card) => {
    const hb = resolveCardHomeBoard(card);
    if (!card.dueDate || !cardMatchesFilters(card, hb, appState)) return;
    const key = card.dueDate;
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(card);
  });

  return (
    <div className="relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-center gap-4">
        <button
          type="button"
          className="rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-rail-bg)] px-3 py-1.5 text-[0.875rem] text-[var(--kanban-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          onClick={onPrevMonth}
        >
          ←
        </button>
        <span className="min-w-[200px] text-center text-lg font-semibold capitalize text-[var(--kanban-text)]">
          {label}
        </span>
        <button
          type="button"
          className="rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-rail-bg)] px-3 py-1.5 text-[0.875rem] text-[var(--kanban-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          onClick={onNextMonth}
        >
          →
        </button>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 gap-px overflow-auto rounded-lg border border-[var(--kanban-border)] bg-[var(--kanban-border)]">
        {dow.map((d) => (
          <div
            key={d}
            className="bg-[var(--kanban-rail-bg)] px-1 py-2 text-center text-[0.7rem] font-semibold uppercase text-[var(--kanban-text-muted)]"
          >
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          const iso = `${cell.cy}-${String(cell.cm + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
          const list = byDate[iso] || [];
          return (
            <div
              key={i}
              className={`flex min-h-[100px] flex-col bg-[var(--kanban-workspace-bg)] p-1 ${
                cell.inMonth ? "" : "opacity-50"
              }`}
            >
              <div className="text-[0.75rem] font-medium text-[var(--kanban-text)]">
                {cell.day}
              </div>
              <div className="mt-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                {list.slice(0, 6).map((c) => {
                  const hb = resolveCardHomeBoard(c);
                  const ct = (hb.cardTypes || []).find((t) => t.id === c.cardTypeId);
                  const accent = getCardTypeAccent(hb, c.cardTypeId);
                  const fg = textOnAccentHex(accent);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className="max-w-full truncate rounded border border-black/15 px-1 py-0.5 text-left text-[0.65rem] font-medium leading-tight shadow-sm hover:brightness-[1.06] active:brightness-95 dark:border-black/30"
                      style={{
                        backgroundColor: accent,
                        color: fg,
                      }}
                      title={
                        (appState.search.trim() ||
                          isKanbanAggregateBoardId(appState.activeBoardId)) &&
                        hb.id !== appState.activeBoardId
                          ? `${c.title || "Без названия"} · доска «${hb.title}»`
                          : undefined
                      }
                      onClick={() => onOpenCard(c.id)}
                    >
                      {(ct ? ct.name + ": " : "") + (c.title || "Без названия")}
                    </button>
                  );
                })}
                {list.length > 6 && (
                  <div className="px-0.5 py-0.5 text-[0.65rem] text-[var(--kanban-text-muted)]">
                    +{list.length - 6}…
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
