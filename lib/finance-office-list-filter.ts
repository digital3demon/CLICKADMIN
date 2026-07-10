import type { Prisma } from "@prisma/client";
import {
  LAB_WORK_STATUS_LABELS,
  LAB_WORK_STATUS_ORDER,
  normalizeLegacyLabWorkStatus,
  type LabWorkStatus,
} from "@/lib/lab-work-status";
import { labWorkStatusFromColumnTitle } from "@/lib/order-status-display";
import { ordersShipmentActualEndExclusive } from "@/lib/orders-shipment-list-filter";
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

/** Эффективная дата для ФинОтдела: запись → сдача админам → срок лаборатории. */
export function effectiveFinanceRecordDate(order: {
  appointmentDate: Date | null;
  dueToAdminsAt: Date | null;
  dueDate: Date | null;
}): Date | null {
  return order.appointmentDate ?? order.dueToAdminsAt ?? order.dueDate ?? null;
}

export function compareOrdersByEffectiveFinanceRecord(
  a: {
    appointmentDate: Date | null;
    dueToAdminsAt: Date | null;
    dueDate: Date | null;
    orderNumber: string;
    id: string;
  },
  b: {
    appointmentDate: Date | null;
    dueToAdminsAt: Date | null;
    dueDate: Date | null;
    orderNumber: string;
    id: string;
  },
): number {
  const ad = effectiveFinanceRecordDate(a);
  const bd = effectiveFinanceRecordDate(b);
  if (!ad && !bd) {
    return a.orderNumber.localeCompare(b.orderNumber, "ru") || a.id.localeCompare(b.id);
  }
  if (!ad) return -1;
  if (!bd) return 1;
  const diff = ad.getTime() - bd.getTime();
  if (diff !== 0) return diff;
  return a.orderNumber.localeCompare(b.orderNumber, "ru") || a.id.localeCompare(b.id);
}

/** Этап для отбора: колонка Kaiten важнее устаревшего labWorkStatus в БД. */
export function effectiveFinanceLabWorkStatus(order: {
  labWorkStatus: string;
  kaitenColumnTitle: string | null;
}): LabWorkStatus {
  return (
    labWorkStatusFromColumnTitle(order.kaitenColumnTitle) ??
    normalizeLegacyLabWorkStatus(order.labWorkStatus)
  );
}

export function orderMatchesFinanceOfficeProductionPlus(order: {
  labWorkStatus: string;
  kaitenColumnTitle: string | null;
}): boolean {
  const status = effectiveFinanceLabWorkStatus(order);
  return (FINANCE_OFFICE_INCLUDED_LAB_STATUSES as readonly string[]).includes(
    status,
  );
}

const FINANCE_KAITEN_COLUMN_TITLES = FINANCE_OFFICE_INCLUDED_LAB_STATUSES.map(
  (s) => LAB_WORK_STATUS_LABELS[s],
);

export function financeOfficeProductionAndLaterWhere(): Prisma.OrderWhereInput {
  return {
    OR: [
      { labWorkStatus: { in: [...FINANCE_OFFICE_INCLUDED_LAB_STATUSES] } },
      ...FINANCE_KAITEN_COLUMN_TITLES.map((title) => ({
        kaitenColumnTitle: {
          contains: title,
          mode: "insensitive" as const,
        },
      })),
    ],
  };
}

/**
 * Дата записи (appointment → dueToAdmins → dueDate) до endExclusive.
 * Без дат — наряд входит (как в отгрузках).
 */
export function financeOfficeRecordDateBeforeEndExclusive(
  endExclusive: Date,
): Prisma.OrderWhereInput {
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
        AND: [
          { appointmentDate: null },
          { dueToAdminsAt: null },
          { dueDate: { not: null } },
          { dueDate: { lt: endExclusive } },
        ],
      },
      {
        AND: [
          { appointmentDate: null },
          { dueToAdminsAt: null },
          { dueDate: null },
        ],
      },
    ],
  };
}

export function financeOfficeRecordDateInRange(
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
      {
        AND: [
          { appointmentDate: null },
          { dueToAdminsAt: null },
          { dueDate: { not: null } },
          { dueDate: { gte: start, lt: endExclusive } },
        ],
      },
    ],
  };
}

/** @deprecated используйте financeOfficeRecordDateBeforeEndExclusive */
export function financeOfficeAppointmentBeforeEndExclusive(
  endExclusive: Date,
): Prisma.OrderWhereInput {
  return financeOfficeRecordDateBeforeEndExclusive(endExclusive);
}

/** @deprecated используйте financeOfficeRecordDateInRange */
export function financeOfficeAppointmentInRange(
  start: Date,
  endExclusive: Date,
): Prisma.OrderWhereInput {
  return financeOfficeRecordDateInRange(start, endExclusive);
}

/**
 * Актуальное: непросчитанные, дата записи до завтра (включая прошлые).
 * За период: from опционален; to обязателен (календарный день МСК).
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
        financeOfficeRecordDateBeforeEndExclusive(
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
    return financeOfficeRecordDateInRange(start, endExclusive);
  }
  return financeOfficeRecordDateBeforeEndExclusive(endExclusive);
}

/** Старые ссылки today/tomorrow → actual. */
export function parseFinanceOfficeMode(
  raw: string | null | undefined,
): FinanceOfficeMode {
  const t = raw?.trim();
  if (t === "period") return "period";
  return "actual";
}
