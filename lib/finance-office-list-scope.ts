import type { Prisma } from "@prisma/client";
import type { ParsedListTag } from "@/lib/order-list-tag-filter";
import {
  listTagWhere,
  orderAttentionListSupersetWhere,
  parseListTagParam,
} from "@/lib/order-list-tag-filter";
import {
  financeOfficeLabDueBeforeEndExclusive,
  financeOfficeLabDueInRange,
  financeOfficeActualEndExclusive,
  financeOfficeInvoiceIssuedDateWhere,
  type FinanceOfficeMode,
} from "@/lib/finance-office-list-filter";
import { ordersAppointmentDateWhere } from "@/lib/orders-shipment-list-filter";
import type { OrdersShipmentMode } from "@/lib/orders-shipment-list-query";
import { moscowDayBoundsUtc } from "@/lib/shipments-date-range";

export type FinanceOfficeAppointmentFilter = {
  mode: OrdersShipmentMode;
  shipFrom: string | null;
  shipTo: string | null;
};

export type FinanceOfficeInvoiceIssuedFilter = {
  fromYmd: string | null;
  toYmd: string;
};

function searchWhere(q: string): Prisma.OrderWhereInput {
  const contains = q.trim();
  if (!contains) return {};
  return {
    OR: [
      { orderNumber: { contains, mode: "insensitive" } },
      { patientName: { contains, mode: "insensitive" } },
    ],
  };
}

export function financeOfficeScopeWhere(
  tenantId: string,
  opts: {
    search?: string | null;
    mode?: FinanceOfficeMode | null;
    fromYmd?: string | null;
    toYmd?: string | null;
    /**
     * Не применять окно лаб-срока.
     * @deprecated теги больше не снимают окно периода — оставляем флаг для совместимости.
     */
    skipDueDateWindow?: boolean;
    /**
     * Режим actual по умолчанию только непросчитанные.
     * false — не добавлять financeCalculated:false (если тег сам задаёт просчёт / счётчики чипов).
     */
    actualNotCalculatedOnly?: boolean;
    /** Фильтр по дате записи перекрывает окно лаб-срока. */
    appointment?: FinanceOfficeAppointmentFilter | null;
    /** Фильтр по дате выставления счёта перекрывает лаб-срок и запись. */
    invoiceIssued?: FinanceOfficeInvoiceIssuedFilter | null;
  } = {},
): Prisma.OrderWhereInput {
  const parts: Prisma.OrderWhereInput[] = [
    { tenantId, archivedAt: null },
  ];
  const search = searchWhere(opts.search ?? "");
  if (Object.keys(search).length > 0) parts.push(search);

  const mode = opts.mode ?? null;
  const actualNotCalculatedOnly = opts.actualNotCalculatedOnly !== false;
  const appointment = opts.appointment ?? null;
  const invoiceIssued = opts.invoiceIssued ?? null;
  const invoiceWhere = invoiceIssued
    ? financeOfficeInvoiceIssuedDateWhere({
        fromYmd: invoiceIssued.fromYmd,
        toYmd: invoiceIssued.toYmd,
      })
    : null;

  if (invoiceWhere) {
    parts.push(invoiceWhere);
  } else if (appointment) {
    parts.push(ordersAppointmentDateWhere(appointment));
  } else if (!opts.skipDueDateWindow && mode) {
    if (mode === "actual") {
      parts.push(
        financeOfficeLabDueBeforeEndExclusive(financeOfficeActualEndExclusive()),
      );
      if (actualNotCalculatedOnly) {
        parts.push({ financeCalculated: false });
      }
    } else {
      const toYmd = opts.toYmd?.trim() || null;
      if (toYmd) {
        const { endExclusive } = moscowDayBoundsUtc(toYmd);
        const fromYmd = opts.fromYmd?.trim() || null;
        if (fromYmd) {
          const { start } = moscowDayBoundsUtc(fromYmd);
          parts.push(financeOfficeLabDueInRange(start, endExclusive));
        } else {
          parts.push(financeOfficeLabDueBeforeEndExclusive(endExclusive));
        }
      }
    }
  }

  return parts.length === 1 ? parts[0]! : { AND: parts };
}

/**
 * Теги больше не снимают окно лаб-срока: счётчики и список всегда в рамках
 * Актуального / За период.
 */
export function financeOfficeListTagSkipsDueDateWindow(
  _parsed: ParsedListTag | null | undefined,
): boolean {
  return false;
}

/** Теги, при которых список Актуального не режется до «только непросчитанные». */
export function financeOfficeTagOverridesCalculated(
  listTag: string | null | undefined,
): boolean {
  const parsed = listTag?.trim() ? parseListTagParam(listTag) : null;
  if (!parsed) return false;
  return (
    parsed.kind === "financeCalculated" ||
    parsed.kind === "financeNotCalculated" ||
    parsed.kind === "edo" ||
    parsed.kind === "noEdo" ||
    parsed.kind === "orderAttention" ||
    parsed.kind === "prostheticsPending" ||
    parsed.kind === "kaitenLabMention"
  );
}

/**
 * Scope пилюль ЭДО/корректировок/чата — как текущий список
 * (на Актуальном без тега = только непросчитанные).
 */
export function financeOfficeChipCountScopeWhere(
  tenantId: string,
  opts: {
    search?: string | null;
    mode?: FinanceOfficeMode | null;
    fromYmd?: string | null;
    toYmd?: string | null;
    listTag?: string | null;
    appointment?: FinanceOfficeAppointmentFilter | null;
    invoiceIssued?: FinanceOfficeInvoiceIssuedFilter | null;
  } = {},
): Prisma.OrderWhereInput {
  const parsed = opts.listTag?.trim()
    ? parseListTagParam(opts.listTag)
    : null;
  const parts: Prisma.OrderWhereInput[] = [
    financeOfficeScopeWhere(tenantId, {
      search: opts.search,
      mode: opts.mode ?? "actual",
      fromYmd: opts.fromYmd,
      toYmd: opts.toYmd,
      actualNotCalculatedOnly: !financeOfficeTagOverridesCalculated(
        opts.listTag,
      ),
      appointment: opts.appointment,
      invoiceIssued: opts.invoiceIssued,
    }),
  ];
  if (parsed && parsed.kind !== "edo" && parsed.kind !== "noEdo") {
    parts.push(
      parsed.kind === "orderAttention"
        ? orderAttentionListSupersetWhere()
        : listTagWhere(parsed),
    );
  }
  return parts.length === 1 ? parts[0]! : { AND: parts };
}

/** Окно лаб-срока без clamp «непросчитанные» — для пилюль Просчитано / Не просчитано. */
export function financeOfficeChipDueWindowScopeWhere(
  tenantId: string,
  opts: {
    search?: string | null;
    mode?: FinanceOfficeMode | null;
    fromYmd?: string | null;
    toYmd?: string | null;
    appointment?: FinanceOfficeAppointmentFilter | null;
    invoiceIssued?: FinanceOfficeInvoiceIssuedFilter | null;
  } = {},
): Prisma.OrderWhereInput {
  return financeOfficeScopeWhere(tenantId, {
    search: opts.search,
    mode: opts.mode ?? "actual",
    fromYmd: opts.fromYmd,
    toYmd: opts.toYmd,
    actualNotCalculatedOnly: false,
    appointment: opts.appointment,
    invoiceIssued: opts.invoiceIssued,
  });
}
