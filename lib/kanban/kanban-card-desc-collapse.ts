/**
 * Сворачивать описание, если полный текст не влезает в остаток окна
 * под блоком, либо на узком viewport (телефон) — всегда, в отличие от десктопа.
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

/** Узкая модалка карточки: тот же порог, что `sm:` у блока людей (`sm:hidden`). */
export const KANBAN_CARD_MODAL_NARROW_MAX_PX = 639;

export function kanbanCardDescriptionForceCollapseOnNarrow(
  narrowViewport: boolean,
  hasText: boolean,
): boolean {
  return narrowViewport && hasText;
}
