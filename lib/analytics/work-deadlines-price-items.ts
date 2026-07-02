import {
  classifyInstantWithTolerance,
  countWorkingMinutesBetween,
  workDeadlineEndAt,
} from "@/lib/analytics/business-time";
import {
  DEADLINES_TOLERANCE_MINUTES,
  type DeadlinesScheduleConfig,
} from "@/lib/analytics/deadlines-schedule";

export type WorkDeadlinesPriceItemRow = {
  priceListItemId: string;
  code: string;
  name: string;
  leadWorkingDays: number | null;
  orderCount: number;
  lineCount: number;
  averageDurationMinutes: number;
  withNormativeLineCount: number;
  early: number;
  onTime: number;
  late: number;
};

export type WorkDeadlinesPriceItemOrder = {
  id: string;
  createdAt: Date;
  handedAt: Date;
  constructions: Array<{
    priceListItemId: string | null;
    priceListItem: {
      id: string;
      code: string;
      name: string;
      leadWorkingDays: number | null;
    } | null;
  }>;
};

type WorkPriceItemAgg = {
  code: string;
  name: string;
  leadWorkingDays: number | null;
  orderIds: Set<string>;
  lineCount: number;
  durationSum: number;
  early: number;
  onTime: number;
  late: number;
  normativeLineCount: number;
};

function workActualMinutes(
  order: { createdAt: Date; handedAt: Date },
  schedule: DeadlinesScheduleConfig,
): number {
  return countWorkingMinutesBetween(order.createdAt, order.handedAt, schedule);
}

/** Макс. leadWorkingDays по всем позициям прайса в наряде (qty не умножает). */
export function maxLeadWorkingDaysInOrder(
  constructions: WorkDeadlinesPriceItemOrder["constructions"],
): number | null {
  let max: number | null = null;
  for (const line of constructions) {
    const lead = line.priceListItem?.leadWorkingDays;
    if (lead == null || !Number.isFinite(lead)) continue;
    const n = Math.max(0, Math.trunc(lead));
    if (max == null || n > max) max = n;
  }
  return max;
}

export function aggregateWorkDeadlinesByPriceItem(
  completed: WorkDeadlinesPriceItemOrder[],
  from: Date,
  to: Date,
  schedule: DeadlinesScheduleConfig,
): WorkDeadlinesPriceItemRow[] {
  const agg = new Map<string, WorkPriceItemAgg>();

  for (const order of completed) {
    if (order.createdAt < from || order.createdAt > to) continue;
    const minutes = workActualMinutes(order, schedule);
    const orderMaxLead = maxLeadWorkingDaysInOrder(order.constructions);

    for (const line of order.constructions) {
      const pl = line.priceListItem;
      const itemId = line.priceListItemId;
      if (!itemId || !pl) continue;

      const cur =
        agg.get(itemId) ??
        {
          code: pl.code,
          name: pl.name,
          leadWorkingDays: pl.leadWorkingDays,
          orderIds: new Set<string>(),
          lineCount: 0,
          durationSum: 0,
          early: 0,
          onTime: 0,
          late: 0,
          normativeLineCount: 0,
        };
      cur.orderIds.add(order.id);
      cur.lineCount += 1;
      cur.durationSum += minutes;

      const lead = pl.leadWorkingDays;
      if (lead != null && Number.isFinite(lead) && orderMaxLead != null) {
        cur.normativeLineCount += 1;
        const deadline = workDeadlineEndAt(
          order.createdAt,
          orderMaxLead,
          schedule,
        );
        if (deadline) {
          const bucket = classifyInstantWithTolerance(
            order.handedAt,
            deadline,
            DEADLINES_TOLERANCE_MINUTES,
          );
          cur[bucket] += 1;
        }
      }

      agg.set(itemId, cur);
    }
  }

  return [...agg.entries()]
    .map(([priceListItemId, v]) => ({
      priceListItemId,
      code: v.code,
      name: v.name,
      leadWorkingDays: v.leadWorkingDays,
      orderCount: v.orderIds.size,
      lineCount: v.lineCount,
      averageDurationMinutes:
        v.lineCount > 0 ? Math.round(v.durationSum / v.lineCount) : 0,
      withNormativeLineCount: v.normativeLineCount,
      early: v.early,
      onTime: v.onTime,
      late: v.late,
    }))
    .sort((a, b) => b.lineCount - a.lineCount || b.orderCount - a.orderCount);
}
