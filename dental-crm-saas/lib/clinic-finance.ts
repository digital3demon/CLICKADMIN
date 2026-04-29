import { getPrisma } from "@/lib/get-prisma";
import {
  formatConstructionDescription,
  lineAmountRub,
} from "@/lib/format-order-construction";
import { orderLinesIncludedInReconciliationExport } from "@/lib/order-reconciliation-export";
import { orderUrgentPriceMultiplier } from "@/lib/order-urgency";

export type ReconciliationRow = {
  orderId: string;
  doctorName: string;
  orderCreatedAt: Date;
  orderNumber: string;
  description: string;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number;
};

/** Границы периода по строкам YYYY-MM-DD (календарные дни в UTC). */
export function parseDateRangeUTC(
  fromStr: string | undefined,
  toStr: string | undefined,
): { from: Date; to: Date } | null {
  if (!fromStr?.trim() || !toStr?.trim()) return null;
  const fromM = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fromStr.trim());
  const toM = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toStr.trim());
  if (!fromM || !toM) return null;
  const from = new Date(
    Date.UTC(Number(fromM[1]), Number(fromM[2]) - 1, Number(fromM[3]), 0, 0, 0, 0),
  );
  const to = new Date(
    Date.UTC(Number(toM[1]), Number(toM[2]) - 1, Number(toM[3]), 23, 59, 59, 999),
  );
  if (from.getTime() > to.getTime()) return null;
  return { from, to };
}

export function defaultFinanceMonthRangeUTC(): { from: string; to: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const from = new Date(Date.UTC(y, m, 1));
  const to = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

/**
 * Сумма по позициям нарядов клиники (все время), для списка клиентов.
 * Сумма с учётом коэффициента срочности наряда (как в счёте и форме редактирования).
 * Реализация через Prisma (без $queryRaw), чтобы не зависеть от диалекта SQLite и Prisma.join.
 */
export async function clinicTurnoverTotalsByIds(
  clinicIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const id of clinicIds) map.set(id, 0);
  if (clinicIds.length === 0) return map;

  const chunkSize = 400;
  for (let i = 0; i < clinicIds.length; i += chunkSize) {
    const chunk = clinicIds.slice(i, i + chunkSize);
    const lines = await (await getPrisma()).orderConstruction.findMany({
      where: {
        order: { clinicId: { in: chunk } },
      },
      select: {
        quantity: true,
        unitPrice: true,
        order: {
          select: {
            clinicId: true,
            isUrgent: true,
            urgentCoefficient: true,
          },
        },
      },
    });
    for (const l of lines) {
      const cid = l.order.clinicId;
      if (!cid) continue;
      const mult = orderUrgentPriceMultiplier(
        l.order.isUrgent,
        l.order.urgentCoefficient,
      );
      const add = lineAmountRub(l.quantity, l.unitPrice) * mult;
      map.set(cid, (map.get(cid) ?? 0) + add);
    }
  }

  for (const id of clinicIds) {
    const v = map.get(id) ?? 0;
    map.set(id, Math.round(v * 100) / 100);
  }
  return map;
}

export async function sumClinicConstructionTotals(
  clinicId: string,
  range?: { from: Date; to: Date },
): Promise<{ totalRub: number; lineCount: number; linesWithoutPrice: number }> {
  const lines = await (await getPrisma()).orderConstruction.findMany({
    where: {
      order: {
        clinicId,
        ...(range
          ? { createdAt: { gte: range.from, lte: range.to } }
          : {}),
      },
    },
    select: {
      quantity: true,
      unitPrice: true,
      order: {
        select: {
          isUrgent: true,
          urgentCoefficient: true,
          excludeFromReconciliation: true,
          excludeFromReconciliationUntil: true,
        },
      },
    },
  });
  let totalRub = 0;
  let linesWithoutPrice = 0;
  let lineCount = 0;
  for (const l of lines) {
    if (
      range &&
      !orderLinesIncludedInReconciliationExport(
        l.order.excludeFromReconciliation,
        l.order.excludeFromReconciliationUntil,
        range.to,
      )
    ) {
      continue;
    }
    lineCount += 1;
    const q = l.quantity > 0 ? l.quantity : 1;
    const p = l.unitPrice;
    if (p == null) linesWithoutPrice += 1;
    const mult = orderUrgentPriceMultiplier(
      l.order.isUrgent,
      l.order.urgentCoefficient,
    );
    totalRub += lineAmountRub(q, p) * mult;
  }
  return {
    totalRub: Math.round(totalRub * 100) / 100,
    lineCount,
    linesWithoutPrice,
  };
}

