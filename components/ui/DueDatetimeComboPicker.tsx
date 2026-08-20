"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  combineDueLocalCalendarDayAndHm,
  dueGridDayLatestLocal,
  dueHalfHourTimeOptions,
  dueLabDayLatestLocal,
  dueLabTimeOptions,
  dueLocalIsBefore,
  snapDatetimeLocalToDueGrid,
  snapDatetimeLocalToLabDueGrid,
} from "@/lib/order-due-datetime";

export type DueDatetimeTimeGrid = "halfHour" | "labDue";

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

function parseHmFromLocal(local: string): string | null {
  const t = local.trim();
  if (!t) return null;
  const i = t.indexOf("T");
  if (i < 0) return null;
  const hm = t.slice(i + 1, i + 6);
  if (!/^\d{2}:\d{2}$/.test(hm)) return null;
  return hm;
}

function formatDisplayRu(local: string): string {
  const t = local.trim();
  if (!t) return "";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(/\u00a0/g, " ");
}

/** Части для раздельного показа в таблице (парсим стену `yyyy-mm-ddTHH:mm`, без TZ процесса). */
function compactDatePartFromLocal(local: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(local.trim());
  if (!m) return "";
  const y = Number.parseInt(m[1]!, 10);
  const mm = m[2]!;
  const dd = m[3]!;
  const cy = Number.parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Moscow",
      year: "numeric",
    }).format(new Date()),
    10,
  );
  if (y === cy) return `${dd}.${mm}`;
  return `${dd}.${mm}.${String(y).slice(-2)}`;
}

function compactTimePartFromLocal(local: string): string {
  const m = /T(\d{2}):(\d{2})/.exec(local.trim());
  if (!m) return "";
  return `${m[1]}:${m[2]}`;
}

type DueDatetimeComboPickerProps = {
  id?: string;
  value: string;
  onChange: (local: string) => void;
  disabled?: boolean;
  className?: string;
  /** Видимая подпись над полем (как «pick date & time»). */
  label?: string;
  title?: string;
  "aria-label"?: string;
  /** Показать кнопку сброса (как очистка поля ввода). */
  clearable?: boolean;
  /**
   * `compact` — короткий текст даты/времени и без обрезки многоточием (для таблиц).
   */
  variant?: "default" | "compact";
  /**
   * `above` — подпись над полем (по умолчанию).
   * `inside` — подпись внутри рамки слева (ровная линия с кнопками-пилюлями в шапке наряда).
   */
  labelPlacement?: "above" | "inside";
  /**
   * Нижняя граница (`yyyy-mm-ddTHH:mm` в сетке 30 мин): не раньше занесения наряда в CRM.
   */
  minLocal?: string;
  /**
   * Для узкой полосы в шапке: у триггера нет `sm:min-w-[11rem]`, блок может сжиматься в одном flex-ряду.
   */
  fitRow?: boolean;
  /** Под сеткой дней календаря в выпадающем окне (например «В теч. дня»). */
  calendarFooter?: ReactNode;
  /**
   * Срок лабораторный — слоты из настроек организации и «в теч. дня» (чекбокс снаружи).
   * Остальные поля — полчасовая сетка по умолчанию.
   */
  timeGrid?: DueDatetimeTimeGrid;
  /** Для `timeGrid="labDue"`: список HH:mm из конфигурации (иначе — значения по умолчанию). */
  labHmSlots?: readonly string[] | null;
  /**
   * Компактный режим: подмена второй строки (время).
   * `undefined` — обычные часы; иначе показанная строка ("" — скрыть время).
   */
  compactTimeLabel?: string | null;
  /**
   * Активен фильтр списка по этой дате: ободок толще.
   */
  filterHighlight?: boolean;
  /**
   * Мягкий цвет ободка и фона: лабораторный срок vs запись.
   * По умолчанию нейтральный (как обычное поле).
   */
  tone?: DueDatetimeTone;
};

