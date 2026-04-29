import type { Prisma } from "@prisma/client";
import { applyStockMovement } from "@/lib/inventory/apply-stock-movement";
import {
  aggregateOurQuantities,
  type OrderProstheticsV1,
} from "@/lib/order-prosthetics";

type Tx = Prisma.TransactionClient;

/**
 * Дельта «наше» по наряду: списание (SALE_ISSUE) или возврат на склад (RETURN_IN).
 * Вызывать внутри транзакции Prisma вместе с обновлением наряда.
 */
export async function syncOrderProstheticsStockTx(
  tx: Tx,
  orderId: string,
  warehouseId: string,
  previous: OrderProstheticsV1 | null,
  next: OrderProstheticsV1 | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const oldMap = aggregateOurQuantities(previous);
  const newMap = aggregateOurQuantities(next);
  const ids = new Set([...oldMap.keys(), ...newMap.keys()]);

  try {
    for (const itemId of ids) {
      const oldQ = oldMap.get(itemId) ?? 0;
      const newQ = newMap.get(itemId) ?? 0;
      const delta = newQ - oldQ;
      if (delta === 0) continue;

      if (delta > 0) {
        await applyStockMovement(tx, {
          kind: "SALE_ISSUE",
          itemId,
          warehouseId,
          quantity: delta,
          orderId,
          note: "Протетика (наше)",
          actorLabel: "Наряд",
        });
      } else {
        await applyStockMovement(tx, {
          kind: "RETURN_IN",
          itemId,
          warehouseId,
          quantity: Math.abs(delta),
          orderId,
          note: "Протетика: корректировка (возврат на склад)",
          actorLabel: "Наряд",
        });
      }
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка синхронизации со складом";
    return { ok: false, error: msg };
  }
}
