/**
 * Живые сверки ФинОтдела (группа ИНН) и срез клиники.
 * Timezone периодов — МСК-календарь в YYYY-MM-DD; в БД те же строки.
 */
import type { PrismaClient, ReconciliationFrequency } from "@prisma/client";
import { clinicScopeGroupKey, foReconciliationGroupKey } from "@/lib/clinic-inn-key";
import { parseDateRangeUTC, sumClinicConstructionTotals } from "@/lib/clinic-finance";
import {
  currentAccumulatingPeriod,
  frequencyLabelRu,
  isPeriodHighlighted,
  type ReconCalendarPeriod,
} from "@/lib/reconciliation-calendar-period";
import { formatReconciliationPeriodLabelRu, formatYmdInMsk } from "@/lib/msk-calendar";
import { orderWhereReconciliationPeriod } from "@/lib/clinic-reconciliation-period";
import { orderLinesIncludedInReconciliationExport } from "@/lib/order-reconciliation-export";
import { legalEntityLabelFromClinic } from "@/lib/clinic-legal-label";

export type LegalReconListTab = "open" | "archive";

export type LegalReconListRow = {
  id: string | null;
  groupKey: string;
  clinicIds: string[];
  clinicNames: string[];
  inn: string | null;
  legalEntityLabel: string;
  frequency: ReconciliationFrequency;
  frequencyLabel: string;
  frequencyMixed: boolean;
  slot: string;
  periodFromStr: string;
  periodToStr: string;
  periodLabelRu: string;
  orderCount: number;
  sumRub: number;
  highlight: boolean;
  periodLocked: boolean;
  paymentStatus: "UNPAID" | "PAID";
  downloadedAt: string | null;
  hasInvoice: boolean;
  hasUpd: boolean;
  invoiceFileName: string | null;
  updFileName: string | null;
};

type ClinicLite = {
  id: string;
  name: string;
  inn: string | null;
  legalFullName: string | null;
  billingLegalForm: "IP" | "OOO" | null;
  worksWithReconciliation: boolean;
  reconciliationFrequency: ReconciliationFrequency | null;
};

function pickFrequency(clinics: ClinicLite[]): {
  frequency: ReconciliationFrequency;
  mixed: boolean;
} {
  const freqs = clinics
    .map((c) => c.reconciliationFrequency)
    .filter((f): f is ReconciliationFrequency => f != null);
  const has2 = freqs.includes("MONTHLY_2") || freqs.length === 0;
  const has1 = freqs.includes("MONTHLY_1");
  return {
    frequency: has2 ? "MONTHLY_2" : "MONTHLY_1",
    mixed: has1 && has2,
  };
}

function periodKey(p: { periodFromStr: string; periodToStr: string; slot: string }) {
  return `${p.slot}|${p.periodFromStr}|${p.periodToStr}`;
}

async function orderCountAndSum(
  prisma: PrismaClient,
  clinicIds: string[],
  fromStr: string,
  toStr: string,
): Promise<{ orderCount: number; sumRub: number }> {
  const range = parseDateRangeUTC(fromStr, toStr);
  if (!range || clinicIds.length === 0) {
    return { orderCount: 0, sumRub: 0 };
  }
  let sumRub = 0;
  for (const id of clinicIds) {
    const s = await sumClinicConstructionTotals(id, range);
    sumRub += s.totalRub;
  }
  const orders = await prisma.order.findMany({
    where: {
      clinicId: { in: clinicIds },
      archivedAt: null,
      ...orderWhereReconciliationPeriod(range),
    },
    select: {
      id: true,
      excludeFromReconciliation: true,
      excludeFromReconciliationUntil: true,
    },
  });
  const orderCount = orders.filter((o) =>
    orderLinesIncludedInReconciliationExport(
      o.excludeFromReconciliation,
      o.excludeFromReconciliationUntil,
      range.to,
    ),
  ).length;
  return { orderCount, sumRub: Math.round(sumRub * 100) / 100 };
}

