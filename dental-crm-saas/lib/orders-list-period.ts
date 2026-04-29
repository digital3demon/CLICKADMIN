import {
  addCalendarDaysYmd,
  moscowInclusiveRangeBoundsUtc,
  moscowTodayYmd,
  parseYmdOrNull,
} from "@/lib/shipments-date-range";

const MAX_RANGE_DAYS = 366;

function rangeDaySpanInclusive(fromYmd: string, toYmd: string): number {
  const [y1, m1, d1] = fromYmd.split("-").map(Number);
  const [y2, m2, d2] = toYmd.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/**
 * Период для списка заказов: дата создания наряда (createdAt) по календарю МСК.
 * Параметры URL `from` и `to` в формате YYYY-MM-DD; достаточно одного — второй совпадает с ним.
 */
export function ordersListCreatedAtPeriod(
  fromRaw: string | null | undefined,
  toRaw: string | null | undefined,
):
  | { mode: "none" }
  | { mode: "error"; message: string }
  | {
      mode: "range";
      start: Date;
      endExclusive: Date;
      fromYmd: string;
      toYmd: string;
    } {
  const fromRawTrim = fromRaw?.trim() ?? "";
  const toRawTrim = toRaw?.trim() ?? "";
  if (!fromRawTrim && !toRawTrim) return { mode: "none" };
  const from = parseYmdOrNull(fromRawTrim || undefined);
  const to = parseYmdOrNull(toRawTrim || undefined);
  if (fromRawTrim && !from) {
    return { mode: "error", message: "Неверная дата «с»." };
  }
  if (toRawTrim && !to) {
    return { mode: "error", message: "Неверная дата «по»." };
  }
  if (!from && !to) {
    return {
      mode: "error",
      message: "Укажите даты в формате ГГГГ-ММ-ДД.",
    };
  }
  const fromYmd = from ?? to!;
  const toYmd = to ?? from!;
  let a = fromYmd;
  let b = toYmd;
  if (a > b) {
    const t = a;
    a = b;
    b = t;
  }
  const span = rangeDaySpanInclusive(a, b);
  if (span > MAX_RANGE_DAYS) {
    return {
      mode: "error",
      message: `Максимальный период — ${MAX_RANGE_DAYS} дней. Сузьте диапазон.`,
    };
  }
  const { start, endExclusive } = moscowInclusiveRangeBoundsUtc(a, b);
  return { mode: "range", start, endExclusive, fromYmd: a, toYmd: b };
}

export function ordersListPeriodDefaultDraft(): { from: string; to: string } {
  const to = moscowTodayYmd();
  const from = addCalendarDaysYmd(to, -7);
  return { from, to };
}
