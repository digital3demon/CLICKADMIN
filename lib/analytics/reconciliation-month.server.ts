import { lineAllocatedTotalRub } from "@/lib/format-order-construction";
import { getPrisma } from "@/lib/get-prisma";
import { orderLinesIncludedInReconciliationExport } from "@/lib/order-reconciliation-export";
import { orderUrgentPriceMultiplier } from "@/lib/order-urgency";

type SnapshotRow = {
  id: string;
  clinicId: string;
  clinicName: string;
  legalEntityLabel: string;
  slot: string;
  periodLabelRu: string;
  periodFromStr: string;
  periodToStr: string;
  createdAt: Date;
};

type SnapshotWithAmount = SnapshotRow & { amountRub: number };

type MonthInput = { year: number; month: number };

export type ReconciliationMonthContractorRow = {
  clinicId: string;
  contractorName: string;
  monthTotalRub: number;
  compareTotalRub: number | null;
  deltaRub: number | null;
  deltaPercent: number | null;
  periods: {
    snapshotId: string;
    slot: string;
    periodLabelRu: string;
    periodFromStr: string;
    periodToStr: string;
    amountRub: number;
  }[];
  comparePeriods: {
    snapshotId: string;
    slot: string;
    periodLabelRu: string;
    periodFromStr: string;
    periodToStr: string;
    amountRub: number;
  }[];
};

export type ReconciliationMonthReport = {
  month: MonthInput;
  compareMonth: MonthInput | null;
  rows: ReconciliationMonthContractorRow[];
  totals: {
    monthTotalRub: number;
    compareTotalRub: number | null;
    deltaRub: number | null;
    deltaPercent: number | null;
  };
};

function monthBoundsUtc(year: number, month: number): { from: Date; to: Date } {
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { from, to };
}

function parseYmdToUtcBounds(
  fromStr: string,
  toStr: string,
): { from: Date; to: Date } | null {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fromStr.trim());
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toStr.trim());
  if (!a || !b) return null;
  const from = new Date(
    Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]), 0, 0, 0, 0),
  );
  const to = new Date(
    Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]), 23, 59, 59, 999),
  );
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  if (from.getTime() > to.getTime()) return null;
  return { from, to };
}

async function calculateSnapshotAmount(
  clinicId: string,
  periodFromStr: string,
  periodToStr: string,
): Promise<number> {
  const range = parseYmdToUtcBounds(periodFromStr, periodToStr);
  if (!range) return 0;

  const lines = await (await getPrisma()).orderConstruction.findMany({
    where: {
      order: {
        clinicId,
        archivedAt: null,
        createdAt: { gte: range.from, lte: range.to },
      },
    },
    select: {
      quantity: true,
      unitPrice: true,
      lineDiscountPercent: true,
      order: {
        select: {
          isUrgent: true,
          urgentCoefficient: true,
          compositionDiscountPercent: true,
          excludeFromReconciliation: true,
          excludeFromReconciliationUntil: true,
          constructions: {
            select: {
              quantity: true,
              unitPrice: true,
              lineDiscountPercent: true,
            },
          },
        },
      },
    },
  });

  let total = 0;
  for (const line of lines) {
    if (
      !orderLinesIncludedInReconciliationExport(
        line.order.excludeFromReconciliation,
        line.order.excludeFromReconciliationUntil,
        range.to,
      )
    ) {
      continue;
    }
    const mult = orderUrgentPriceMultiplier(
      line.order.isUrgent,
      line.order.urgentCoefficient,
    );
    total += lineAllocatedTotalRub(
      {
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineDiscountPercent: line.lineDiscountPercent,
      },
      line.order.constructions,
      line.order.compositionDiscountPercent,
      mult,
    );
  }
  return Math.round(total * 100) / 100;
}