export async function listLegalEntityReconciliations(input: {
  prisma: PrismaClient;
  tenantId: string;
  tab: LegalReconListTab;
  /** Срез одной клиники (карточка). Иначе — ФинОтдел по ИНН. */
  clinicId?: string | null;
  now?: Date;
}): Promise<{ rows: LegalReconListRow[]; highlightCount: number }> {
  const todayYmd = formatYmdInMsk(input.now ?? new Date());
  const clinics = await input.prisma.clinic.findMany({
    where: {
      tenantId: input.tenantId,
      deletedAt: null,
      isActive: true,
      worksWithReconciliation: true,
      ...(input.clinicId ? { id: input.clinicId } : {}),
    },
    select: {
      id: true,
      name: true,
      inn: true,
      legalFullName: true,
      billingLegalForm: true,
      worksWithReconciliation: true,
      reconciliationFrequency: true,
    },
  });

  const groups = new Map<string, ClinicLite[]>();
  for (const c of clinics) {
    const key = input.clinicId
      ? clinicScopeGroupKey(c.id)
      : foReconciliationGroupKey(c);
    const arr = groups.get(key) ?? [];
    arr.push(c);
    groups.set(key, arr);
  }

  const groupKeys = [...groups.keys()];
  const stored =
    groupKeys.length === 0
      ? []
      : await input.prisma.legalEntityReconciliation.findMany({
          where: { tenantId: input.tenantId, groupKey: { in: groupKeys } },
          orderBy: { periodFromStr: "desc" },
        });

  const storedByGroup = new Map<string, typeof stored>();
  for (const row of stored) {
    const arr = storedByGroup.get(row.groupKey) ?? [];
    arr.push(row);
    storedByGroup.set(row.groupKey, arr);
  }

  const rows: LegalReconListRow[] = [];

  for (const [groupKey, members] of groups) {
    const { frequency, mixed } = pickFrequency(members);
    const inn =
      members.map((m) => m.inn?.replace(/\D/g, "")).find((x) => (x?.length ?? 0) >= 10) ??
      null;
    const legalEntityLabel = legalEntityLabelFromClinic(
      members.find((m) => m.legalFullName?.trim()) ?? members[0]!,
    );
    const clinicIds = members.map((m) => m.id);
    const clinicNames = members.map((m) => m.name.trim()).filter(Boolean);
    const groupStored = storedByGroup.get(groupKey) ?? [];

    if (input.tab === "archive") {
      for (const s of groupStored.filter((x) => x.paymentStatus === "PAID")) {
        const stats = await orderCountAndSum(
          input.prisma,
          clinicIds,
          s.periodFromStr,
          s.periodToStr,
        );
        rows.push({
          id: s.id,
          groupKey,
          clinicIds,
          clinicNames,
          inn,
          legalEntityLabel: s.legalEntityLabel || legalEntityLabel,
          frequency,
          frequencyLabel: frequencyLabelRu(frequency, mixed),
          frequencyMixed: mixed,
          slot: s.slot,
          periodFromStr: s.periodFromStr,
          periodToStr: s.periodToStr,
          periodLabelRu: s.periodLabelRu,
          orderCount: stats.orderCount,
          sumRub: stats.sumRub,
          highlight: false,
          periodLocked: s.periodLocked,
          paymentStatus: "PAID",
          downloadedAt: s.downloadedAt?.toISOString() ?? null,
          hasInvoice: Boolean(s.invoiceFileName && s.invoiceBytes),
          hasUpd: Boolean(s.updFileName && s.updBytes),
          invoiceFileName: s.invoiceFileName,
          updFileName: s.updFileName,
        });
      }
      continue;
    }

    const unpaid = groupStored.filter((x) => x.paymentStatus === "UNPAID");
    const locked = unpaid
      .filter((x) => x.periodLocked)
      .map((x) => ({
        periodFromStr: x.periodFromStr,
        periodToStr: x.periodToStr,
      }));
    const current = currentAccumulatingPeriod(todayYmd, frequency, locked);
    const seen = new Set<string>();

    const pushPeriod = async (
      period: ReconCalendarPeriod,
      storedRow?: (typeof unpaid)[number],
    ) => {
      const k = periodKey(period);
      if (seen.has(k)) return;
      seen.add(k);
      const stats = await orderCountAndSum(
        input.prisma,
        clinicIds,
        period.periodFromStr,
        period.periodToStr,
      );
      const highlight = isPeriodHighlighted(todayYmd, period.periodToStr);
      rows.push({
        id: storedRow?.id ?? null,
        groupKey,
        clinicIds,
        clinicNames,
        inn,
        legalEntityLabel: storedRow?.legalEntityLabel || legalEntityLabel,
        frequency,
        frequencyLabel: frequencyLabelRu(frequency, mixed),
        frequencyMixed: mixed,
        slot: period.slot,
        periodFromStr: period.periodFromStr,
        periodToStr: period.periodToStr,
        periodLabelRu:
          storedRow?.periodLabelRu ||
          formatReconciliationPeriodLabelRu(
            period.periodFromStr,
            period.periodToStr,
          ),
        orderCount: stats.orderCount,
        sumRub: stats.sumRub,
        highlight,
        periodLocked: storedRow?.periodLocked ?? false,
        paymentStatus: "UNPAID",
        downloadedAt: storedRow?.downloadedAt?.toISOString() ?? null,
        hasInvoice: Boolean(storedRow?.invoiceFileName && storedRow?.invoiceBytes),
        hasUpd: Boolean(storedRow?.updFileName && storedRow?.updBytes),
        invoiceFileName: storedRow?.invoiceFileName ?? null,
        updFileName: storedRow?.updFileName ?? null,
      });
    };

    for (const s of unpaid) {
      await pushPeriod(
        {
          slot: s.slot,
          periodFromStr: s.periodFromStr,
          periodToStr: s.periodToStr,
        },
        s,
      );
    }
    if (current) {
      const existing = unpaid.find(
        (s) =>
          s.slot === current.slot &&
          s.periodFromStr === current.periodFromStr &&
          s.periodToStr === current.periodToStr,
      );
      const paidSame = groupStored.some(
        (s) =>
          s.paymentStatus === "PAID" &&
          s.slot === current.slot &&
          s.periodFromStr === current.periodFromStr &&
          s.periodToStr === current.periodToStr,
      );
      if (!paidSame) {
        await pushPeriod(current, existing);
      }
    }
  }

  rows.sort((a, b) => {
    if (a.highlight !== b.highlight) return a.highlight ? -1 : 1;
    return b.periodToStr.localeCompare(a.periodToStr);
  });

  const highlightCount = rows.filter(
    (r) => r.paymentStatus === "UNPAID" && r.highlight,
  ).length;

  return { rows, highlightCount };
}

