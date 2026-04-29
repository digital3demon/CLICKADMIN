const MIN_TOTAL = 8 * 60;
const MAX_TOTAL = 23 * 60 + 30;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function snapTotalMinutes(totalMin: number): number {
  let rounded = Math.round(totalMin / 30) * 30;
  if (rounded < MIN_TOTAL) rounded = MIN_TOTAL;
  if (rounded > MAX_TOTAL) rounded = MAX_TOTAL;
  return rounded;
}

function formatHm(totalMin: number): string {
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Слоты времени для срока сдачи: 08:00–23:30 с шагом 30 мин (локально). */
export function dueHalfHourTimeOptions(): string[] {
  const out: string[] = [];
  for (let t = MIN_TOTAL; t <= MAX_TOTAL; t += 30) {
    out.push(formatHm(t));
  }
  return out;
}

/**
 * Нормализует строку `yyyy-mm-ddTHH:mm`: только :00 и :30, время 08:00–23:30 (локально).
 */
export function snapDatetimeLocalToDueGrid(local: string): string {
  const t = local.trim();
  if (!t) return "";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const date = `${y}-${mo}-${day}`;
  const total = d.getHours() * 60 + d.getMinutes();
  const snapped = snapTotalMinutes(total);
  return `${date}T${formatHm(snapped)}`;
}

/** Отображение «Сдачи» в МСК, время — только слоты :00 / :30 (8:00–23:30). */
export function formatDueDateTimeRuMskHalfHour(d: Date): string {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const num = (type: Intl.DateTimeFormatPartTypes) => {
    const v = parts.find((p) => p.type === type)?.value ?? "0";
    const n = parseInt(v.replace(/\D/g, ""), 10);
    return Number.isNaN(n) ? 0 : n;
  };
  const day = String(num("day")).padStart(2, "0");
  const month = String(num("month")).padStart(2, "0");
  const year = String(num("year"));
  const ih = num("hour");
  const im = num("minute");
  const snapped = snapTotalMinutes(ih * 60 + im);
  const hh = String(Math.floor(snapped / 60)).padStart(2, "0");
  const mm = String(snapped % 60).padStart(2, "0");
  return `${day}.${month}.${year}, ${hh}:${mm}`;
}

/**
 * Ближайший слот сетки 30 мин (08:00–23:30 локально) не раньше момента занесения наряда в CRM.
 * Используется как нижняя граница для «Срок лабораторный» и «Дата приёма пациента».
 */
export function earliestDueGridLocalFromCreatedAt(createdIso: string): string {
  const d = new Date(createdIso);
  if (Number.isNaN(d.getTime())) {
    const n = new Date();
    return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}T08:00`;
  }
  let y = d.getFullYear();
  let mo = d.getMonth();
  let da = d.getDate();
  const total = d.getHours() * 60 + d.getMinutes();
  let ceiled = Math.ceil(total / 30) * 30;
  if (ceiled > MAX_TOTAL) {
    const next = new Date(y, mo, da + 1);
    y = next.getFullYear();
    mo = next.getMonth();
    da = next.getDate();
    ceiled = MIN_TOTAL;
  } else if (ceiled < MIN_TOTAL) {
    ceiled = MIN_TOTAL;
  }
  const hh = Math.floor(ceiled / 60);
  const mm = ceiled % 60;
  return `${y}-${pad2(mo + 1)}-${pad2(da)}T${pad2(hh)}:${pad2(mm)}`;
}

/** Сравнение строк `yyyy-mm-ddTHH:mm` (одинаковый формат после snap). */
export function dueLocalIsBefore(a: string, b: string): boolean {
  const x = a.trim();
  const y = b.trim();
  if (!x || !y) return false;
  return x < y;
}

/** Ограничить значение срока снизу (обе строки уже в сетке полчаса). */
export function clampDueLocalToMin(local: string, minLocal: string): string {
  const s = local.trim();
  const m = minLocal.trim();
  if (!s) return "";
  if (!m) return s;
  return dueLocalIsBefore(s, m) ? m : s;
}

/** `yyyy-mm-ddTHH:mm` для календарного дня `d` и слота `HH:mm` (локально). */
export function combineDueLocalCalendarDayAndHm(d: Date, hm: string): string {
  const y = d.getFullYear();
  const mo = pad2(d.getMonth() + 1);
  const da = pad2(d.getDate());
  return `${y}-${mo}-${da}T${hm}`;
}

/** Последний допустимый слот сетки на календарный день `d` (локально). */
export function dueGridDayLatestLocal(d: Date): string {
  return combineDueLocalCalendarDayAndHm(d, "23:30");
}

/**
 * `min` / `max` для `datetime-local` на выбранный календарный день (08:00–23:30 локально).
 * Ограничивает диапазон; в Chrome список минут в нативном попапе всё равно может быть полным.
 */
export function dueDatetimeLocalPickerBounds(currentLocal: string): {
  min?: string;
  max?: string;
} {
  const trimmed = currentLocal.trim();
  if (!trimmed) return {};
  const i = trimmed.indexOf("T");
  const datePart = i >= 0 ? trimmed.slice(0, i) : trimmed;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return {};
  return {
    min: `${datePart}T08:00`,
    max: `${datePart}T23:30`,
  };
}