async function loadSnapshotsForMonth(input: MonthInput): Promise<SnapshotWithAmount[]> {
  const prisma = await getPrisma();
  const bounds = monthBoundsUtc(input.year, input.month);
  const snaps = await prisma.clinicReconciliationSnapshot.findMany({
    where: {
      createdAt: { gte: bounds.from, lt: bounds.to },
    },
    orderBy: [{ clinicId: "asc" }, { periodFromStr: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      clinicId: true,
      slot: true,
      periodLabelRu: true,
      periodFromStr: true,
      periodToStr: true,
      legalEntityLabel: true,
      createdAt: true,
      clinic: { select: { name: true } },
    },
  });

  const out: SnapshotWithAmount[] = [];
  for (const snap of snaps) {
    const amountRub = await calculateSnapshotAmount(
      snap.clinicId,
      snap.periodFromStr,
      snap.periodToStr,
    );
    out.push({
      id: snap.id,
      clinicId: snap.clinicId,
      clinicName: snap.clinic?.name?.trim() || "Клиника",
      legalEntityLabel: snap.legalEntityLabel,
      slot: snap.slot,
      periodLabelRu: snap.periodLabelRu,
      periodFromStr: snap.periodFromStr,
      periodToStr: snap.periodToStr,
      createdAt: snap.createdAt,
      amountRub,
    });
  }
  return out;
}

function toContractorLabel(s: SnapshotWithAmount): string {
  const legal = s.legalEntityLabel?.trim();
  const clinic = s.clinicName?.trim();
  if (legal && clinic && legal !== clinic) return `${legal} (${clinic})`;
  return legal || clinic || "Контрагент";
}

function computeDelta(current: number, previous: number): { rub: number; percent: number | null } {
  const rub = Math.round((current - previous) * 100) / 100;
  if (previous === 0) return { rub, percent: null };
  const percent = Math.round(((current - previous) / previous) * 10000) / 100;
  return { rub, percent };
}

export async function loadReconciliationMonthReport(input: {
  year: number;
  month: number;
  compareYear?: number | null;
  compareMonth?: number | null;
}): Promise<ReconciliationMonthReport> {
  const currentMonth: MonthInput = { year: input.year, month: input.month };
  const compareMonth: MonthInput | null =
    input.compareYear && input.compareMonth
      ? { year: input.compareYear, month: input.compareMonth }
      : null;

  const [currentSnaps, compareSnaps] = await Promise.all([
    loadSnapshotsForMonth(currentMonth),
    compareMonth ? loadSnapshotsForMonth(compareMonth) : Promise.resolve([]),
  ]);

  const byClinic = new Map<
    string,
    {
      clinicId: string;
      contractorName: string;
      periods: ReconciliationMonthContractorRow["periods"];
      comparePeriods: ReconciliationMonthContractorRow["comparePeriods"];
    }
  >();

  for (const s of currentSnaps) {
    const cur = byClinic.get(s.clinicId) ?? {
      clinicId: s.clinicId,
      contractorName: toContractorLabel(s),
      periods: [],
      comparePeriods: [],
    };
    cur.periods.push({
      snapshotId: s.id,
      slot: s.slot,
      periodLabelRu: s.periodLabelRu,
      periodFromStr: s.periodFromStr,
      periodToStr: s.periodToStr,
      amountRub: s.amountRub,
    });
    byClinic.set(s.clinicId, cur);
  }

  for (const s of compareSnaps) {
    const cur = byClinic.get(s.clinicId) ?? {
      clinicId: s.clinicId,
      contractorName: toContractorLabel(s),
      periods: [],
      comparePeriods: [],
    };
    cur.comparePeriods.push({
      snapshotId: s.id,
      slot: s.slot,
      periodLabelRu: s.periodLabelRu,
      periodFromStr: s.periodFromStr,
      periodToStr: s.periodToStr,
      amountRub: s.amountRub,
    });
    byClinic.set(s.clinicId, cur);
  }

  const rows: ReconciliationMonthContractorRow[] = [...byClinic.values()]
    .map((v) => {
      const monthTotalRub =
        Math.round(v.periods.reduce((a, b) => a + b.amountRub, 0) * 100) / 100;
      const compareTotalRub =
        v.comparePeriods.length > 0
          ? Math.round(v.comparePeriods.reduce((a, b) => a + b.amountRub, 0) * 100) /
            100
          : null;
      const delta = compareTotalRub == null ? null : computeDelta(monthTotalRub, compareTotalRub);
      return {
        clinicId: v.clinicId,
        contractorName: v.contractorName,
        monthTotalRub,
        compareTotalRub,
        deltaRub: delta?.rub ?? null,
        deltaPercent: delta?.percent ?? null,
        periods: v.periods.sort((a, b) => a.periodFromStr.localeCompare(b.periodFromStr)),
        comparePeriods: v.comparePeriods.sort((a, b) =>
          a.periodFromStr.localeCompare(b.periodFromStr),
        ),
      };
    })
    .sort((a, b) => b.monthTotalRub - a.monthTotalRub);

  const monthTotalRub =
    Math.round(rows.reduce((acc, r) => acc + r.monthTotalRub, 0) * 100) / 100;
  const compareTotalRub =
    compareMonth != null
      ? Math.round(
          rows.reduce((acc, r) => acc + (r.compareTotalRub ?? 0), 0) * 100,
        ) / 100
      : null;
  const totalsDelta =
    compareTotalRub == null ? null : computeDelta(monthTotalRub, compareTotalRub);

  return {
    month: currentMonth,
    compareMonth,
    rows,
    totals: {
      monthTotalRub,
      compareTotalRub,
      deltaRub: totalsDelta?.rub ?? null,
      deltaPercent: totalsDelta?.percent ?? null,
    },
  };
}