export async function countOpenHighlightReconciliations(
  prisma: PrismaClient,
  tenantId: string,
): Promise<number> {
  const { highlightCount } = await listLegalEntityReconciliations({
    prisma,
    tenantId,
    tab: "open",
  });
  return highlightCount;
}

export async function upsertLegalEntityReconciliation(input: {
  prisma: PrismaClient;
  tenantId: string;
  groupKey: string;
  slot: ReconCalendarPeriod["slot"];
  periodFromStr: string;
  periodToStr: string;
  legalEntityLabel: string;
  lockPeriod?: boolean;
  touchDownload?: boolean;
}): Promise<{ id: string }> {
  const periodLabelRu = formatReconciliationPeriodLabelRu(
    input.periodFromStr,
    input.periodToStr,
  );
  const existing = await input.prisma.legalEntityReconciliation.findUnique({
    where: {
      tenantId_groupKey_slot_periodFromStr_periodToStr: {
        tenantId: input.tenantId,
        groupKey: input.groupKey,
        slot: input.slot,
        periodFromStr: input.periodFromStr,
        periodToStr: input.periodToStr,
      },
    },
    select: { id: true, periodLocked: true },
  });
  if (existing) {
    await input.prisma.legalEntityReconciliation.update({
      where: { id: existing.id },
      data: {
        periodLocked: input.lockPeriod ? true : existing.periodLocked,
        downloadedAt: input.touchDownload ? new Date() : undefined,
        legalEntityLabel: input.legalEntityLabel,
        periodLabelRu,
      },
    });
    return { id: existing.id };
  }
  const created = await input.prisma.legalEntityReconciliation.create({
    data: {
      tenantId: input.tenantId,
      groupKey: input.groupKey,
      slot: input.slot,
      periodFromStr: input.periodFromStr,
      periodToStr: input.periodToStr,
      periodLabelRu,
      legalEntityLabel: input.legalEntityLabel,
      periodLocked: Boolean(input.lockPeriod),
      downloadedAt: input.touchDownload ? new Date() : null,
    },
    select: { id: true },
  });
  return created;
}
