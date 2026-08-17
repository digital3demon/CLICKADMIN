/**
 * Сворачивать описание карточки только если полный текст
 * выталкивает карточку за низ окна (нужна прокрутка оверлея).
 */
export function kanbanCardDescriptionNeedsCollapse(
  expandedCardHeight: number,
  viewportHeight: number,
  slackPx = 4,
): boolean {
  if (!(expandedCardHeight > 0) || !(viewportHeight > 0)) return false;
  return expandedCardHeight > viewportHeight + slackPx;
}
