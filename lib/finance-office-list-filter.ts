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

/** @deprecated ФинОтдел больше не режет по этапу; оставлено для тестов/совместимости. */
export const FINANCE_OFFICE_EXCLUDED_LAB_STATUSES = [
  "TO_SCAN",
  "TO_EXECUTION",
  "APPROVAL",
  "TO_ADMINS",
] as const satisfies readonly LabWorkStatus[];

/** @deprecated см. FINANCE_OFFICE_EXCLUDED_LAB_STATUSES */
export const FINANCE_OFFICE_INCLUDED_LAB_STATUSES: LabWorkStatus[] =
  LAB_WORK_STATUS_ORDER.filter(
    (s) =>
      !(FINANCE_OFFICE_EXCLUDED_LAB_STATUSES as readonly string[]).includes(s),
  );

export type FinanceOfficeMode = "actual" | "period";

/**
 * Верхняя граница «Актуального» по лаб-сроку (dueDate):
 * как у отгрузок — до завтра 12:00 МСК дня после завтра.
 */
export function financeOfficeActualEndExclusive(): Date {
  return ordersShipmentActualEndExclusive();
}

/** Лаб-срок наряда (`Order.dueDate`). */
export function effectiveFinanceLabDueDate(order: {
  dueDate: Date | null;
}): Date | null {
  return order.dueDate ?? null;
}

/** @deprecated используйте effectiveFinanceLabDueDate */
export function effectiveFinanceRecordDate(order: {
  appointmentDate: Date | null;
  dueToAdminsAt: Date | null;
  dueDate: Date | null;
}): Date | null {
  return effectiveFinanceLabDueDate(order);
}

export function compareOrdersByEffectiveFinanceRecord(
  a: {
    dueDate: Date | null;
    orderNumber: string;
    id: string;
  },
  b: {
    dueDate: Date | null;
    orderNumber: string;
    id: string;
  },
): number {
  const ad = effectiveFinanceLabDueDate(a);
  const bd = effectiveFinanceLabDueDate(b);
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

/** @deprecated ФинОтдел не фильтрует по этапу. */
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

/** @deprecated ФинОтдел не фильтрует по этапу. */
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
 * Лаб-срок (dueDate) до endExclusive.
 * Без срока — наряд входит (как «открытый хвост» в Актуальном).
 */
export function financeOfficeLabDueBeforeEndExclusive(
  endExclusive: Date,
): Prisma.OrderWhereInput {
  return {
    OR: [{ dueDate: { lt: endExclusive } }, { dueDate: null }],
  };
}

/** Лаб-срок в [start, endExclusive); без срока — не входит. */
export function financeOfficeLabDueInRange(
  start: Date,
  endExclusive: Date,
): Prisma.OrderWhereInput {
  return {
    dueDate: { not: null, gte: start, lt: endExclusive },
  };
}

/**
 * Дата выставления счёта: `invoiceIssuedAt`, иначе дата файла счёта.
 * Без даты — не входит.
 */
export function financeOfficeInvoiceIssuedBeforeEndExclusive(
  endExclusive: Date,
): Prisma.OrderWhereInput {
  return {
    OR: [
      { invoiceIssuedAt: { not: null, lt: endExclusive } },
      {
        AND: [
          { invoiceIssuedAt: null },
          { invoiceAttachment: { is: { createdAt: { lt: endExclusive } } } },
        ],
      },
    ],
  };
}

export function financeOfficeInvoiceIssuedInRange(
  start: Date,
  endExclusive: Date,
): Prisma.OrderWhereInput {
  return {
    OR: [
      { invoiceIssuedAt: { not: null, gte: start, lt: endExclusive } },
      {
        AND: [
          { invoiceIssuedAt: null },
          {
            invoiceAttachment: {
              is: { createdAt: { gte: start, lt: endExclusive } },
            },
          },
        ],
      },
    ],
  };
}

export function financeOfficeInvoiceIssuedDateWhere(input: {
  fromYmd?: string | null;
  toYmd?: string | null;
}): Prisma.OrderWhereInput | null {
  const toYmd = input.toYmd?.trim() || null;
  if (!toYmd) return null;
  const { endExclusive } = moscowDayBoundsUtc(toYmd);
  const fromYmd = input.fromYmd?.trim() || null;
  if (fromYmd) {
    const { start } = moscowDayBoundsUtc(fromYmd);
    return financeOfficeInvoiceIssuedInRange(start, endExclusive);
  }
  return financeOfficeInvoiceIssuedBeforeEndExclusive(endExclusive);
}

/** @deprecated используйте financeOfficeLabDueBeforeEndExclusive */
export function financeOfficeRecordDateBeforeEndExclusive(
  endExclusive: Date,
): Prisma.OrderWhereInput {
  return financeOfficeLabDueBeforeEndExclusive(endExclusive);
}

/** @deprecated используйте financeOfficeLabDueInRange */
export function financeOfficeRecordDateInRange(
  start: Date,
  endExclusive: Date,
): Prisma.OrderWhereInput {
  return financeOfficeLabDueInRange(start, endExclusive);
}

/** @deprecated */
export function financeOfficeAppointmentBeforeEndExclusive(
  endExclusive: Date,
): Prisma.OrderWhereInput {
  return financeOfficeLabDueBeforeEndExclusive(endExclusive);
}

/** @deprecated */
export function financeOfficeAppointmentInRange(
  start: Date,
  endExclusive: Date,
): Prisma.OrderWhereInput {
  return financeOfficeLabDueInRange(start, endExclusive);
}

/**
 * Актуальное: непросчитанные, лаб-срок до завтра (включая прошлые и без срока).
 * За период: from опционален; to обязателен (календарный день МСК по dueDate).
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
        financeOfficeLabDueBeforeEndExclusive(financeOfficeActualEndExclusive()),
      ],
    };
  }

  const toYmd = input.toYmd?.trim() || null;
  if (!toYmd) return null;

  const { endExclusive } = moscowDayBoundsUtc(toYmd);
  const fromYmd = input.fromYmd?.trim() || null;
  if (fromYmd) {
    const { start } = moscowDayBoundsUtc(fromYmd);
    return financeOfficeLabDueInRange(start, endExclusive);
  }
  return financeOfficeLabDueBeforeEndExclusive(endExclusive);
}

/** Старые ссылки today/tomorrow → actual. Без tab → actual. */
export function parseFinanceOfficeMode(
  raw: string | null | undefined,
): FinanceOfficeMode {
  const t = raw?.trim();
  if (t === "period") return "period";
  return "actual";
}
