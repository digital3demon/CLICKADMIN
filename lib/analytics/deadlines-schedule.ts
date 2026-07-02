import {
  DEFAULT_PRODUCTION_CALENDAR_COUNTRY,
  normalizeProductionCalendarCountry,
  type ProductionCalendarCountry,
  type WorkingDayOptions,
} from "@/lib/production-calendar";
import {
  getProductionCalendarLocation,
  type ProductionCalendarLocation,
} from "@/lib/analytics/production-calendar-locations";

export const DEFAULT_DEADLINES_WEEKEND_DAYS = [0] as const;
export const DEFAULT_WORK_START_HM = "09:00";
export const DEFAULT_WORK_END_HM = "19:00";
export const DEFAULT_ADMIN_SLA_HOURS = 5;
export const DEADLINES_TOLERANCE_MINUTES = 30;

export type DeadlinesScheduleConfig = {
  timezone: string;
  country: ProductionCalendarCountry;
  regionId: string | null;
  workStartHm: string;
  workEndHm: string;
  weekendDays: number[];
  extraHolidaysMmDd: string[];
};

export function defaultDeadlinesSchedule(): DeadlinesScheduleConfig {
  return {
    timezone: "Europe/Moscow",
    country: DEFAULT_PRODUCTION_CALENDAR_COUNTRY,
    regionId: null,
    workStartHm: DEFAULT_WORK_START_HM,
    workEndHm: DEFAULT_WORK_END_HM,
    weekendDays: [...DEFAULT_DEADLINES_WEEKEND_DAYS],
    extraHolidaysMmDd: [],
  };
}

function parseHm(value: string | null | undefined, fallback: string): string {
  const t = String(value ?? "").trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return fallback;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min)) return fallback;
  if (h < 0 || h > 23 || min < 0 || min > 59) return fallback;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function parseWeekendDaysParam(raw: string | null | undefined): number[] {
  const t = String(raw ?? "").trim();
  if (!t) return [...DEFAULT_DEADLINES_WEEKEND_DAYS];
  const days = t
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return days.length > 0 ? Array.from(new Set(days)).sort() : [...DEFAULT_DEADLINES_WEEKEND_DAYS];
}

export function parseDeadlinesScheduleFromSearchParams(
  sp: URLSearchParams,
): DeadlinesScheduleConfig {
  const base = defaultDeadlinesSchedule();
  const country = normalizeProductionCalendarCountry(sp.get("country"));
  const regionId = sp.get("regionId")?.trim() || null;
  const location = regionId ? getProductionCalendarLocation(regionId) : null;
  const weekendDays = parseWeekendDaysParam(sp.get("weekendDays"));
  const workStartHm = parseHm(sp.get("workStart"), DEFAULT_WORK_START_HM);
  const workEndHm = parseHm(sp.get("workEnd"), DEFAULT_WORK_END_HM);

  return {
    timezone: location?.timezone ?? "Europe/Moscow",
    country: location?.country ?? country,
    regionId: location?.id ?? regionId,
    workStartHm,
    workEndHm,
    weekendDays,
    extraHolidaysMmDd: location?.extraHolidaysMmDd ?? [],
  };
}

export function parseAdminSlaHours(sp: URLSearchParams): number {
  const raw = Number(sp.get("slaHours"));
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_ADMIN_SLA_HOURS;
  return Math.min(72, Math.max(0.5, raw));
}

export function scheduleToWorkingDayOptions(
  schedule: DeadlinesScheduleConfig,
): WorkingDayOptions {
  return {
    country: schedule.country,
    weekendDays: schedule.weekendDays,
    extraHolidaysMmDd: schedule.extraHolidaysMmDd,
  };
}

export function scheduleQueryString(
  schedule: DeadlinesScheduleConfig,
  slaHours?: number,
): string {
  const p = new URLSearchParams();
  p.set("country", schedule.country);
  if (schedule.regionId) p.set("regionId", schedule.regionId);
  p.set("workStart", schedule.workStartHm);
  p.set("workEnd", schedule.workEndHm);
  p.set("weekendDays", schedule.weekendDays.join(","));
  if (slaHours != null) p.set("slaHours", String(slaHours));
  return p.toString();
}

export function locationLabel(location: ProductionCalendarLocation | null): string {
  if (!location) return "Россия (без региона)";
  return location.label;
}

export function formatDurationMinutesRu(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h <= 0) return `${min} мин`;
  if (min === 0) return `${h} ч`;
  return `${h} ч ${min} мин`;
}

function hmToMinutes(hm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Длина рабочего дня по настройкам «с / до» (минуты). */
export function workDayDurationMinutes(
  schedule: Pick<DeadlinesScheduleConfig, "workStartHm" | "workEndHm">,
): number {
  const duration = hmToMinutes(schedule.workEndHm) - hmToMinutes(schedule.workStartHm);
  return duration > 0 ? duration : 600;
}

/** Рабочие дни + часы (для сроков работ, сопоставимо с нормативом в днях). */
export function formatDurationDaysHoursRu(
  totalMinutes: number,
  minutesPerWorkDay: number,
): string {
  const dayLen = Math.max(60, Math.round(minutesPerWorkDay));
  const m = Math.max(0, Math.round(totalMinutes));
  const days = Math.floor(m / dayLen);
  const rem = m % dayLen;
  const hours = Math.floor(rem / 60);
  const min = rem % 60;

  if (days > 0) {
    if (hours <= 0) return `${days} дн.`;
    return `${days} дн. ${hours} ч`;
  }
  if (hours <= 0) return `${min} мин`;
  if (min === 0) return `${hours} ч`;
  return `${hours} ч ${min} мин`;
}
