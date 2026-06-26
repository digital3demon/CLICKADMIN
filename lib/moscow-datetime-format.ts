const TZ = "Europe/Moscow";

function moscowParts(
  date: Date,
  opts: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: TZ, ...opts }).formatToParts(
    date,
  );
}

function partValue(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

/** `дд.мм.гггг, чч:мм` по календарю Москвы. */
export function formatMoscowDateTime(date: Date): string {
  const parts = moscowParts(date, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const day = partValue(parts, "day");
  const month = partValue(parts, "month");
  const year = partValue(parts, "year");
  const hour = partValue(parts, "hour");
  const minute = partValue(parts, "minute");
  return `${day}.${month}.${year}, ${hour}:${minute}`;
}

/** `дд.мм.гггг` по календарю Москвы. */
export function formatMoscowDate(date: Date): string {
  const parts = moscowParts(date, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${partValue(parts, "day")}.${partValue(parts, "month")}.${partValue(parts, "year")}`;
}

/** `HH:mm` по календарю Москвы. */
export function formatMoscowTime(date: Date): string {
  const parts = moscowParts(date, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${partValue(parts, "hour")}:${partValue(parts, "minute")}`;
}
