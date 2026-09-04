/**
 * Сворачивать описание, если полный текст не влезает в остаток окна
 * под блоком / карточкой списка. На узкой модалке (не список) — всегда, если есть текст.
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

/**
 * Узкая модалка / list vs board: тот же порог, что drawer (`shell-laptop` = 1024×560).
 * Ширина ≤1023 — телефон и планшет в drawer; альбом с высотой <560 тоже узкий (JS: !SHELL_LAPTOP).
 */
export const KANBAN_CARD_MODAL_NARROW_MAX_PX = 1023;

export function kanbanCardDescriptionForceCollapseOnNarrow(
  narrowViewport: boolean,
  hasText: boolean,
): boolean {
  return narrowViewport && hasText;
}
