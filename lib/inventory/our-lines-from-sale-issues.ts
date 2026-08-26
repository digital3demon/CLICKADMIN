/**
 * «Наше» из журнала склада: открытые SALE_ISSUE по наряду
 * (не возвращённые). Timezone не влияет.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  prostheticsFromDb,
  prostheticsToJson,
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
  const map = new Map<string, ProstheticsOurLine>();
  for (const r of rows) {
    const itemId = String(r.itemId ?? "").trim();
    const warehouseId = String(r.warehouseId ?? "").trim();
    const quantity = qtyInt(Number(r.quantity));
    if (!itemId || quantity <= 0) continue;
    const key = `${itemId}\t${warehouseId}`;
    const prev = map.get(key);
    if (prev) {
      prev.quantity += quantity;
    } else {
      map.set(key, {
        inventoryItemId: itemId,
        quantity,
        ...(warehouseId ? { warehouseId } : {}),
      });
    }
  }
  return [...map.values()];
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
      kind: "SALE_ISSUE",
      returnedToWarehouseAt: null,
    },
    select: { itemId: true, warehouseId: true, quantity: true },
  });
  return aggregateSaleIssueOurLines(rows);
}

/** Подтянуть «Наше» из журнала и записать в JSON наряда, если расходится. */
export async function hydrateOrderProstheticsFromStock(
  db: MovementDb,
  order: { id: string; prosthetics: unknown },
): Promise<OrderProstheticsV1> {
  const json = prostheticsFromDb(order.prosthetics);
  const stock = await loadOurLinesFromOrderSaleIssues(db, order.id);
  const merged = mergeProstheticsFromStock(json, stock);
  if (ourLinesFingerprint(merged.ourLines) === ourLinesFingerprint(json.ourLines)) {
    return merged;
  }
  await db.order.update({
    where: { id: order.id },
    data: { prosthetics: prostheticsToJson(merged) },
  });
  return merged;
}
