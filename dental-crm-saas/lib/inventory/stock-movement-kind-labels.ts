export const STOCK_MOVEMENT_KIND_LABELS = {
  PURCHASE_RECEIPT: "Приход (закупка)",
  SALE_ISSUE: "Расход по наряду",
  ADJUSTMENT_PLUS: "Корректировка +",
  ADJUSTMENT_MINUS: "Корректировка −",
  DEFECT_WRITE_OFF: "Брак",
  RETURN_IN: "Возврат на склад",
} as const;

export type StockMovementKindKey = keyof typeof STOCK_MOVEMENT_KIND_LABELS;

export function isStockMovementKind(v: string): v is StockMovementKindKey {
  return Object.prototype.hasOwnProperty.call(STOCK_MOVEMENT_KIND_LABELS, v);
}