export async function sumDoctorConstructionTotals(
  doctorId: string,
  range?: { from: Date; to: Date },
): Promise<{ totalRub: number; lineCount: number; linesWithoutPrice: number }> {
  const lines = await (await getPrisma()).orderConstruction.findMany({
    where: {
      order: {
        doctorId,
        ...(range
          ? { createdAt: { gte: range.from, lte: range.to } }
          : {}),
      },
    },
    select: {
      quantity: true,
      unitPrice: true,
      order: {
        select: {
          isUrgent: true,
          urgentCoefficient: true,
          excludeFromReconciliation: true,
          excludeFromReconciliationUntil: true,
        },
      },
    },
  });
  let totalRub = 0;
  let linesWithoutPrice = 0;
  for (const l of lines) {
    if (
      range &&
      !orderLinesIncludedInReconciliationExport(
        l.order.excludeFromReconciliation,
        l.order.excludeFromReconciliationUntil,
        range.to,
      )
    ) {
      continue;
    }
    const q = l.quantity > 0 ? l.quantity : 1;
    const p = l.unitPrice;
    if (p == null) linesWithoutPrice += 1;
    const mult = orderUrgentPriceMultiplier(
      l.order.isUrgent,
      l.order.urgentCoefficient,
    );
    totalRub += lineAmountRub(q, p) * mult;
  }
  return {
    totalRub: Math.round(totalRub * 100) / 100,
    lineCount: lines.length,
    linesWithoutPrice,
  };
}

export type DoctorReconciliationRow = {
  clinicName: string;
  orderCreatedAt: Date;
  orderNumber: string;
  description: string;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number;
};

export async function fetchDoctorReconciliationRows(
  doctorId: string,
  range: { from: Date; to: Date },
): Promise<{ included: DoctorReconciliationRow[]; excluded: DoctorReconciliationRow[] }> {
  const rows = await (await getPrisma()).orderConstruction.findMany({
    where: {
      order: {
        doctorId,
        createdAt: { gte: range.from, lte: range.to },
      },
    },
    orderBy: [{ order: { createdAt: "asc" } }, { sortOrder: "asc" }],
    include: {
      order: {
        select: {
          orderNumber: true,
          createdAt: true,
          isUrgent: true,
          urgentCoefficient: true,
          excludeFromReconciliation: true,
          excludeFromReconciliationUntil: true,
          clinic: { select: { name: true } },
        },
      },
      constructionType: { select: { name: true } },
      priceListItem: { select: { code: true, name: true } },
      material: { select: { name: true } },
    },
  });

  const included: DoctorReconciliationRow[] = [];
  const excluded: DoctorReconciliationRow[] = [];
  for (const l of rows) {
    const q = l.quantity > 0 ? l.quantity : 1;
    const desc = formatConstructionDescription({
      category: l.category,
      constructionType: l.constructionType,
      priceListItem: l.priceListItem,
      material: l.material,
      shade: l.shade,
      teethFdi: l.teethFdi,
      bridgeFromFdi: l.bridgeFromFdi,
      bridgeToFdi: l.bridgeToFdi,
      arch: l.arch,
    });
    const clinicName =
      l.order.clinic?.name?.trim() || "Частная практика / без клиники";
    const mult = orderUrgentPriceMultiplier(
      l.order.isUrgent,
      l.order.urgentCoefficient,
    );
    const row: DoctorReconciliationRow = {
      clinicName,
      orderCreatedAt: l.order.createdAt,
      orderNumber: l.order.orderNumber,
      description: desc,
      quantity: q,
      unitPrice: l.unitPrice,
      lineTotal: Math.round(lineAmountRub(q, l.unitPrice) * mult * 100) / 100,
    };
    const inc = orderLinesIncludedInReconciliationExport(
      l.order.excludeFromReconciliation,
      l.order.excludeFromReconciliationUntil,
      range.to,
    );
    if (inc) included.push(row);
    else excluded.push(row);
  }
  return { included, excluded };
}

