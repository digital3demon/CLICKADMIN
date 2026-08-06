import type { Prisma } from "@prisma/client";
import {
  moscowDayBoundsUtc,
  moscowInclusiveRangeBoundsUtc,
  moscowActualAppointmentWindowYmd,
  moscowTodayYmd,
  moscowShipmentDayBoundsUtc,
  moscowTomorrowYmd,
} from "@/lib/shipments-date-range";
import type { OrdersShipmentMode } from "@/lib/orders-shipment-list-query";
import {
  appointmentTimeModeFromLocal,
  type AppointmentTimeMode,
} from "@/lib/appointment-time-mode";
import { isoToDatetimeLocal } from "@/lib/datetime-local";
import { formatMoscowTime } from "@/lib/moscow-datetime-format";

/** Эффективная дата записи: appointmentDate ?? dueToAdminsAt. */
export function effectiveAppointmentDate(order: {
  appointmentDate: Date | null;
  dueToAdminsAt: Date | null;
}): Date | null {
  return order.appointmentDate ?? order.dueToAdminsAt ?? null;
}

/** Календарный день записи по МСК (YYYY-MM-DD). */
export function moscowAppointmentYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Режим записи для сортировки/отображения (как в ячейке списка).
 * dueToAdminsHasTime !== false → точные часы (null в БД = timed).
 */
export function appointmentSortMode(order: {
  appointmentDate: Date | null;
  dueToAdminsAt: Date | null;
  dueToAdminsHasTime?: boolean | null;
}): AppointmentTimeMode | null {
  const d = effectiveAppointmentDate(order);
  if (!d) return null;
  const local = isoToDatetimeLocal(d.toISOString());
  return appointmentTimeModeFromLocal(
    order.dueToAdminsHasTime !== false,
    local,
  );
}

/** timed → wholeDay → noReception */
function appointmentModeSortRank(mode: AppointmentTimeMode): number {
  if (mode === "timed") return 0;
  if (mode === "wholeDay") return 1;
  return 2;
}

/**
 * Сортировка списка «по записи»:
 * день МСК ↑ → точное время ↑ → «В теч. дня» → «времени приёма нет».
 * Без даты записи — в начале (хвост «Актуального»).
 */
export function compareOrdersByEffectiveAppointment(
  a: {
    appointmentDate: Date | null;
    dueToAdminsAt: Date | null;
    dueToAdminsHasTime?: boolean | null;
    orderNumber: string;
    id: string;
  },
  b: {
    appointmentDate: Date | null;
    dueToAdminsAt: Date | null;
    dueToAdminsHasTime?: boolean | null;
    orderNumber: string;
    id: string;
  },
): number {
  const ad = effectiveAppointmentDate(a);
  const bd = effectiveAppointmentDate(b);
  if (!ad && !bd) {
    return a.orderNumber.localeCompare(b.orderNumber, "ru") || a.id.localeCompare(b.id);
  }
  if (!ad) return -1;
  if (!bd) return 1;

  const ymdA = moscowAppointmentYmd(ad);
  const ymdB = moscowAppointmentYmd(bd);
  if (ymdA !== ymdB) return ymdA.localeCompare(ymdB);

  const modeA = appointmentSortMode(a)!;
  const modeB = appointmentSortMode(b)!;
  const rankDiff = appointmentModeSortRank(modeA) - appointmentModeSortRank(modeB);
  if (rankDiff !== 0) return rankDiff;

  if (modeA === "timed" && modeB === "timed") {
    const hmDiff = formatMoscowTime(ad).localeCompare(formatMoscowTime(bd));
    if (hmDiff !== 0) return hmDiff;
  }

  return a.orderNumber.localeCompare(b.orderNumber, "ru") || a.id.localeCompare(b.id);
}

/**
 * Верхняя граница «Актуального» ФинОтдела / лаб-срока: завтра до 12:00 дня после завтра (МСК).
 * Не путать с окном даты записи на списке заказов (`ordersShipmentActualAppointmentRange`).
 */
export function ordersShipmentActualEndExclusive(): Date {
  return moscowShipmentDayBoundsUtc(moscowTomorrowYmd()).endExclusive;
}