export type DueDatetimeTone = "neutral" | "lab" | "appointment";

function triggerSurfaceClass(
  tone: DueDatetimeTone,
  filterHighlight: boolean,
): string {
  const base =
    "rounded-md outline-none transition-[border-color,box-shadow,background-color]";
  if (tone === "lab") {
    return filterHighlight
      ? `${base} border-2 border-teal-600/50 bg-teal-500/[0.12] shadow-sm hover:border-teal-500/65 dark:border-teal-300/45 dark:bg-teal-400/[0.11]`
      : `${base} border border-teal-700/35 bg-teal-500/[0.08] shadow-sm hover:border-teal-600/50 dark:border-teal-400/30 dark:bg-teal-400/[0.08]`;
  }
  if (tone === "appointment") {
    return filterHighlight
      ? `${base} border-2 border-amber-600/50 bg-amber-500/[0.12] shadow-sm hover:border-amber-500/65 dark:border-amber-300/45 dark:bg-amber-400/[0.11]`
      : `${base} border border-amber-700/35 bg-amber-500/[0.08] shadow-sm hover:border-amber-600/50 dark:border-amber-400/30 dark:bg-amber-400/[0.08]`;
  }
  return filterHighlight
    ? `${base} border-2 border-sky-400 bg-[var(--card-bg)] shadow-[0_0_0_1px_rgba(56,189,248,0.45)] hover:border-sky-300 focus-visible:border-sky-300 focus-visible:ring-1 focus-visible:ring-sky-300 dark:border-sky-300 dark:shadow-[0_0_0_1px_rgba(125,211,252,0.4)]`
    : `${base} border border-[var(--input-border)] bg-[var(--card-bg)] shadow-sm hover:border-[var(--sidebar-blue)]/40 focus-visible:border-[var(--sidebar-blue)] focus-visible:ring-1 focus-visible:ring-[var(--sidebar-blue)]`;
}

