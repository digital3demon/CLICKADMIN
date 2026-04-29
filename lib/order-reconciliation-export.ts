/**
 * Включать ли позиции наряда в выгрузку сверки за период с концом `exportRangeTo` (UTC).
 * Если исключение без даты «до» — не попадает ни в один период, пока не снят флаг.
 * Если задан `until` (конец периода, на который отложили) — в периодах с концом строго после `until` снова включается.
 */
export function orderLinesIncludedInReconciliationExport(
  excludeFromReconciliation: boolean,
  excludeUntil: Date | null,
  exportRangeTo: Date,
): boolean {
  if (!excludeFromReconciliation) return true;
  if (excludeUntil == null) return false;
  return exportRangeTo.getTime() > excludeUntil.getTime();
}