/** Окно «Актуальное» по дате записи: сегодня … сегодня+2 рабочих дня (МСК). */
export function ordersShipmentActualAppointmentRange(
  todayYmd: string = moscowTodayYmd(),
): { startYmd: string; endYmd: string; start: Date; endExclusive: Date } {
  const { startYmd, endYmd } = moscowActualAppointmentWindowYmd(todayYmd);
  const { start, endExclusive } = moscowInclusiveRangeBoundsUtc(startYmd, endYmd);
  return { startYmd, endYmd, start, endExclusive };
}

function appointmentBeforeEndExclusive(endExclusive: Date): Prisma.OrderWhereInput {
  return {
    OR: [
      {
        AND: [
          { appointmentDate: { not: null } },
          { appointmentDate: { lt: endExclusive } },
        ],
      },
      {
        AND: [
          { appointmentDate: null },
          { dueToAdminsAt: { not: null } },
          { dueToAdminsAt: { lt: endExclusive } },
        ],
      },
      {
        AND: [{ appointmentDate: null }, { dueToAdminsAt: null }],
      },
    ],
  };
}

function appointmentInRange(
  start: Date,
  endExclusive: Date,
): Prisma.OrderWhereInput {
  return {
    OR: [
      {
        AND: [
          { appointmentDate: { not: null } },
          { appointmentDate: { gte: start, lt: endExclusive } },
        ],
      },
      {
        AND: [
          { appointmentDate: null },
          { dueToAdminsAt: { not: null } },
          { dueToAdminsAt: { gte: start, lt: endExclusive } },
        ],
      },
    ],
  };
}

/** Актуальное по записи: в окне сегодня…+2 раб. дня ИЛИ без даты записи. */
function appointmentInActualWindowOrEmpty(
  start: Date,
  endExclusive: Date,
): Prisma.OrderWhereInput {
  return {
    OR: [
      appointmentInRange(start, endExclusive),
      {
        AND: [{ appointmentDate: null }, { dueToAdminsAt: null }],
      },
    ],
  };
}

/** Дата записи до endExclusive (appointmentDate ?? dueToAdminsAt; без даты — входит). */
export function ordersShipmentAppointmentBeforeEndExclusive(
  endExclusive: Date,
): Prisma.OrderWhereInput {
  return appointmentBeforeEndExclusive(endExclusive);
}

/** Дата записи в [start, endExclusive). */
export function ordersShipmentAppointmentInRange(
  start: Date,
  endExclusive: Date,
): Prisma.OrderWhereInput {
  return appointmentInRange(start, endExclusive);
}

/** Проверка попадания наряда в окно «Актуальное» по дате записи. */
export function orderMatchesShipmentActualAppointment(
  order: {
    appointmentDate: Date | null;
    dueToAdminsAt: Date | null;
  },
  start: Date,
  endExclusive: Date,
): boolean {
  const eff = effectiveAppointmentDate(order);
  if (!eff) return true;
  const t = eff.getTime();
  return t >= start.getTime() && t < endExclusive.getTime();
}

/** Проверка попадания наряда в период записи [start, endExclusive). */
export function orderMatchesShipmentPeriodAppointment(
  order: {
    appointmentDate: Date | null;
    dueToAdminsAt: Date | null;
  },
  start: Date | null,
  endExclusive: Date,
): boolean {
  const eff = effectiveAppointmentDate(order);
  if (!eff) return false;
  if (start && eff.getTime() < start.getTime()) return false;
  return eff.getTime() < endExclusive.getTime();
}

/** WHERE для режима записи на списке заказов (только неотгруженные). */
export function ordersShipmentListWhere(input: {
  mode: OrdersShipmentMode;
  shipFrom: string | null;
  shipTo: string | null;
}): Prisma.OrderWhereInput {
  const base: Prisma.OrderWhereInput = { adminShippedOtpr: false };

  if (input.mode === "actual") {
    const { start, endExclusive } = ordersShipmentActualAppointmentRange();
    return {
      AND: [base, appointmentInActualWindowOrEmpty(start, endExclusive)],
    };
  }

  const { endExclusive } = moscowDayBoundsUtc(input.shipTo!);
  if (input.shipFrom) {
    const { start } = moscowDayBoundsUtc(input.shipFrom);
    return { AND: [base, appointmentInRange(start, endExclusive)] };
  }

  return {
    AND: [base, appointmentBeforeEndExclusive(endExclusive)],
  };
}
