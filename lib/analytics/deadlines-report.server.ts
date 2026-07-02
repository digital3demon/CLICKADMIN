import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";
import {
  averageMinutes,
  classifyInstantWithTolerance,
  classifyWithToleranceMinutes,
  countWorkingMinutesBetween,
  workDeadlineEndAt,
  type DeadlineBucket,
} from "@/lib/analytics/business-time";
import {
  DEADLINES_TOLERANCE_MINUTES,
  type DeadlinesScheduleConfig,
} from "@/lib/analytics/deadlines-schedule";
import { findFirstHandedToAdminsAt } from "@/lib/analytics/order-handed-at";

const PRICE_LIST = "PRICE_LIST" as const;

export type DeadlineBucketCounts = {
  early: number;
  onTime: number;
  late: number;
  total: number;
};

export type AdminDeadlinesReport = {
  period: { from: string; to: string };
  schedule: DeadlinesScheduleConfig;
  slaHours: number;
  allTimeAverageMinutes: number;
  periodAverageMinutes: number;
  buckets: DeadlineBucketCounts;
  bucketPercents: { early: number; onTime: number; late: number };
};

export type WorkDeadlinesReport = {
  period: { from: string; to: string };
  schedule: DeadlinesScheduleConfig;
  allTimeAverageMinutes: number;
  periodAverageMinutes: number;
  completedAllTime: number;
  completedInPeriod: number;
  withNormative: DeadlineBucketCounts & {
    bucketPercents: { early: number; onTime: number; late: number };
    periodAverageMinutes: number;
  };
  withoutNormative: {
    count: number;
    periodAverageMinutes: number;
    allTimeAverageMinutes: number;
  };
};

function orderExclusionsWhere(): Prisma.OrderWhereInput {
  return {
    archivedAt: null,
    isTestOrder: false,
    status: { not: "CANCELLED" },
    correctionTrack: null,
  };
}

function bucketCounts(): DeadlineBucketCounts {
  return { early: 0, onTime: 0, late: 0, total: 0 };
}

function incBucket(counts: DeadlineBucketCounts, bucket: DeadlineBucket) {
  counts[bucket] += 1;
  counts.total += 1;
}

