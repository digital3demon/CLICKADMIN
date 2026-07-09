import type {
  QuickOrderState,
  QuickOrderTile,
} from "@/components/orders/new-order-form/quick-order-types";

export const MAX_QUICK_TILE_BLOCK_REASON_LEN = 500;

function isQuickOrderTileSelected(tile: QuickOrderTile): boolean {
  const hasBase = Boolean(tile.basePriceListItemId?.trim());
  return (
    (hasBase && tile.baseActive) ||
    tile.options.some((o) => o.checked && Boolean(o.priceListItemId?.trim()))
  );
}

/** Причина блокировки от активной плашки с включённой «Блокировкой». */
export function quickOrderBlockReasonFromState(
  q: QuickOrderState,
): string | null {
  if (q.v !== 2) return null;
  for (const tile of q.tiles) {
    if (!isQuickOrderTileSelected(tile) || !tile.blockOnSave) continue;
    const reason = tile.blockReason?.trim() ?? "";
    if (reason) return reason.slice(0, MAX_QUICK_TILE_BLOCK_REASON_LEN);
  }
  return null;
}

/** Ошибка валидации перед сохранением наряда. */
export function quickOrderBlockValidationError(
  q: QuickOrderState,
): string | null {
  if (q.v !== 2) return null;
  for (const tile of q.tiles) {
    if (!isQuickOrderTileSelected(tile) || !tile.blockOnSave) continue;
    if (!tile.blockReason?.trim()) {
      const title = tile.title.trim() || "без названия";
      return `Плашка «${title}»: укажите причину блокировки в настройках`;
    }
  }
  return null;
}
