/** Парсинг периода для отчётов: `from` / `to` в формате ISO date (YYYY-MM-DD). */
export function parseAnalyticsRange(sp: URLSearchParams): {
  from: Date;
  to: Date;
} | { error: string } {
  const fromStr = sp.get("from")?.trim();
  const toStr = sp.get("to")?.trim();
  if (!fromStr || !toStr) {
    return { error: "Укажите параметры from и to (YYYY-MM-DD)" };
  }
  const from = new Date(`${fromStr}T00:00:00.000`);
  const to = new Date(`${toStr}T23:59:59.999`);
  if (Number.isNaN(+from) || Number.isNaN(+to)) {
    return { error: "Неверный формат даты" };
  }
  if (from > to) {
    return { error: "Дата «с» позже даты «по»" };
  }
  return { from, to };
}

export function defaultAnalyticsRange(): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
