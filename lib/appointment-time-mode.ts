import {
  combineDueLocalCalendarDayAndHm,
  DUE_DAY_DEFAULT_HM,
  parseHmFromDueGridLocal,
} from "@/lib/order-due-datetime";

/** Время в БД при «времени приёма нет» — для фильтров как 08:00. */
export const APPOINTMENT_NO_RECEPTION_HM = "08:00";

/** Подпись вместо часов при «В теч. дня». */
export const APPOINTMENT_WHOLE_DAY_LABEL = "ВТЧД";

export type AppointmentTimeMode = "timed" | "wholeDay" | "noReception";

/**
 * Режим записи по флагу hasTime и HH:mm в локальной строке / ISO-моменте.
 * hasTime=true → часы; hasTime=false + 08:00 → нет времени; иначе → ВТЧД.
 */
export function resolveAppointmentTimeMode(
  hasTime: boolean,
  hm: string | null | undefined,
): AppointmentTimeMode {
  if (hasTime) return "timed";
  if (hm === APPOINTMENT_NO_RECEPTION_HM) return "noReception";
  return "wholeDay";
}

export function appointmentTimeModeFromLocal(
  hasTime: boolean,
  local: string | null | undefined,
): AppointmentTimeMode {
  return resolveAppointmentTimeMode(hasTime, parseHmFromDueGridLocal(local ?? ""));
}

/** Текст второй строки в компактном пикере / ячейке списка. */
export function appointmentCompactTimeLabel(
  mode: AppointmentTimeMode,
  clockHm: string,
): string {
  if (mode === "wholeDay") return APPOINTMENT_WHOLE_DAY_LABEL;
  if (mode === "noReception") return "";
  return clockHm;
}

/** Подставить HH:mm в локальную дату `yyyy-mm-ddTHH:mm`, сохранив день. */
export function replaceAppointmentLocalHm(
  local: string,
  hm: string,
): string {
  const t = local.trim();
  if (!t) return "";
  const dayPart = t.includes("T") ? t.slice(0, t.indexOf("T")) : t.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayPart)) return t;
  const [ys, ms, ds] = dayPart.split("-");
  const d = new Date(
    Number(ys),
    Number(ms) - 1,
    Number(ds),
    12,
    0,
    0,
    0,
  );
  return combineDueLocalCalendarDayAndHm(d, hm);
}

export function appointmentHmForMode(mode: AppointmentTimeMode): string | null {
  if (mode === "wholeDay") return DUE_DAY_DEFAULT_HM;
  if (mode === "noReception") return APPOINTMENT_NO_RECEPTION_HM;
  return null;
}

/** dueToAdminsHasTime для API: только «точные часы». */
export function appointmentHasTimeFlag(mode: AppointmentTimeMode): boolean {
  return mode === "timed";
}
