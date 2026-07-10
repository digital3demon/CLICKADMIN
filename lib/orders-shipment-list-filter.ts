import type { Prisma } from "@prisma/client";
import {
  moscowDayBoundsUtc,
  moscowShipmentDayBoundsUtc,
  moscowTomorrowYmd,
} from "@/lib/shipments-date-range";
import type { OrdersShipmentMode } from "@/lib/orders-shipment-list-query";

/** Эффективная дата записи: appointmentDate ?? dueToAdminsAt. */
export function effectiveAppointmentDate(order: {
  appointmentDate: Date | null;
  dueToAdminsAt: Date | null;
}): Date | null {
  return order.appointmentDate ?? order.dueToAdminsAt ?? null;
}

export function compareOrdersByEffectiveAppointment(
  a: {
    appointmentDate: Date | null;
    dueToAdminsAt: Date | null;
    orderNumber: string;
    id: string;
  },
  b: {
    appointmentDate: Date | null;
    dueToAdminsAt: Date | null;
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
  const diff = ad.getTime() - bd.getTime();
  if (diff !== 0) return diff;
  return a.orderNumber.localeCompare(b.orderNumber, "ru") || a.id.localeCompare(b.id);
}

/** Верхняя граница «актуальных»: завтра до 12:00 дня после завтра (МСК). */
export function ordersShipmentActualEndExclusive(): Date {
  return moscowShipmentDayBoundsUtc(moscowTomorrowYmd()).endExclusive;
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

/** Проверка попадания наряда в верхнюю границу «актуальных» (для тестов и валидации). */
export function orderMatchesShipmentActualAppointment(
  order: {
    appointmentDate: Date | null;
    dueToAdminsAt: Date | null;
  },
  endExclusive: Date,
): boolean {
  const eff = effectiveAppointmentDate(order);
  if (!eff) return true;
  return eff.getTime() < endExclusive.getTime();
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

/** WHERE для режима отгрузок (только неотгруженные). */
export function ordersShipmentListWhere(input: {
  mode: OrdersShipmentMode;
  shipFrom: string | null;
  shipTo: string | null;
}): Prisma.OrderWhereInput {
  const base: Prisma.OrderWhereInput = { adminShippedOtpr: false };

  if (input.mode === "actual") {
    return {
      AND: [base, appointmentBeforeEndExclusive(ordersShipmentActualEndExclusive())],
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