export function DueDatetimeComboPicker({
  id,
  value,
  onChange,
  disabled,
  className,
  label,
  title,
  "aria-label": ariaLabel,
  clearable,
  variant = "default",
  labelPlacement = "above",
  minLocal,
  fitRow = false,
  calendarFooter,
  timeGrid = "halfHour",
  labHmSlots,
  compactTimeLabel,
  filterHighlight = false,
  tone = "neutral",
}: DueDatetimeComboPickerProps) {
  const genId = useId();
  const triggerId = id ?? genId;
  const listId = `${triggerId}-times`;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeListRef = useRef<HTMLDivElement>(null);
  const timeOptionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [pos, setPos] = useState({ top: 0, left: 0, width: 280, maxHeight: 420 });

  const timeOptions = useMemo(
    () =>
      timeGrid === "labDue"
        ? dueLabTimeOptions(labHmSlots)
        : dueHalfHourTimeOptions(),
    [timeGrid, labHmSlots],
  );

  const snapToGrid = useMemo(() => {
    if (timeGrid === "halfHour") return snapDatetimeLocalToDueGrid;
    return (local: string) =>
      snapDatetimeLocalToLabDueGrid(local, labHmSlots);
  }, [timeGrid, labHmSlots]);

  const minTrim = (minLocal ?? "").trim();

  const snappedValue = useMemo(
    () => (value.trim() ? snapToGrid(value) : ""),
    [value, snapToGrid],
  );

  const selectedDate: Date | null = useMemo(() => {
    if (!snappedValue) return null;
    const d = new Date(snappedValue);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [snappedValue]);

  const selectedHm = parseHmFromLocal(snappedValue);

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

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.max(r.width, 300);
    let left = r.left;
    const pad = 8;
    if (left + w > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - pad - w);
    }
    const popoverHeight = Math.min(420, window.innerHeight - pad * 2);
    const spaceBelow = window.innerHeight - r.bottom - pad;
    const spaceAbove = r.top - pad;
    const opensUp = spaceBelow < popoverHeight && spaceAbove > spaceBelow;
    const maxHeight = Math.max(240, Math.min(popoverHeight, opensUp ? spaceAbove : spaceBelow));
    setPos({
      top: opensUp
        ? Math.max(pad, r.top - maxHeight - 6)
        : Math.min(r.bottom + 6, window.innerHeight - pad - maxHeight),
      left,
      width: w,
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open || !selectedHm) return;
    const t = requestAnimationFrame(() => {
      const btn = timeOptionRefs.current.get(selectedHm);
      btn?.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(t);
  }, [open, selectedHm, viewYear, viewMonth]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const cells = useMemo(
    () => getCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const today = new Date();

  const defaultHm =
    timeGrid === "labDue"
      ? dueLabTimeOptions(labHmSlots)[0] ?? "09:00"
      : "12:00";

  const commit = useCallback(
    (local: string) => {
      let s = snapToGrid(local);
      if (minTrim && s && dueLocalIsBefore(s, minTrim)) {
        s = minTrim;
      }
      onChange(s);
    },
    [onChange, minTrim, snapToGrid],
  );

  useEffect(() => {
    if (!minTrim) return;
    const s = value.trim() ? snapToGrid(value) : "";
    if (!s || !dueLocalIsBefore(s, minTrim)) return;
    onChange(minTrim);
  }, [minTrim, value, onChange, snapToGrid]);

  const onPickDay = (date: Date) => {
    const hm = selectedHm ?? defaultHm;
    commit(combineDueLocalCalendarDayAndHm(date, hm));
  };

  const onPickTime = (hm: string) => {
    const base = selectedDate ?? new Date();
    commit(combineDueLocalCalendarDayAndHm(base, hm));
  };

  const dayPickDisabled = useCallback(
    (cellDate: Date) => {
      if (!minTrim) return false;
      const dayLatest =
        timeGrid === "labDue"
          ? dueLabDayLatestLocal(cellDate, labHmSlots)
          : dueGridDayLatestLocal(cellDate);
      return dueLocalIsBefore(dayLatest, minTrim);
    },
    [minTrim, timeGrid, labHmSlots],
  );

  const timePickDisabled = useCallback(
    (hm: string) => {
      if (!minTrim || !selectedDate) return false;
      const cand = snapToGrid(
        combineDueLocalCalendarDayAndHm(selectedDate, hm),
      );
      return Boolean(cand && dueLocalIsBefore(cand, minTrim));
    },
    [minTrim, selectedDate, snapToGrid],
  );

  const minCalendarYm = useMemo(() => {
    if (!minTrim) return null;
    const d = new Date(minTrim);
    if (Number.isNaN(d.getTime())) return null;
    return d.getFullYear() * 12 + d.getMonth();
  }, [minTrim]);

  const prevMonthDisabled =
    minCalendarYm != null && viewYear * 12 + viewMonth <= minCalendarYm;

  const goMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const compact = variant === "compact";
  const labelInside = Boolean(label) && labelPlacement === "inside";
  const showPlaceholder = !snappedValue;
  const datePart = snappedValue ? compactDatePartFromLocal(snappedValue) : "";
  const clockTimePart = snappedValue ? compactTimePartFromLocal(snappedValue) : "";
  const timePart =
    compactTimeLabel !== undefined ? (compactTimeLabel ?? "") : clockTimePart;
  const showTimeRow =
    showPlaceholder || compactTimeLabel === undefined || timePart.length > 0;
  const display = snappedValue
    ? compactTimeLabel !== undefined
      ? [datePart, timePart].filter(Boolean).join(" ")
      : formatDisplayRu(snappedValue)
    : "—";
  const fullDisplayForTitle = snappedValue
    ? compactTimeLabel !== undefined
      ? [datePart, timePart || (compactTimeLabel === "" ? "без времени" : "")].filter(Boolean).join(" ")
      : formatDisplayRu(snappedValue)
    : "";
  const combinedTitle = [
    title,
    fullDisplayForTitle && compact ? fullDisplayForTitle : "",
  ]
    .filter(Boolean)
    .join(" — ");

  const triggerSurface = triggerSurfaceClass(tone, filterHighlight);

  const dropdown = open ? (
    <div
      ref={popoverRef}
      data-due-datetime-combo-popover=""
      role="dialog"
      aria-label="Выбор даты и времени"
      className="fixed z-[9999] flex flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl sm:flex-row"
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
            disabled={prevMonthDisabled}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--sidebar-blue)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => goMonth(-1)}
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
            onClick={() => goMonth(1)}
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
            const pickDis = dayPickDisabled(cell.date);
            return (
              <button
                key={`${cell.date.toISOString()}-${idx}`}
                type="button"
                disabled={pickDis}
                onClick={() => {
                  if (!pickDis) onPickDay(cell.date);
                }}
                className={[
                  "flex h-8 items-center justify-center rounded-full text-xs tabular-nums",
                  pickDis
                    ? "cursor-not-allowed text-[var(--text-muted)]/35"
                    : !cell.inMonth
                      ? "text-[var(--text-muted)]/55 hover:bg-[var(--surface-hover)]"
                      : "text-[var(--app-text)] hover:bg-[var(--surface-hover)]",
                  isSel
                    ? "bg-[var(--sidebar-blue)] font-semibold text-white hover:bg-[var(--sidebar-blue-hover)]"
                    : "",
                  !isSel && isToday && cell.inMonth && !pickDis
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
        {calendarFooter ? (
          <div className="mt-2 border-t border-[var(--card-border)] pt-2">
            {calendarFooter}
          </div>
        ) : null}
      </div>
      <div className="flex w-full shrink-0 flex-col border-t border-[var(--card-border)] sm:w-[7.5rem] sm:border-t-0 sm:border-l">
        <div className="border-b border-[var(--card-border)] px-2 py-1.5 text-center text-xs font-semibold text-[var(--sidebar-blue)]">
          Время
        </div>
        <div
          ref={timeListRef}
          id={listId}
          className="max-h-48 overflow-y-auto overscroll-contain px-1 py-1 sm:max-h-[min(320px,calc(100vh-120px))]"
          role="listbox"
          aria-label="Время"
        >
          {timeOptions.map((hm) => {
            const active = selectedHm === hm;
            const tDis = timePickDisabled(hm);
            return (
              <button
                key={hm}
                type="button"
                role="option"
                aria-selected={active}
                disabled={tDis}
                ref={(el) => {
                  if (el) timeOptionRefs.current.set(hm, el);
                  else timeOptionRefs.current.delete(hm);
                }}
                onClick={() => {
                  if (!tDis) onPickTime(hm);
                }}
                className={[
                  "mb-0.5 w-full rounded-md px-2 py-1.5 text-center text-sm tabular-nums",
                  tDis
                    ? "cursor-not-allowed text-[var(--text-muted)]/40"
                    : active
                      ? "bg-[var(--sidebar-blue)] font-medium text-white"
                      : "text-[var(--app-text)] hover:bg-[var(--surface-hover)]",
                ].join(" ")}
              >
                {hm}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  ) : null;

  const openToggle = () => {
    if (disabled) return;
    setOpen((o) => !o);
  };

  return (
    <div
      className={[
        "flex min-w-0 flex-col",
        label && labelPlacement === "above" ? "gap-1" : "gap-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label && labelPlacement === "above" ? (
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </span>
      ) : null}
      {compact ? (
        <div
          ref={anchorRef}
          className="inline-flex w-full max-w-full flex-nowrap items-stretch gap-0.5"
        >
          {labelInside ? (
            <span className="flex h-8 max-w-[4.75rem] shrink-0 items-center justify-center rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-1 py-0.5 text-center text-[8px] font-bold uppercase leading-tight tracking-wide text-[var(--text-muted)] sm:h-9 sm:max-w-[5.5rem] sm:px-1.5 sm:text-[8.5px]">
              {label}
            </span>
          ) : null}
          <button
            type="button"
            id={triggerId}
            disabled={disabled}
            title={combinedTitle || title}
            aria-label={ariaLabel ?? "Дата и время сдачи"}
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={openToggle}
            className={[
              "flex min-h-[2.35rem] min-w-0 flex-1 items-center justify-center gap-0.5 px-0.5 py-0.5 text-center text-[10px] tabular-nums sm:min-h-[2.4rem] sm:px-1 sm:text-[11px]",
              triggerSurface,
              disabled ? "cursor-not-allowed" : "cursor-pointer",
              showPlaceholder ? "text-[var(--text-placeholder)]" : "text-[var(--app-text)]",
            ].join(" ")}
          >
            <span className="flex min-w-0 flex-1 flex-col items-center justify-center gap-px leading-tight">
              <span className="whitespace-nowrap">
                {showPlaceholder ? "Дата" : datePart}
              </span>
              {showTimeRow ? (
                <span className="whitespace-nowrap text-[var(--text-secondary)]">
                  {showPlaceholder ? "Время" : timePart}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-[var(--text-muted)]" aria-hidden>
              {open ? "▴" : "▾"}
            </span>
          </button>
          {clearable && snappedValue && !disabled ? (
            <button
              type="button"
              className="flex h-8 w-6 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)] sm:h-9"
              aria-label="Очистить дату и время"
              onClick={(e) => {
                e.preventDefault();
                onChange("");
                setOpen(false);
              }}
            >
              ×
            </button>
          ) : null}
        </div>
      ) : (
        <div
          ref={anchorRef}
          className={[
            "flex h-10 w-full min-w-0 max-w-full items-stretch gap-0 overflow-hidden rounded-lg border border-[var(--input-border)] bg-[var(--card-bg)] text-base shadow-sm transition-[border-color,box-shadow] focus-within:border-[var(--sidebar-blue)] focus-within:ring-1 focus-within:ring-[var(--sidebar-blue)] sm:text-sm",
            fitRow ? "" : "sm:min-w-[11rem]",
            "hover:border-[var(--sidebar-blue)]/40",
            disabled ? "cursor-not-allowed opacity-60" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {labelInside ? (
            <span className="flex max-w-[5.5rem] shrink-0 flex-col justify-center border-r border-[var(--input-border)] bg-[var(--surface-subtle)] px-2 py-0.5 text-center text-[8px] font-bold uppercase leading-tight tracking-wide text-[var(--text-muted)] sm:max-w-[6.25rem] sm:text-[9px]">
              {label}
            </span>
          ) : null}
          <button
            type="button"
            id={triggerId}
            disabled={disabled}
            title={title}
            aria-label={ariaLabel ?? title}
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={openToggle}
            className={[
              "flex min-w-0 flex-1 items-center gap-2 rounded-none px-1.5 py-1 text-left outline-none",
              disabled ? "cursor-not-allowed" : "cursor-pointer",
              showPlaceholder ? "text-[var(--text-placeholder)]" : "text-[var(--app-text)]",
            ].join(" ")}
          >
            <span className="min-w-0 flex-1 truncate tabular-nums">
              {showPlaceholder ? "Выберите дату и время" : display}
            </span>
            <span className="shrink-0 text-[var(--text-muted)]" aria-hidden>
              {open ? "▴" : "▾"}
            </span>
          </button>
          {clearable && snappedValue && !disabled ? (
            <button
              type="button"
              className="mr-0.5 flex h-7 w-7 shrink-0 items-center justify-center self-center rounded text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]"
              aria-label="Очистить дату и время"
              onClick={(e) => {
                e.preventDefault();
                onChange("");
                setOpen(false);
              }}
            >
              ×
            </button>
          ) : null}
        </div>
      )}
      {typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  );
}
