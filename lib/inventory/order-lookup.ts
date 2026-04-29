import { getOrdersPrismaClient } from "@/lib/prisma-orders";
import { getPrisma } from "@/lib/get-prisma";

export type MovementWithOrderRef = {
  orderId: string | null;
};

type OrderRef = {
  id: string;
  orderNumber: string;
};

export async function loadOrderRefsByIds(
  orderIds: Array<string | null | undefined>,
): Promise<Map<string, OrderRef>> {
  const ids = [...new Set(orderIds.filter((x): x is string => Boolean(x?.trim())).map((x) => x.trim()))];
  if (ids.length === 0) return new Map();
  const out = new Map<string, OrderRef>();
  try {
    const rows = await getOrdersPrismaClient().order.findMany({
      where: { id: { in: ids } },
      select: { id: true, orderNumber: true },
    });
    for (const row of rows) out.set(row.id, row);
  } catch {
    // ignore and try fallback
  }
  const missingIds = ids.filter((id) => !out.has(id));
  if (missingIds.length === 0) return out;
  try {
    const fallbackRows = await (await getPrisma()).order.findMany({
      where: { id: { in: missingIds } },
      select: { id: true, orderNumber: true },
    });
    for (const row of fallbackRows) out.set(row.id, row);
  } catch {
    // Защита на время миграции split-архитектуры: если fallback тоже недоступен,
    // просто вернём то, что удалось собрать.
  }
  return out;
}

