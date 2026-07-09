import type {
  QuickOrderState,
  QuickOrderTile,
} from "@/components/orders/new-order-form/quick-order-types";

export const MAX_QUICK_TILE_BLOCK_REASON_LEN = 500;

/** Если причина не указана — всё равно блокируем с этой формулировкой. */
export const QUICK_ORDER_BLOCK_REASON_FALLBACK = "Без указания причины";

/**
 * Плашка даёт блокировку карточки (канбан/Kaiten), если:
 * — это плашка-блокировка (isBlockTile) и blockOnSave включён, или
 * — обычная плашка с blockOnSave (legacy) и есть выбранный состав.
 * Состав работы для isBlockTile не требуется.
 */
export function tileRequestsKaitenBlock(tile: QuickOrderTile): boolean {
  if (!tile.blockOnSave) return false;
  if (tile.isBlockTile) return true;
  const hasBase = Boolean(tile.basePriceListItemId?.trim());
  return (
    (hasBase && tile.baseActive) ||
    tile.options.some((o) => o.checked && Boolean(o.priceListItemId?.trim()))
  );
}

/**
 * Причина блокировки от первой плашки, которая запрашивает блок.
 * Причина может быть пустой — тогда fallback.
 */
export function quickOrderBlockReasonFromState(
  q: QuickOrderState,
): string | null {
  if (q.v !== 2) return null;
  for (const tile of q.tiles) {
    if (!tileRequestsKaitenBlock(tile)) continue;
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
