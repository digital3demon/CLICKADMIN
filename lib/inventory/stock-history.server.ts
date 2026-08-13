/**
 * Журнал движений склада для вкладки «История → Склад».
 * Данные: StockMovement (pricing DB); наряды — через loadOrderRefsByIds.
 */
import "server-only";

import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import { loadOrderRefsByIds } from "@/lib/inventory/order-lookup";
import {
  formatStockHistoryDescription,
  type StockHistoryRow,
} from "@/lib/inventory/stock-history";
import { normalizeRevisionsHistorySearchQuery } from "@/lib/revisions-history";

const LIMIT = 150;

export async function loadStockHistory(opts?: {
  q?: string | null;
}): Promise<StockHistoryRow[]> {
  const q = normalizeRevisionsHistorySearchQuery(opts?.q);
  const prisma = getPricingPrismaClient();

  const rows = await prisma.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: LIMIT * 3,
    include: {
      item: {
        select: { id: true, sku: true, name: true, unit: true },
      },
      warehouse: { select: { id: true, name: true } },
    },
  });

  const orderRefs = await loadOrderRefsByIds(rows.map((r) => r.orderId));

  const mapped: StockHistoryRow[] = rows.map((r) => {
    const order =
      r.orderId != null ? (orderRefs.get(r.orderId) ?? null) : null;
    const itemLabel = [r.item.sku?.trim(), r.item.name.trim()]
      .filter(Boolean)
      .join(" · ");
    const formatted = formatStockHistoryDescription({
      kind: r.kind,
      quantity: r.quantity,
      unit: r.item.unit,
      itemLabel: itemLabel || r.item.name,
      warehouseName: r.warehouse.name,
      orderNumber: order?.orderNumber ?? null,
      note: r.note,
    });
    return {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      kind: r.kind,
      kindLabel: formatted.kindLabel,
      description: formatted.description,
      quantity: r.quantity,
      actorLabel: (r.actorLabel || "").trim() || "Пользователь",
      note: r.note?.trim() || null,
      returnedToWarehouseAt: r.returnedToWarehouseAt
        ? r.returnedToWarehouseAt.toISOString()
        : null,
      item: {
        id: r.item.id,
        label: itemLabel || r.item.name,
        unit: r.item.unit,
      },
      warehouse: {
        id: r.warehouse.id,
        name: r.warehouse.name,
      },
      order: order
        ? { id: order.id, orderNumber: order.orderNumber }
        : null,
    };
  });

  if (!q) return mapped.slice(0, LIMIT);

  const needle = q.toLowerCase();
  return mapped
    .filter((row) => {
      const hay = [
        row.description,
        row.kindLabel,
        row.actorLabel,
        row.note ?? "",
        row.item.label,
        row.warehouse.name,
        row.order?.orderNumber ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    })
    .slice(0, LIMIT);
}
