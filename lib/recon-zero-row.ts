/** Нулевая сверка: нет нарядов и нет суммы за период. */

export function isZeroReconRow(row: {
  orderCount: number;
  sumRub: number;
}): boolean {
  const orders = Number(row.orderCount) || 0;
  const sum = Number(row.sumRub) || 0;
  return orders <= 0 && Math.abs(sum) < 0.005;
}
