/** Канон CRM для datetime-local: Europe/Moscow (UTC+3, без DST с 2014). */
export const CRM_DATETIME_TZ = "Europe/Moscow";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function moscowPartsFromDate(d: Date): {
  y: number;
  m: number;
  day: number;
  h: number;
  min: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CRM_DATETIME_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "0";
  return {
    y: Number.parseInt(get("year"), 10),
    m: Number.parseInt(get("month"), 10),
    day: Number.parseInt(get("day"), 10),
    h: Number.parseInt(get("hour"), 10),
    min: Number.parseInt(get("minute"), 10),
  };
}

/**
 * Значение для `<input type="datetime-local">` из ISO.
 * Всегда Europe/Moscow — одинаково на SSR (часто UTC) и в браузере (MSK).
 */
export function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const { y, m, day, h, min } = moscowPartsFromDate(d);
  if (![y, m, day, h, min].every((n) => Number.isFinite(n))) return "";
  return `${y}-${pad2(m)}-${pad2(day)}T${pad2(h)}:${pad2(min)}`;
}

/**
 * ISO для API из значения `datetime-local` (стена Europe/Moscow); пустая строка → `null`.
 */
export function localDateTimeToIso(local: string): string | null {
  const t = local.trim();
  if (!t) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(t);
  if (!m) {
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const h = Number(m[4]);
  const min = Number(m[5]);
  // Moscow = UTC+3 year-round
  const d = new Date(Date.UTC(y, mo - 1, day, h - 3, min, 0, 0));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
