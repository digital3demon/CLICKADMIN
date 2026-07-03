"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { combineDueLocalCalendarDayAndHm } from "@/lib/order-due-datetime";
import type { ReplyDatePlaceholderDef } from "@/lib/mail/reply-preflight-date-placeholders";
import { parseReplyDatePickerLocal } from "@/lib/mail/reply-preflight-date-placeholders";

const MONTHS_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

const WEEKDAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;
const TIME_OPTIONS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function sameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getCalendarCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthLast = new Date(year, month, 0).getDate();
  const cells: { inMonth: boolean; date: Date }[] = [];
  for (let i = 0; i < 42; i++) {
    const dayNum = i - startPad + 1;
    if (dayNum < 1) {
      cells.push({
        inMonth: false,
        date: new Date(year, month - 1, prevMonthLast + dayNum),
      });
    } else if (dayNum > daysInMonth) {
      cells.push({
        inMonth: false,
        date: new Date(year, month + 1, dayNum - daysInMonth),
      });
    } else {
      cells.push({ inMonth: true, date: new Date(year, month, dayNum) });
    }
  }
  return cells;
}

export type ReplyPreflightInlineDatePickerProps = {
  open: boolean;
  anchorRect: DOMRect | null;
  def: ReplyDatePlaceholderDef;
  value: string;
  hasTime: boolean;
  onApply: (value: string, hasTime: boolean) => void;
  onClose: () => void;
};

export function ReplyPreflightInlineDatePicker({
  open,
  anchorRect,
  def,
  value,
  hasTime,
  onApply,
  onClose,
}: ReplyPreflightInlineDatePickerProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const parsed = useMemo(() => parseReplyDatePickerLocal(value), [value]);
  const selectedDate = parsed.date;
  const selectedHm = hasTime ? parsed.hm : null;

  const initialView = useMemo(() => {
    if (selectedDate) {
      return { y: selectedDate.getFullYear(), m: selectedDate.getMonth() };
    }
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  }, [selectedDate, open]);

  const [viewYear, setViewYear] = useState(initialView.y);
  const [viewMonth, setViewMonth] = useState(initialView.m);

  useEffect(() => {
    if (!open) return;
    setViewYear(initialView.y);
    setViewMonth(initialView.m);
  }, [open, initialView.y, initialView.m]);

  const [pos, setPos] = useState({ top: 0, left: 0, maxHeight: 420 });

  useEffect(() => {
    if (!open || !anchorRect) return;
    const pad = 8;
    const w = Math.min(420, window.innerWidth - pad * 2);
    let left = anchorRect.left;
    if (left + w > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - pad - w);
    }
    const popoverHeight = Math.min(420, window.innerHeight - pad * 2);
    const spaceBelow = window.innerHeight - anchorRect.bottom - pad;
    const spaceAbove = anchorRect.top - pad;
    const opensUp = spaceBelow < popoverHeight && spaceAbove > spaceBelow;
    const maxHeight = Math.max(240, Math.min(popoverHeight, opensUp ? spaceAbove : spaceBelow));
    setPos({
      top: opensUp
        ? Math.max(pad, anchorRect.top - maxHeight - 6)
        : Math.min(anchorRect.bottom + 6, window.innerHeight - pad - maxHeight),
      left,
      maxHeight,
    });
  }, [open, anchorRect]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const cells = useMemo(
    () => getCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  );
  const today = new Date();
  const showTime = def.inputType === "datetime-local";

  const onPickDay = useCallback(
    (date: Date) => {
      const ymd = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
      if (!showTime) {
        onApply(ymd, false);
        onClose();
        return;
      }
      onApply(ymd, false);
    },
    [onApply, onClose, showTime],
  );

  const onPickTime = useCallback(
    (hm: string) => {
      const base = selectedDate ?? new Date();
      const local = combineDueLocalCalendarDayAndHm(base, hm);
      onApply(local, true);
      onClose();
    },
    [onApply, onClose, selectedDate],
  );

  if (!open || !anchorRect) return null;

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={def.label}
      className="fixed z-[10000] flex flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl sm:flex-row"
      style={{
        top: pos.top,
        left: pos.left,
        minWidth: Math.min(340, window.innerWidth - 16),
        maxWidth: "min(420px, calc(100vw - 16px))",
        maxHeight: pos.maxHeight,
      }}
    >
      <div className="min-w-0 flex-1 border-b border-[var(--card-border)] p-3 sm:border-b-0 sm:border-r">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--sidebar-blue)] hover:bg-[var(--surface-hover)]"
            onClick={() => {
              const d = new Date(viewYear, viewMonth - 1, 1);
              setViewYear(d.getFullYear());
              setViewMonth(d.getMonth());
            }}
            aria-label="Предыдущий месяц"
          >
            ‹
          </button>
          <div className="min-w-0 text-center text-sm font-semibold text-[var(--sidebar-blue)]">
            {MONTHS_RU[viewMonth]} {viewYear}
          </div>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--sidebar-blue)] hover:bg-[var(--surface-hover)]"
            onClick={() => {
              const d = new Date(viewYear, viewMonth + 1, 1);
              setViewYear(d.getFullYear());
              setViewMonth(d.getMonth());
            }}
            aria-label="Следующий месяц"
          >
            ›
          </button>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {WEEKDAYS_RU.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((cell, idx) => {
            const isSel = selectedDate && sameCalendarDay(cell.date, selectedDate);
            const isToday = sameCalendarDay(cell.date, today);
            return (
              <button
                key={`${cell.date.toISOString()}-${idx}`}
                type="button"
                onClick={() => onPickDay(cell.date)}
                className={[
                  "flex h-8 items-center justify-center rounded-full text-xs tabular-nums",
                  !cell.inMonth
                    ? "text-[var(--text-muted)]/55 hover:bg-[var(--surface-hover)]"
                    : "text-[var(--app-text)] hover:bg-[var(--surface-hover)]",
                  isSel
                    ? "bg-[var(--sidebar-blue)] font-semibold text-white hover:bg-[var(--sidebar-blue-hover)]"
                    : "",
                  !isSel && isToday && cell.inMonth
                    ? "font-semibold text-[var(--sidebar-blue)]"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {cell.date.getDate()}
              </button>
            );
          })}
        </div>
        {showTime ? (
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            Выберите день, затем время справа. Без времени в письме будет «в течение дня».
          </p>
        ) : null}
      </div>
      {showTime ? (
        <div className="flex max-h-[280px] w-[88px] shrink-0 flex-col border-[var(--card-border)] sm:max-h-none sm:w-[96px] sm:border-l">
          <div className="border-b border-[var(--card-border)] px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Время
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {TIME_OPTIONS.map((hm) => {
              const active = selectedHm === hm && hasTime;
              return (
                <button
                  key={hm}
                  type="button"
                  onClick={() => onPickTime(hm)}
                  className={[
                    "block w-full px-2 py-1.5 text-center text-sm tabular-nums",
                    active
                      ? "bg-[var(--sidebar-blue)] font-semibold text-white"
                      : "text-[var(--app-text)] hover:bg-[var(--surface-hover)]",
                  ].join(" ")}
                >
                  {hm}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
