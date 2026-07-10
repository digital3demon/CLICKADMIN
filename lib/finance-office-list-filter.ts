import type { Prisma } from "@prisma/client";
import {
  LAB_WORK_STATUS_ORDER,
  type LabWorkStatus,
} from "@/lib/lab-work-status";
import {
  ordersShipmentActualEndExclusive,
  ordersShipmentAppointmentBeforeEndExclusive,
  ordersShipmentAppointmentInRange,
} from "@/lib/orders-shipment-list-filter";
import { moscowDayBoundsUtc } from "@/lib/shipments-date-range";

/** Этапы до «Производство» — в ФинОтделе не показываем. */
export const FINANCE_OFFICE_EXCLUDED_LAB_STATUSES = [
  "TO_SCAN",
  "TO_EXECUTION",
  "APPROVAL",
] as const satisfies readonly LabWorkStatus[];

/** «Производство» и все этапы правее. */
export const FINANCE_OFFICE_INCLUDED_LAB_STATUSES: LabWorkStatus[] =
  LAB_WORK_STATUS_ORDER.filter(
    (s) =>
      !(FINANCE_OFFICE_EXCLUDED_LAB_STATUSES as readonly string[]).includes(s),
  );

export type FinanceOfficeMode = "actual" | "period";

/** Верхняя граница «Актуального»: окно завтра по дате записи (как отгрузки). */
export function financeOfficeActualEndExclusive(): Date {
  return ordersShipmentActualEndExclusive();
}

export function financeOfficeProductionAndLaterWhere(): Prisma.OrderWhereInput {
  return {
    labWorkStatus: { in: [...FINANCE_OFFICE_INCLUDED_LAB_STATUSES] },
  };
}

/** Дата записи (appointmentDate ?? dueToAdminsAt) до endExclusive. */
export function financeOfficeAppointmentBeforeEndExclusive(
  endExclusive: Date,
): Prisma.OrderWhereInput {
  return ordersShipmentAppointmentBeforeEndExclusive(endExclusive);
}

export function financeOfficeAppointmentInRange(
  start: Date,
  endExclusive: Date,
): Prisma.OrderWhereInput {
  return ordersShipmentAppointmentInRange(start, endExclusive);
}

/**
 * Актуальное: непросчитанные, дата записи до завтра (включая прошлые).
 * За период: from опционален; to обязателен (календарный день МСК) — по дате записи.
 */
export function financeOfficeModeDateWhere(input: {
  mode: FinanceOfficeMode;
  fromYmd?: string | null;
  toYmd?: string | null;
}): Prisma.OrderWhereInput | null {
  if (input.mode === "actual") {
    return {
      AND: [
        { financeCalculated: false },
        financeOfficeAppointmentBeforeEndExclusive(
          financeOfficeActualEndExclusive(),
        ),
      ],
    };
  }

  const toYmd = input.toYmd?.trim() || null;
  if (!toYmd) return null;

  const { endExclusive } = moscowDayBoundsUtc(toYmd);
  const fromYmd = input.fromYmd?.trim() || null;
  if (fromYmd) {
    const { start } = moscowDayBoundsUtc(fromYmd);
    return financeOfficeAppointmentInRange(start, endExclusive);
  }
  return financeOfficeAppointmentBeforeEndExclusive(endExclusive);
}

/** Старые ссылки today/tomorrow → actual. */
export function parseFinanceOfficeMode(
  raw: string | null | undefined,
): FinanceOfficeMode {
  const t = raw?.trim();
  if (t === "period") return "period";
  return "actual";
}