function bucketPercents(counts: DeadlineBucketCounts) {
  const t = counts.total || 1;
  return {
    early: Math.round((counts.early / t) * 1000) / 10,
    onTime: Math.round((counts.onTime / t) * 1000) / 10,
    late: Math.round((counts.late / t) * 1000) / 10,
  };
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type AdminOrderRow = {
  id: string;
  createdAt: Date;
  workReceivedAt: Date | null;
};

async function loadAdminOrders(): Promise<AdminOrderRow[]> {
  return (await getPrisma()).order.findMany({
    where: orderExclusionsWhere(),
    select: {
      id: true,
      createdAt: true,
      workReceivedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

function adminAdmissionAt(o: AdminOrderRow): Date {
  return o.workReceivedAt ?? o.createdAt;
}

function adminDurationMinutes(o: AdminOrderRow, schedule: DeadlinesScheduleConfig): number {
  const start = adminAdmissionAt(o);
  return countWorkingMinutesBetween(start, o.createdAt, schedule);
}

export async function loadAdminDeadlinesReport(
  from: Date,
  to: Date,
  schedule: DeadlinesScheduleConfig,
  slaHours: number,
): Promise<AdminDeadlinesReport> {
  const orders = await loadAdminOrders();
  const slaMinutes = slaHours * 60;
  const allDurations = orders.map((o) => adminDurationMinutes(o, schedule));
  const periodOrders = orders.filter((o) => {
    const at = adminAdmissionAt(o);
    return at >= from && at <= to;
  });
  const periodDurations = periodOrders.map((o) => adminDurationMinutes(o, schedule));
  const buckets = bucketCounts();
  for (const minutes of periodDurations) {
    incBucket(
      buckets,
      classifyWithToleranceMinutes(minutes, slaMinutes, DEADLINES_TOLERANCE_MINUTES),
    );
  }

  return {
    period: { from: ymd(from), to: ymd(to) },
    schedule,
    slaHours,
    allTimeAverageMinutes: averageMinutes(allDurations),
    periodAverageMinutes: averageMinutes(periodDurations),
    buckets,
    bucketPercents: bucketPercents(buckets),
  };
}

type WorkOrderRow = {
  id: string;
  createdAt: Date;
  labWorkStatus: string;
  updatedAt: Date;
  constructions: Array<{
    category: string;
    priceListItem: { leadWorkingDays: number | null } | null;
  }>;
};

async function loadWorkOrdersWithRevisions(): Promise<
  Array<WorkOrderRow & { handedAt: Date | null }>
> {
  const db = await getPrisma();
  const orders = await db.order.findMany({
    where: orderExclusionsWhere(),
    select: {
      id: true,
      createdAt: true,
      labWorkStatus: true,
      updatedAt: true,
      kaitenColumnTitle: true,
      kaitenSyncedAt: true,
      constructions: {
        where: { category: PRICE_LIST },
        select: {
          category: true,
          priceListItem: { select: { leadWorkingDays: true } },
        },
      },
      revisions: {
        orderBy: { createdAt: "asc" },
        select: { createdAt: true, snapshot: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return orders.map((o) => ({
    id: o.id,
    createdAt: o.createdAt,
    labWorkStatus: o.labWorkStatus,
    updatedAt: o.updatedAt,
    constructions: o.constructions,
    handedAt: findFirstHandedToAdminsAt(o.revisions, {
      labWorkStatus: o.labWorkStatus,
      kaitenColumnTitle: o.kaitenColumnTitle,
      updatedAt: o.updatedAt,
      kaitenSyncedAt: o.kaitenSyncedAt,
    }),
  }));
}

function maxLeadWorkingDays(order: WorkOrderRow): number | null {
  let max: number | null = null;
  for (const line of order.constructions) {
    const lead = line.priceListItem?.leadWorkingDays;
    if (lead == null || !Number.isFinite(lead)) continue;
    const n = Math.max(0, Math.trunc(lead));
    if (max == null || n > max) max = n;
  }
  return max;
}

function workActualMinutes(
  order: { createdAt: Date; handedAt: Date },
  schedule: DeadlinesScheduleConfig,
): number {
  return countWorkingMinutesBetween(order.createdAt, order.handedAt, schedule);
}

export async function loadWorkDeadlinesReport(
  from: Date,
  to: Date,
  schedule: DeadlinesScheduleConfig,
): Promise<WorkDeadlinesReport> {
  const rows = await loadWorkOrdersWithRevisions();
  const completed = rows.filter(
    (r): r is typeof r & { handedAt: Date } => r.handedAt != null,
  );

  const allDurations = completed.map((o) => workActualMinutes(o, schedule));
  const periodCompleted = completed.filter(
    (o) => o.createdAt >= from && o.createdAt <= to,
  );

  const withNormativeBuckets = bucketCounts();
  const withNormativeDurations: number[] = [];
  const withoutNormativeDurations: number[] = [];
  const allWithoutNormativeDurations: number[] = [];
  let withoutNormativeCount = 0;

  for (const o of completed) {
    const lead = maxLeadWorkingDays(o);
    const minutes = workActualMinutes(o, schedule);
    if (lead == null) {
      allWithoutNormativeDurations.push(minutes);
      if (o.createdAt >= from && o.createdAt <= to) {
        withoutNormativeCount += 1;
        withoutNormativeDurations.push(minutes);
      }
      continue;
    }
    if (o.createdAt >= from && o.createdAt <= to) {
      withNormativeDurations.push(minutes);
      const deadline = workDeadlineEndAt(o.createdAt, lead, schedule);
      if (deadline) {
        incBucket(
          withNormativeBuckets,
          classifyInstantWithTolerance(
            o.handedAt,
            deadline,
            DEADLINES_TOLERANCE_MINUTES,
          ),
        );
      }
    }
  }

  const periodWithNormativeDurations = periodCompleted
    .filter((o) => maxLeadWorkingDays(o) != null)
    .map((o) => workActualMinutes(o, schedule));

  return {
    period: { from: ymd(from), to: ymd(to) },
    schedule,
    completedAllTime: completed.length,
    completedInPeriod: periodCompleted.length,
    allTimeAverageMinutes: averageMinutes(allDurations),
    periodAverageMinutes: averageMinutes(
      periodCompleted.map((o) => workActualMinutes(o, schedule)),
    ),
    withNormative: {
      ...withNormativeBuckets,
      bucketPercents: bucketPercents(withNormativeBuckets),
      periodAverageMinutes: averageMinutes(periodWithNormativeDurations),
    },
    withoutNormative: {
      count: withoutNormativeCount,
      periodAverageMinutes: averageMinutes(withoutNormativeDurations),
      allTimeAverageMinutes: averageMinutes(allWithoutNormativeDurations),
    },
  };
}
