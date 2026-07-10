import type { Prisma } from "@prisma/client";
import type { ParsedListTag } from "@/lib/order-list-tag-filter";
import {
  financeOfficeRecordDateBeforeEndExclusive,
  financeOfficeRecordDateInRange,
  financeOfficeActualEndExclusive,
  financeOfficeProductionAndLaterWhere,
  type FinanceOfficeMode,
} from "@/lib/finance-office-list-filter";
import { moscowDayBoundsUtc } from "@/lib/shipments-date-range";

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
    /** Не применять окно даты записи (теги корр/протетика/непросчитано). */
    skipDueDateWindow?: boolean;
    /**
     * Режим actual по умолчанию только непросчитанные.
     * false — не добавлять financeCalculated:false (если тег сам задаёт просчёт).
     */
    actualNotCalculatedOnly?: boolean;
  } = {},
): Prisma.OrderWhereInput {
  const parts: Prisma.OrderWhereInput[] = [
    { tenantId, archivedAt: null },
    financeOfficeProductionAndLaterWhere(),
  ];
  const search = searchWhere(opts.search ?? "");
  if (Object.keys(search).length > 0) parts.push(search);

  const mode = opts.mode ?? null;
  const actualNotCalculatedOnly = opts.actualNotCalculatedOnly !== false;

  if (!opts.skipDueDateWindow && mode) {
    if (mode === "actual") {
      parts.push(
        financeOfficeRecordDateBeforeEndExclusive(
          financeOfficeActualEndExclusive(),
        ),
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
          parts.push(financeOfficeRecordDateInRange(start, endExclusive));
        } else {
          parts.push(financeOfficeRecordDateBeforeEndExclusive(endExclusive));
        }
      }
    }
  }

  return parts.length === 1 ? parts[0]! : { AND: parts };
}

/** Корректировки, протетика и непросчитанные — без окна даты записи. ЧАТ — в рамках вкладки. */
export function financeOfficeListTagSkipsDueDateWindow(
  parsed: ParsedListTag | null | undefined,
): boolean {
  return (
    parsed?.kind === "orderAttention" ||
    parsed?.kind === "prostheticsPending" ||
    parsed?.kind === "financeNotCalculated"
  );
}