export type ReconciliationFetchResult = {
  included: ReconciliationRow[];
  excluded: ReconciliationRow[];
};

export async function fetchReconciliationRows(
  clinicId: string,
  range: { from: Date; to: Date },
): Promise<ReconciliationFetchResult> {
  const rows = await (await getPrisma()).orderConstruction.findMany({
    where: {
      order: {
        clinicId,
        createdAt: { gte: range.from, lte: range.to },
      },
    },
    orderBy: [{ order: { createdAt: "asc" } }, { sortOrder: "asc" }],
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          isUrgent: true,
          urgentCoefficient: true,
          excludeFromReconciliation: true,
          excludeFromReconciliationUntil: true,
          doctor: { select: { fullName: true } },
        },
      },
      constructionType: { select: { name: true } },
      priceListItem: { select: { code: true, name: true } },
      material: { select: { name: true } },
    },
  });

  const included: ReconciliationRow[] = [];
  const excluded: ReconciliationRow[] = [];
  for (const l of rows) {
    const q = l.quantity > 0 ? l.quantity : 1;
    const desc = formatConstructionDescription({
      category: l.category,
      constructionType: l.constructionType,
      priceListItem: l.priceListItem,
      material: l.material,
      shade: l.shade,
      teethFdi: l.teethFdi,
      bridgeFromFdi: l.bridgeFromFdi,
      bridgeToFdi: l.bridgeToFdi,
      arch: l.arch,
    });
    const mult = orderUrgentPriceMultiplier(
      l.order.isUrgent,
      l.order.urgentCoefficient,
    );
    const row: ReconciliationRow = {
      orderId: l.order.id,
      doctorName: l.order.doctor.fullName,
      orderCreatedAt: l.order.createdAt,
      orderNumber: l.order.orderNumber,
      description: desc,
      quantity: q,
      unitPrice: l.unitPrice,
      lineTotal: Math.round(lineAmountRub(q, l.unitPrice) * mult * 100) / 100,
    };
    const inc = orderLinesIncludedInReconciliationExport(
      l.order.excludeFromReconciliation,
      l.order.excludeFromReconciliationUntil,
      range.to,
    );
    if (inc) included.push(row);
    else excluded.push(row);
  }
  return { included, excluded };
}

export type ClinicReconciliationExcludedOrder = {
  id: string;
  orderNumber: string;
  doctorName: string;
  sumRub: number;
  /** true — отложено на следующий период (задан конец периода исключения) */
  postponedToNextPeriod: boolean;
};

/** Наряды за период, которые намеренно не попадают в основную сверку за этот период. */
export async function listClinicReconciliationExcludedOrders(
  clinicId: string,
  range: { from: Date; to: Date },
): Promise<ClinicReconciliationExcludedOrder[]> {
  const orders = await (await getPrisma()).order.findMany({
    where: {
      clinicId,
      createdAt: { gte: range.from, lte: range.to },
      excludeFromReconciliation: true,
      OR: [
        { excludeFromReconciliationUntil: null },
        { excludeFromReconciliationUntil: { gte: range.to } },
      ],
    },
    select: {
      id: true,
      orderNumber: true,
      excludeFromReconciliationUntil: true,
      isUrgent: true,
      urgentCoefficient: true,
      doctor: { select: { fullName: true } },
      constructions: { select: { quantity: true, unitPrice: true } },
    },
  });

  return orders.map((o) => {
    let sum = 0;
    for (const c of o.constructions) {
      const q = c.quantity > 0 ? c.quantity : 1;
      const mult = orderUrgentPriceMultiplier(o.isUrgent, o.urgentCoefficient);
      sum += lineAmountRub(q, c.unitPrice) * mult;
    }
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      doctorName: o.doctor.fullName,
      sumRub: Math.round(sum * 100) / 100,
      postponedToNextPeriod: o.excludeFromReconciliationUntil != null,
    };
  });
}
