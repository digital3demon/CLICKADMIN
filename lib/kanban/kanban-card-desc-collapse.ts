/**
 * Сворачивать описание только если полный текст не влезает
 * в остаток окна под блоком описания.
 * Высота колонки комментариев не учитывается — оверлей и так скроллится.
 */
export const KANBAN_CARD_DESC_RESERVED_BELOW_PX = 88;

export function kanbanCardDescriptionAvailableHeight(
  overlayBottom: number,
  descriptionTop: number,
  reservedBelowPx = KANBAN_CARD_DESC_RESERVED_BELOW_PX,
): number {
  if (!(overlayBottom > 0) || !(descriptionTop >= 0)) return 0;
  return overlayBottom - descriptionTop - reservedBelowPx;
}

export function kanbanCardDescriptionNeedsCollapse(
  fullDescriptionHeight: number,
  availableHeight: number,
  slackPx = 4,
): boolean {
  if (!(fullDescriptionHeight > 0) || !(availableHeight > 0)) return false;
  return fullDescriptionHeight > availableHeight + slackPx;
}
