import "server-only";

import { applyOurLinesQuantityDelta } from "@/lib/inventory/apply-our-lines-quantity-delta";
import {
  emptyProsthetics,
  prostheticsFromDb,
  prostheticsToJson,
} from "@/lib/order-prosthetics";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getOrdersPrismaClient } from "@/lib/prisma-orders";
import { getPrisma } from "@/lib/get-prisma";

export { applyOurLinesQuantityDelta };

/**
 * Зеркалит расход/возврат со страницы «Склад» в order.prosthetics.ourLines
 * (без повторного списания со склада — только JSON наряда).
 */
export async function mirrorStockDeltaToOrderProsthetics(opts: {
  orderId: string;
  inventoryItemId: string;
  warehouseId: string;
  quantityDelta: number;
  /** При расходе (>0) отметить «Протетика заказана». */
  markOrdered?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const orderId = opts.orderId.trim();
  if (!orderId) return { ok: false, error: "Нет orderId" };

  const tryUpdate = async (
    db: Awaited<ReturnType<typeof getOrdersPrismaClient>>,
  ): Promise<boolean> => {
    const existing = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, prosthetics: true, prostheticsOrdered: true },
    });
    if (!existing) return false;

    const prev = prostheticsFromDb(existing.prosthetics);
    const base =
      prev.clientProvided.length || prev.ourLines.length
        ? prev
        : emptyProsthetics();
    const next = applyOurLinesQuantityDelta(
      base,
      opts.inventoryItemId,
      opts.warehouseId,
      opts.quantityDelta,
    );
    const data: {
      prosthetics: ReturnType<typeof prostheticsToJson>;
      prostheticsOrdered?: boolean;
    } = {
      prosthetics: prostheticsToJson(next),
    };
    if (
      opts.markOrdered &&
      opts.quantityDelta > 0 &&
      !existing.prostheticsOrdered
    ) {
      data.prostheticsOrdered = true;
    }
    await db.order.update({ where: { id: orderId }, data });
    return true;
  };

  try {
    if (await tryUpdate(await getOrdersPrisma())) return { ok: true };
    if (await tryUpdate(await getPrisma())) return { ok: true };
    if (await tryUpdate(getOrdersPrismaClient())) return { ok: true };
    return { ok: false, error: "Наряд не найден для зеркалирования протетики" };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Ошибка записи протетики в наряд";
    return { ok: false, error: msg };
  }
}
