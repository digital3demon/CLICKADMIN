/**
 * Строки сверки на вкладке «Финансы»: группировка по наряду.
 * Порядок нарядов и позиций внутри — как пришло из API.
 */

export function groupReconciliationLinesByOrder<T extends { orderId: string }>(
  lines: T[],
): T[][] {
  const groups: T[][] = [];
  const indexByOrder = new Map<string, number>();
  for (const line of lines) {
    const i = indexByOrder.get(line.orderId);
    if (i == null) {
      indexByOrder.set(line.orderId, groups.length);
      groups.push([line]);
    } else {
      groups[i]!.push(line);
    }
  }
  return groups;
}
