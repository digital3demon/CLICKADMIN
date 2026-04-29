import type { QuickOrderState } from "@/components/orders/new-order-form/quick-order-types";

export type QuickOrderPriceRow = {
  priceListItemId: string;
  quantity: number;
};

/** Строки прайса из плашек «Быстрый наряд» (добавляются к позициям вкладки «Состав»). */
export function constructionsFromQuickOrder(
  q: QuickOrderState,
): QuickOrderPriceRow[] {
  if (q.v !== 2) return [];
  const out: QuickOrderPriceRow[] = [];
  for (const tile of q.tiles) {
    const baseId = tile.basePriceListItemId?.trim();
    if (tile.baseActive && baseId) {
      out.push({ priceListItemId: baseId, quantity: 1 });
    }
    for (const opt of tile.options) {
      const pid = opt.priceListItemId?.trim();
      if (opt.checked && pid) {
        out.push({ priceListItemId: pid, quantity: 1 });
      }
    }
  }
  return out;
}
