import type {
  QuickOrderState,
  QuickOrderTile,
} from "@/components/orders/new-order-form/quick-order-types";

export const MAX_QUICK_TILE_BLOCK_REASON_LEN = 500;

/** Если причина не указана — всё равно блокируем с этой формулировкой. */
export const QUICK_ORDER_BLOCK_REASON_FALLBACK = "Без указания причины";

function isQuickOrderTileSelected(tile: QuickOrderTile): boolean {
  const hasBase = Boolean(tile.basePriceListItemId?.trim());
  return (
    (hasBase && tile.baseActive) ||
    tile.options.some((o) => o.checked && Boolean(o.priceListItemId?.trim()))
  );
}

/**
 * Причина блокировки от активной плашки с включённой блокировкой.
 * Причина на плашке в наряде может быть пустой — тогда fallback.
 */
export function quickOrderBlockReasonFromState(
  q: QuickOrderState,
): string | null {
  if (q.v !== 2) return null;
  for (const tile of q.tiles) {
    if (!isQuickOrderTileSelected(tile) || !tile.blockOnSave) continue;
    const reason = tile.blockReason?.trim() ?? "";
    return (reason || QUICK_ORDER_BLOCK_REASON_FALLBACK).slice(
      0,
      MAX_QUICK_TILE_BLOCK_REASON_LEN,
    );
  }
  return null;
}

/** Ошибка валидации перед сохранением наряда (причина больше не обязательна). */
export function quickOrderBlockValidationError(
  _q: QuickOrderState,
): string | null {
  return null;
}
