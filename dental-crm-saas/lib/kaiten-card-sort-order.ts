/** Поле `sort_order` в ответе Kaiten — порядок карточки в колонке (меньше — выше в списке). */
export function kaitenSortOrderFromCard(
  card: Record<string, unknown>,
): number | null {
  const so = card.sort_order;
  if (typeof so === "number" && Number.isFinite(so)) return so;
  return null;
}
