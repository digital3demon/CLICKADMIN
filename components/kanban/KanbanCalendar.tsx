"use client";

import { useMemo, useState } from "react";
import type { KanbanAppState, KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import {
  cardMatchesFilters,
  getCardTypeAccent,
  isKanbanAggregateBoardId,
  textOnAccentHex,
} from "@/lib/kanban/model";
import { getKanbanStageDue } from "@/lib/kanban/kanban-stage-due";
import { loadKanbanCardHeadsCache } from "@/lib/kanban/kanban-card-heads-cache";
import { KanbanTimerIcon } from "./KanbanTimerIcon";

type KanbanCalendarProps = {
  appState: KanbanAppState;
  board: KanbanBoard;
  resolveCardHomeBoard: (card: KanbanCard) => KanbanBoard;
  onOpenCard: (id: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

type CalendarMobileRange = "month" | "week";

const DOW = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

function allBoardCards(board: KanbanBoard) {
  const out: KanbanCard[] = [];
  board.columns.forEach((col) => {
    col.cards.forEach((c) => out.push(c));
  });
  return out;
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

function isoDateKey(y: number, m: number, day: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isoFromDate(d: Date): string {
  return isoDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

function formatWeekRangeLabel(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  const d1 = start.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const d2 = end.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: sameMonth ? undefined : "short",
    year: sameYear ? undefined : "numeric",
  });
  const yearSuffix = sameYear ? ` ${start.getFullYear()} г.` : "";
  return `${d1} – ${d2}${yearSuffix}`;
}

function KanbanCalendarCardButton({
  card,
  appState,
  resolveCardHomeBoard,
  onOpenCard,
  compact = false,
}: {
  card: KanbanCard;
  appState: KanbanAppState;
  resolveCardHomeBoard: (card: KanbanCard) => KanbanBoard;
  onOpenCard: (id: string) => void;
  compact?: boolean;
}) {
  const hb = resolveCardHomeBoard(card);
  const accent = getCardTypeAccent(hb, card.cardTypeId);
  const fg = textOnAccentHex(accent);
  const titleLine = card.title || "Без названия";
  return (
    <button
      type="button"
      className={`relative max-w-full whitespace-normal break-words rounded border border-black/15 text-left font-medium leading-snug shadow-sm hover:brightness-[1.06] active:brightness-95 dark:border-black/30 ${
        compact
          ? "px-1 py-0.5 pr-7 text-[0.65rem]"
          : "px-2 py-1.5 pr-9 text-[0.8rem]"
      }`}
      style={{
        backgroundColor: accent,
        color: fg,
      }}
      title={
        (appState.search.trim() ||
          isKanbanAggregateBoardId(appState.activeBoardId)) &&
        hb.id !== appState.activeBoardId
          ? `${titleLine} · доска «${hb.title}»`
          : titleLine
      }
      onClick={() => onOpenCard(card.id)}
    >
      {titleLine}
      <KanbanTimerIcon
        card={card}
        className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2"
        sizeClassName={compact ? "h-5 w-5" : "h-6 w-6"}
      />
    </button>
  );
}

function anchorWeekForMonth(year: number, month: number): Date {
  const now = new Date();
  if (now.getFullYear() === year && now.getMonth() === month) {
    return startOfWeekMonday(now);
  }
  return startOfWeekMonday(new Date(year, month, 1));
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
  const monthLabel = first.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  const [mobileRange, setMobileRange] = useState<CalendarMobileRange>("month");
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));

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

  const byDate = useMemo(() => {
    const map: Record<string, KanbanCard[]> = {};
    const memberHeads = loadKanbanCardHeadsCache();
    allBoardCards(board).forEach((card) => {
      const hb = resolveCardHomeBoard(card);
      const stageDue = getKanbanStageDue(card);
      if (!stageDue || !cardMatchesFilters(card, hb, appState, { memberHeads })) {
        return;
      }
      if (!map[stageDue]) map[stageDue] = [];
      map[stageDue].push(card);
    });
    return map;
  }, [appState, board, resolveCardHomeBoard]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const weekEnd = weekDays[6] ?? weekStart;
  const weekLabel = formatWeekRangeLabel(weekStart, weekEnd);

  const rangeToggleClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
      active
        ? "border-[var(--sidebar-blue)] bg-[var(--sidebar-blue)] text-white"
        : "border-[var(--kanban-border)] bg-[var(--kanban-rail-bg)] text-[var(--kanban-text-muted)] hover:text-[var(--kanban-text)]"
    }`;

  return (
    <div className="relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-4">
      <div className="mb-2 flex justify-center gap-1.5 md:hidden">
        <button
          type="button"
          className={rangeToggleClass(mobileRange === "month")}
          onClick={() => setMobileRange("month")}
        >
          Месяц
        </button>
        <button
          type="button"
          className={rangeToggleClass(mobileRange === "week")}
          onClick={() => {
            setWeekStart(anchorWeekForMonth(y, m));
            setMobileRange("week");
          }}
        >
          Неделя
        </button>
      </div>

      <div className="mb-3 flex items-center justify-center gap-3 sm:gap-4">
        <button
          type="button"
          className="rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-rail-bg)] px-3 py-1.5 text-[0.875rem] text-[var(--kanban-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          onClick={() => {
            if (mobileRange === "week") {
              setWeekStart((cur) => addDays(cur, -7));
              return;
            }
            onPrevMonth();
          }}
        >
          ←
        </button>
        <span className="min-w-0 flex-1 text-center text-base font-semibold capitalize text-[var(--kanban-text)] sm:min-w-[200px] sm:text-lg">
          {mobileRange === "week" ? (
            <>
              <span className="md:hidden">{weekLabel}</span>
              <span className="hidden md:inline">{monthLabel}</span>
            </>
          ) : (
            monthLabel
          )}
        </span>
        <button
          type="button"
          className="rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-rail-bg)] px-3 py-1.5 text-[0.875rem] text-[var(--kanban-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          onClick={() => {
            if (mobileRange === "week") {
              setWeekStart((cur) => addDays(cur, 7));
              return;
            }
            onNextMonth();
          }}
        >
          →
        </button>
      </div>

      {mobileRange === "week" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto md:hidden">
          {weekDays.map((day) => {
            const iso = isoFromDate(day);
            const list = byDate[iso] || [];
            const dow = DOW[(day.getDay() + 6) % 7];
            const dayTitle = day.toLocaleDateString("ru-RU", {
              weekday: "long",
              day: "numeric",
              month: "long",
            });
            return (
              <section
                key={iso}
                className="rounded-lg border border-[var(--kanban-border)] bg-[var(--kanban-workspace-bg)]"
              >
                <header className="border-b border-[var(--kanban-border)] bg-[var(--kanban-rail-bg)] px-3 py-2">
                  <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--kanban-text-muted)]">
                    {dow}
                  </div>
                  <div className="text-sm font-semibold capitalize text-[var(--kanban-text)]">
                    {dayTitle}
                  </div>
                </header>
                <div className="flex flex-col gap-1.5 p-2">
                  {list.length === 0 ? (
                    <p className="px-1 py-2 text-xs text-[var(--kanban-text-muted)]">
                      Нет карточек
                    </p>
                  ) : (
                    list.map((c) => (
                      <KanbanCalendarCardButton
                        key={c.id}
                        card={c}
                        appState={appState}
                        resolveCardHomeBoard={resolveCardHomeBoard}
                        onOpenCard={onOpenCard}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      <div
        className={`min-h-0 flex-1 grid-cols-7 gap-px overflow-auto rounded-lg border border-[var(--kanban-border)] bg-[var(--kanban-border)] ${
          mobileRange === "week" ? "hidden md:grid" : "grid"
        }`}
      >
        {DOW.map((d) => (
          <div
            key={d}
            className="bg-[var(--kanban-rail-bg)] px-1 py-2 text-center text-[0.7rem] font-semibold uppercase text-[var(--kanban-text-muted)]"
          >
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          const iso = isoDateKey(cell.cy, cell.cm, cell.day);
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
              <div className="mt-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-0.5">
                {list.map((c) => (
                  <KanbanCalendarCardButton
                    key={c.id}
                    card={c}
                    appState={appState}
                    resolveCardHomeBoard={resolveCardHomeBoard}
                    onOpenCard={onOpenCard}
                    compact
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
