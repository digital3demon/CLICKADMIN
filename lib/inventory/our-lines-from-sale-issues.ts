/**
 * «Наше» из журнала склада: SALE_ISSUE минус RETURN_IN по наряду.
 * Корректировка состава в наряде пишет RETURN_IN и не ставит
 * returnedToWarehouseAt — без вычета возвратов страница затирает JSON.
 * Timezone не влияет.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  prostheticsFromDb,
  type OrderProstheticsV1,
  type ProstheticsOurLine,
} from "@/lib/order-prosthetics";

type MovementDb = PrismaClient | Prisma.TransactionClient;

function qtyInt(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(1_000_000, Math.floor(n));
}

export function aggregateSaleIssueOurLines(
  rows: Array<{
    itemId: string;
    warehouseId: string;
    quantity: number;
  }>,
): ProstheticsOurLine[] {
  return netStockOurLines(rows, []);
}

/**
 * Открытые списания минус возвраты по той же паре позиция+склад.
 * Кириллица в id не участвует в ключе иначе чем как строка.
 */
export function netStockOurLines(
  issues: Array<{ itemId: string; warehouseId: string; quantity: number }>,
  returns: Array<{ itemId: string; warehouseId: string; quantity: number }>,
): ProstheticsOurLine[] {
  const map = new Map<string, { itemId: string; warehouseId: string; quantity: number }>();
  const bump = (
    rows: Array<{ itemId: string; warehouseId: string; quantity: number }>,
    sign: 1 | -1,
  ) => {
    for (const r of rows) {
      const itemId = String(r.itemId ?? "").trim();
      const warehouseId = String(r.warehouseId ?? "").trim();
      const quantity = qtyInt(Number(r.quantity));
      if (!itemId || quantity <= 0) continue;
      const key = `${itemId}\t${warehouseId}`;
      const prev = map.get(key);
      const nextQty = (prev?.quantity ?? 0) + sign * quantity;
      map.set(key, { itemId, warehouseId, quantity: nextQty });
    }
  };
  bump(issues, 1);
  bump(returns, -1);
  const out: ProstheticsOurLine[] = [];
  for (const row of map.values()) {
    if (row.quantity <= 0) continue;
    out.push({
      inventoryItemId: row.itemId,
      quantity: row.quantity,
      ...(row.warehouseId ? { warehouseId: row.warehouseId } : {}),
    });
  }
  return out;
}

/** Склад — источник истины по уже списанным позициям; прочие строки JSON оставляем. */
export function mergeOurLinesPreferringStock(
  jsonLines: ProstheticsOurLine[],
  stockLines: ProstheticsOurLine[],
): ProstheticsOurLine[] {
  if (stockLines.length === 0) return jsonLines;
  const stockIds = new Set(
    stockLines.map((l) => l.inventoryItemId.trim()).filter(Boolean),
  );
  const extras = jsonLines.filter((l) => {
    const id = l.inventoryItemId.trim();
    return id.length > 0 && !stockIds.has(id);
  });
  return [...stockLines, ...extras];
}

export function ourLinesFingerprint(lines: ProstheticsOurLine[]): string {
  return lines
    .map(
      (l) =>
        `${l.inventoryItemId.trim()}\t${(l.warehouseId ?? "").trim()}\t${l.quantity}`,
    )
    .sort()
    .join("|");
}

export function mergeProstheticsFromStock(
  json: OrderProstheticsV1,
  stockLines: ProstheticsOurLine[],
): OrderProstheticsV1 {
  return {
    v: json.v,
    clientProvided: json.clientProvided,
    ourLines: mergeOurLinesPreferringStock(json.ourLines, stockLines),
  };
}

export async function loadOurLinesFromOrderSaleIssues(
  db: MovementDb,
  orderId: string,
): Promise<ProstheticsOurLine[]> {
  const id = orderId.trim();
  if (!id) return [];
  const rows = await db.stockMovement.findMany({
    where: {
      orderId: id,
      kind: { in: ["SALE_ISSUE", "RETURN_IN"] },
    },
    select: {
      kind: true,
      itemId: true,
      warehouseId: true,
      quantity: true,
      returnedToWarehouseAt: true,
    },
  });
  const issues = rows.filter(
    (r) => r.kind === "SALE_ISSUE" && r.returnedToWarehouseAt == null,
  );
  const returns = rows.filter((r) => r.kind === "RETURN_IN");
  return netStockOurLines(issues, returns);
}

/**
 * Показ состава: JSON наряда — источник истины после «Сохранить».
 * Журнал не пишем обратно: иначе старые SALE_ISSUE затирают правку.
 */
export async function hydrateOrderProstheticsFromStock(
  _db: MovementDb,
  order: { id: string; prosthetics: unknown },
): Promise<OrderProstheticsV1> {
  return prostheticsFromDb(order.prosthetics);
}
