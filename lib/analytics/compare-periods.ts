import { analyticsYmdRange, toYmd } from "@/lib/analytics/range";

export const MAX_COMPARE_PERIODS = 6;

export const COMPARE_PERIOD_COLORS = [
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
  "#f43f5e",
  "#10b981",
  "#64748b",
] as const;

export type ComparePeriodSlot = {
  id: string;
  from: string;
  to: string;
  year: number;
  month: number;
};

export function formatYmdRu(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return ymd;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** «01.08–31.08.2026» или «15.12.2025 – 14.01.2026». */
export function formatPeriodLabelRu(from: string, to: string): string {
  if (from === to) return formatYmdRu(from);
  const a = formatYmdRu(from);
  const b = formatYmdRu(to);
  if (from.slice(0, 4) === to.slice(0, 4)) {
    return `${a.slice(0, 5)}–${b}`;
  }
  return `${a} – ${b}`;
}

export function monthTitleRu(year: number, month: number): string {
  const d = new Date(Date.UTC(year, Math.max(0, Math.min(11, month - 1)), 1));
  const name = d.toLocaleString("ru-RU", { month: "long" });
  return `${name} ${year}`;
}

export function prevCalendarMonth(
  year: number,
  month: number,
): { year: number; month: number } {
  if (month <= 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

/** То же число календарных дней, сдвиг назад сразу перед `from`. */
export function shiftYmdRangeBack(
  from: string,
  to: string,
): { from: string; to: string } | null {
  const range = analyticsYmdRange(from, to);
  if (!range) return null;
  const spanMs = range.to.getTime() - range.from.getTime();
  const newTo = new Date(range.from.getTime() - 1);
  const newFrom = new Date(newTo.getTime() - spanMs);
  return { from: toYmd(newFrom), to: toYmd(newTo) };
}

export function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function newCompareSlotId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
