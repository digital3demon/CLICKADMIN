import type { Prisma } from "@prisma/client";
import type { ParsedListTag } from "@/lib/order-list-tag-filter";
import {
  financeOfficeLabDueBeforeEndExclusive,
  financeOfficeLabDueInRange,
  financeOfficeActualEndExclusive,
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
  } = {},
): Prisma.OrderWhereInput {
  const parts: Prisma.OrderWhereInput[] = [
    { tenantId, archivedAt: null },
  ];
  const search = searchWhere(opts.search ?? "");
  if (Object.keys(search).length > 0) parts.push(search);

  const mode = opts.mode ?? null;
  const actualNotCalculatedOnly = opts.actualNotCalculatedOnly !== false;

  if (!opts.skipDueDateWindow && mode) {
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
