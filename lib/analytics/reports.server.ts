import type { ConstructionCategory } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";
import { lineAllocatedTotalRub } from "@/lib/format-order-construction";
import { orderUrgentPriceMultiplier } from "@/lib/order-urgency";
import { STOCK_MOVEMENT_KIND_LABELS } from "@/lib/inventory/stock-movement-kind-labels";
import { orderRevenueRub } from "@/lib/analytics/order-money";
import {
  ORDER_CORRECTION_TRACK_LABELS,
  ORDER_CORRECTION_TRACK_VALUES,
} from "@/lib/order-correction-track";
import {
  CORRECTION_PRICE_ITEM_CODE,
  sumCorrectionPriceLinesAllocatedRub,
} from "@/lib/pricing/correction-price-item";
import { analyticsBusinessDayKey } from "@/lib/analytics/range";
import { reworkSourceItem } from "@/lib/analytics/rework-source-item";
import {
  ORDER_PAYMENT_PAID,
  ORDER_PAYMENT_RECON_PAID,
} from "@/lib/order-clinic-client-fields";

const PRICE_LIST = "PRICE_LIST" satisfies ConstructionCategory;

export async function loadFinanceReport(from: Date, to: Date) {
  const orders = await (await getPrisma()).order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      archivedAt: null,
    },
    include: {
      constructions: {
        select: {
          id: true,
          category: true,
          quantity: true,
          unitPrice: true,
          lineDiscountPercent: true,
          priceListItem: { select: { id: true, code: true, name: true } },
          constructionType: { select: { id: true, code: true, name: true } },
        },
      },
      continuesFromOrder: {
        select: {
          id: true,
          constructions: {
            select: {
              id: true,
              category: true,
              quantity: true,
              unitPrice: true,
              lineDiscountPercent: true,
              priceListItem: { select: { id: true, code: true, name: true } },
              constructionType: { select: { id: true, code: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const dayKey = analyticsBusinessDayKey;

  const byDay = new Map<string, { revenue: number; actualRevenue: number; orders: number }>();

  let revenueTotal = 0;
  let actualRevenueTotal = 0;
  let ordersActive = 0;
  let cancelled = 0;
  let correctionOrders = 0;
  let correctionRevenue = 0;
  let reworkOrders = 0;
  let reworkRevenue = 0;
  const reworkItems = new Map<
    string,
    {
      code: string;
      name: string;
      reworkOrderIds: Set<string>;
      lineCount: number;
      quantity: number;
    }
  >();

  const correctionByTrack: Record<string, { orders: number; revenue: number }> =
    {};
  const correctionPaidVsFree = {
    paid: { orders: 0, revenue: 0 },
    free: { orders: 0, revenue: 0 },
  };

  for (const o of orders) {
    if (o.status === "CANCELLED") {
      cancelled += 1;
      continue;
    }
    const rev = orderRevenueRub(o);
    const actualRev =
      o.payment === ORDER_PAYMENT_PAID || o.payment === ORDER_PAYMENT_RECON_PAID
        ? rev
        : 0;
    revenueTotal += rev;
    actualRevenueTotal += actualRev;
    ordersActive += 1;
    if (o.correctionTrack != null) {
      const corrRev = sumCorrectionPriceLinesAllocatedRub({
        isUrgent: o.isUrgent,
        urgentCoefficient: o.urgentCoefficient,
        compositionDiscountPercent: o.compositionDiscountPercent,
        constructions: o.constructions,
      });
      correctionOrders += 1;
      correctionRevenue += corrRev;
      const tr = String(o.correctionTrack);
      if (!correctionByTrack[tr]) {
        correctionByTrack[tr] = { orders: 0, revenue: 0 };
      }
      correctionByTrack[tr].orders += 1;
      correctionByTrack[tr].revenue += corrRev;
      if (o.correctionPaid) {
        correctionPaidVsFree.paid.orders += 1;
        correctionPaidVsFree.paid.revenue += corrRev;
      } else {
        correctionPaidVsFree.free.orders += 1;
        correctionPaidVsFree.free.revenue += corrRev;
      }
      if (String(o.correctionTrack) === "REWORK") {
        reworkOrders += 1;
        reworkRevenue += corrRev;
        const sourceOrder = o.continuesFromOrder ?? o;
        for (const ln of sourceOrder.constructions) {
          const item = reworkSourceItem(ln);
          if (!item) continue;
          const cur = reworkItems.get(item.id) ?? {
            code: item.code,
            name: item.name,
            reworkOrderIds: new Set<string>(),
            lineCount: 0,
            quantity: 0,
          };
          cur.reworkOrderIds.add(o.id);
          cur.lineCount += 1;
          cur.quantity += Number.isFinite(ln.quantity) ? ln.quantity : 0;
          reworkItems.set(item.id, cur);
        }
      }
    }
    const k = dayKey(o.createdAt);
    const cur = byDay.get(k) ?? { revenue: 0, actualRevenue: 0, orders: 0 };
    cur.revenue += rev;
    cur.actualRevenue += actualRev;
    cur.orders += 1;
    byDay.set(k, cur);
  }

  const series = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      revenue: Math.round(v.revenue * 100) / 100,
      actualRevenue: Math.round(v.actualRevenue * 100) / 100,
      orders: v.orders,
    }));

  const avgCheck =
    ordersActive > 0
      ? Math.round((revenueTotal / ordersActive) * 100) / 100
      : 0;

  const round2 = (n: number) => Math.round(n * 100) / 100;

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    totals: {
      revenue: Math.round(revenueTotal * 100) / 100,
      actualRevenue: Math.round(actualRevenueTotal * 100) / 100,
      orders: ordersActive,
      cancelled,
      avgCheck,
      correctionOrders,
      correctionRevenue: Math.round(correctionRevenue * 100) / 100,
      reworkOrders,
      reworkRevenue: Math.round(reworkRevenue * 100) / 100,
    },
    correctionDetail: {
      byTrack: ORDER_CORRECTION_TRACK_VALUES.map((k) => {
        const row = correctionByTrack[k];
        return {
          track: k,
          label: ORDER_CORRECTION_TRACK_LABELS[k],
          orders: row?.orders ?? 0,
          revenue: round2(row?.revenue ?? 0),
        };
      }),
      paidVsFree: {
        paid: {
          orders: correctionPaidVsFree.paid.orders,
          revenue: round2(correctionPaidVsFree.paid.revenue),
        },
        free: {
          orders: correctionPaidVsFree.free.orders,
          revenue: round2(correctionPaidVsFree.free.revenue),
        },
      },
    },
    series,
    reworkTopItems: [...reworkItems.values()]
      .map((x) => ({
        code: x.code,
        name: x.name,
        reworkOrders: x.reworkOrderIds.size,
        lineCount: x.lineCount,
        quantity: x.quantity,
      }))
      .sort((a, b) => b.reworkOrders - a.reworkOrders || b.lineCount - a.lineCount)
      .slice(0, 30),
  };
}

export async function loadPriceItemsReport(from: Date, to: Date) {
  const lines = await (await getPrisma()).orderConstruction.findMany({
    where: {
      category: PRICE_LIST,
      priceListItemId: { not: null },
      order: {
        createdAt: { gte: from, lte: to },
        status: { not: "CANCELLED" },
        archivedAt: null,
      },
    },
    include: {
      priceListItem: { select: { id: true, code: true, name: true } },
      order: {
        select: {
          isUrgent: true,
          urgentCoefficient: true,
          compositionDiscountPercent: true,
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

  const agg = new Map<
    string,
    {
      code: string;
      name: string;
      orderIds: Set<string>;
      lineCount: number;
      revenue: number;
    }
  >();

  for (const line of lines) {
    const pl = line.priceListItem;
    if (!pl) continue;
    const mult = orderUrgentPriceMultiplier(
      line.order.isUrgent,
      line.order.urgentCoefficient,
    );
    const lineRub = lineAllocatedTotalRub(
      {
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineDiscountPercent: line.lineDiscountPercent,
      },
      line.order.constructions,
      line.order.compositionDiscountPercent,
      mult,
    );
    const key = pl.id;
    const cur =
      agg.get(key) ??
      {
        code: pl.code,
        name: pl.name,
        orderIds: new Set<string>(),
        lineCount: 0,
        revenue: 0,
      };
    cur.orderIds.add(line.orderId);
    cur.lineCount += 1;
    cur.revenue += lineRub;
    agg.set(key, cur);
  }

  const rows = [...agg.entries()]
    .map(([priceListItemId, v]) => ({
      priceListItemId,
      code: v.code,
      name: v.name,
      orderCount: v.orderIds.size,
      lineCount: v.lineCount,
      revenue: Math.round(v.revenue * 100) / 100,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    rows,
  };
}

export async function loadContractorsReport(from: Date, to: Date) {
  const orders = await (await getPrisma()).order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { not: "CANCELLED" },
      archivedAt: null,
    },
    include: {
      clinic: { select: { id: true, name: true } },
      doctor: { select: { id: true, fullName: true } },
      constructions: {
        select: { quantity: true, unitPrice: true, lineDiscountPercent: true },
      },
    },
  });

  const ms = to.getTime() - from.getTime();
  const days = Math.max(1, ms / (86400 * 1000));
  const months = days / 30.44;

  type ClinicAgg = {
    clinicId: string | null;
    clinicName: string;
    orderIds: Set<string>;
    revenue: number;
  };
  const clinics = new Map<string | null, ClinicAgg>();

  type DocAgg = {
    doctorId: string;
    doctorName: string;
    orderIds: Set<string>;
    revenue: number;
  };
  const doctors = new Map<string, DocAgg>();

  for (const o of orders) {
    const rev = orderRevenueRub(o);
    const ck = o.clinicId ?? null;
    const cname = o.clinic?.name?.trim() || "Частное лицо";
    const ca =
      clinics.get(ck) ??
      {
        clinicId: ck,
        clinicName: cname,
        orderIds: new Set<string>(),
        revenue: 0,
      };
    ca.orderIds.add(o.id);
    ca.revenue += rev;
    clinics.set(ck, ca);

    const dk = o.doctorId;
    const da =
      doctors.get(dk) ??
      {
        doctorId: dk,
        doctorName: o.doctor.fullName,
        orderIds: new Set<string>(),
        revenue: 0,
      };
    da.orderIds.add(o.id);
    da.revenue += rev;
    doctors.set(dk, da);
  }

  const clinicRows = [...clinics.values()]
    .map((c) => ({
      clinicId: c.clinicId,
      clinicName: c.clinicName,
      orderCount: c.orderIds.size,
      revenue: Math.round(c.revenue * 100) / 100,
      ordersPerMonth:
        months > 0
          ? Math.round((c.orderIds.size / months) * 100) / 100
          : c.orderIds.size,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const doctorRows = [...doctors.values()]
    .map((d) => ({
      doctorId: d.doctorId,
      doctorName: d.doctorName,
      orderCount: d.orderIds.size,
      revenue: Math.round(d.revenue * 100) / 100,
      ordersPerMonth:
        months > 0
          ? Math.round((d.orderIds.size / months) * 100) / 100
          : d.orderIds.size,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    periodDays: Math.round(days),
    clinics: clinicRows,
    doctors: doctorRows,
  };
}

export async function loadWarehouseReport(from: Date, to: Date) {
  const movements = await (await getPrisma()).stockMovement.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: {
      item: { select: { id: true, name: true, unit: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  type KindAgg = {
    kind: string;
    label: string;
    count: number;
    quantityAbs: number;
    totalCostRub: number;
  };
  const byKind = new Map<string, KindAgg>();

  type ItemAgg = {
    itemId: string;
    name: string;
    unit: string;
    movements: number;
    quantityAbs: number;
    costRub: number;
  };
  const byItem = new Map<string, ItemAgg>();

  for (const m of movements) {
    const k = m.kind;
    const label = STOCK_MOVEMENT_KIND_LABELS[k] ?? k;
    const cur =
      byKind.get(k) ??
      { kind: k, label, count: 0, quantityAbs: 0, totalCostRub: 0 };
    cur.count += 1;
    cur.quantityAbs += Math.abs(m.quantity);
    if (m.totalCostRub != null && Number.isFinite(m.totalCostRub)) {
      cur.totalCostRub += m.totalCostRub;
    }
    byKind.set(k, cur);

    const ia =
      byItem.get(m.itemId) ??
      {
        itemId: m.itemId,
        name: m.item.name,
        unit: m.item.unit,
        movements: 0,
        quantityAbs: 0,
        costRub: 0,
      };
    ia.movements += 1;
    ia.quantityAbs += Math.abs(m.quantity);
    if (m.totalCostRub != null && Number.isFinite(m.totalCostRub)) {
      ia.costRub += m.totalCostRub;
    }
    byItem.set(m.itemId, ia);
  }

  const kindRows = [...byKind.values()].sort((a, b) => b.count - a.count);

  const topItems = [...byItem.values()]
    .map((r) => ({
      ...r,
      costRub: Math.round(r.costRub * 100) / 100,
    }))
    .sort((a, b) => b.movements - a.movements)
    .slice(0, 30);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    movementCount: movements.length,
    byKind: kindRows.map((r) => ({
      ...r,
      totalCostRub: Math.round(r.totalCostRub * 100) / 100,
    })),
    topItems,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export async function loadProductionReworkReport(tenantId: string, from: Date, to: Date) {
  const stateRow = await (await getPrisma()).tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key: "kanbanAppStateV3" } },
    select: { value: true },
  });
  if (!stateRow) {
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      totals: { reworkEvents: 0, reworkedObjects: 0, reworkedCards: 0 },
      byBoard: [] as Array<{ boardId: string; boardTitle: string; reworkEvents: number }>,
      topItems: [] as Array<{
        boardId: string;
        boardTitle: string;
        cardId: string;
        cardTitle: string;
        laneId: string;
        objectText: string;
        sourceFileName: string;
        reworkEvents: number;
      }>,
    };
  }

  const appState = asRecord(stateRow.value);
  const boards = asArray(appState?.boards);
  const byBoard = new Map<string, { boardId: string; boardTitle: string; reworkEvents: number }>();
  const byObject = new Map<
    string,
    {
      boardId: string;
      boardTitle: string;
      cardId: string;
      cardTitle: string;
      laneId: string;
      objectText: string;
      sourceFileName: string;
      reworkEvents: number;
    }
  >();
  const reworkedCards = new Set<string>();
  let totalEvents = 0;

  for (const boardRaw of boards) {
    const board = asRecord(boardRaw);
    if (!board) continue;
    const boardId = String(board.id || "");
    const boardTitle = String(board.title || "Без названия");
    const columns = asArray(board.columns);
    let boardEvents = 0;

    for (const colRaw of columns) {
      const col = asRecord(colRaw);
      if (!col) continue;
      const cards = asArray(col.cards);
      for (const cardRaw of cards) {
        const card = asRecord(cardRaw);
        if (!card) continue;
        if (!String(card.parentCardId || "").trim()) continue;
        const cardId = String(card.id || "");
        const cardTitle = String(card.title || "Без названия");
        const laneId = String(card.productionLaneId || "");
        const checklist = asArray(card.productionChecklist);

        for (const itemRaw of checklist) {
          const item = asRecord(itemRaw);
          if (!item) continue;
          const events = asArray(item.reworkEvents);
          if (!events.length) continue;
          let inRange = 0;
          for (const tsRaw of events) {
            const ts = new Date(String(tsRaw || ""));
            const ms = ts.getTime();
            if (!Number.isFinite(ms)) continue;
            if (ms < from.getTime() || ms > to.getTime()) continue;
            inRange += 1;
          }
          if (inRange === 0) continue;
          totalEvents += inRange;
          boardEvents += inRange;
          reworkedCards.add(cardId);

          const itemId = String(item.id || "");
          const key = `${cardId}:${itemId}`;
          const cur = byObject.get(key) ?? {
            boardId,
            boardTitle,
            cardId,
            cardTitle,
            laneId,
            objectText: String(item.text || "Без названия"),
            sourceFileName: String(item.sourceFileName || ""),
            reworkEvents: 0,
          };
          cur.reworkEvents += inRange;
          byObject.set(key, cur);
        }
      }
    }

    if (boardEvents > 0) {
      byBoard.set(boardId, { boardId, boardTitle, reworkEvents: boardEvents });
    }
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    totals: {
      reworkEvents: totalEvents,
      reworkedObjects: byObject.size,
      reworkedCards: reworkedCards.size,
    },
    byBoard: [...byBoard.values()].sort((a, b) => b.reworkEvents - a.reworkEvents),
    topItems: [...byObject.values()]
      .sort((a, b) => b.reworkEvents - a.reworkEvents || a.objectText.localeCompare(b.objectText))
      .slice(0, 50),
  };
}
