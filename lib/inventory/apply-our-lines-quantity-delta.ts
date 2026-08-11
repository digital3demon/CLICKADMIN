import {
  type OrderProstheticsV1,
} from "@/lib/order-prosthetics";

/**
 * Чистая правка «Наше» в JSON протетики: +qty при расходе со склада, −qty при возврате.
 */
export function applyOurLinesQuantityDelta(
  current: OrderProstheticsV1,
  inventoryItemId: string,
  warehouseId: string,
  quantityDelta: number,
): OrderProstheticsV1 {
  const itemId = inventoryItemId.trim();
  const wh = warehouseId.trim();
  if (!itemId || !Number.isFinite(quantityDelta) || quantityDelta === 0) {
    return current;
  }

  const ourLines = current.ourLines.map((row) => ({ ...row }));
  const idx = ourLines.findIndex((row) => row.inventoryItemId.trim() === itemId);

  if (quantityDelta > 0) {
    if (idx >= 0) {
      const row = ourLines[idx]!;
      ourLines[idx] = {
        ...row,
        quantity: row.quantity + quantityDelta,
        warehouseId: row.warehouseId?.trim() || wh || undefined,
      };
    } else {
      ourLines.push({
        inventoryItemId: itemId,
        quantity: quantityDelta,
        ...(wh ? { warehouseId: wh } : {}),
      });
    }
    return {
      v: current.v,
      clientProvided: current.clientProvided,
      ourLines,
    };
  }

  let left = Math.abs(quantityDelta);
  for (let i = 0; i < ourLines.length && left > 0; i += 1) {
    const row = ourLines[i]!;
    if (row.inventoryItemId.trim() !== itemId) continue;
    const take = Math.min(row.quantity, left);
    row.quantity -= take;
    left -= take;
  }
  return {
    v: current.v,
    clientProvided: current.clientProvided,
    ourLines: ourLines.filter((row) => row.quantity > 0),
  };
}
