/** Элемент полоски номеров: страница или разрыв («…»). */
export type OrdersListPageItem =
  | { kind: "page"; page: number; href: string; current: boolean }
  | { kind: "gap" };

/**
 * Окно страниц как у клиентов: 1, соседи ±2, последняя; дырки — `gap`.
 * `totalPages <= 1` → пусто (кнопки не нужны).
 */
export function buildOrdersListPageItems(
  totalPages: number,
  currentPage: number,
  hrefForPage: (page: number) => string,
): OrdersListPageItem[] {
  if (totalPages <= 1) return [];
  const cur = Math.min(Math.max(1, currentPage), totalPages);
  const want = new Set<number>();
  want.add(1);
  want.add(totalPages);
  for (let d = -2; d <= 2; d++) {
    const p = cur + d;
    if (p >= 1 && p <= totalPages) want.add(p);
  }
  const sorted = [...want].sort((a, b) => a - b);
  const items: OrdersListPageItem[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]!;
    if (i > 0 && p - sorted[i - 1]! > 1) {
      items.push({ kind: "gap" });
    }
    items.push({
      kind: "page",
      page: p,
      href: hrefForPage(p),
      current: p === cur,
    });
  }
  return items;
}

/**
 * Когда точное число страниц неизвестно (фильтр «внимание» / упоминания не досканировали).
 * Показываем 1, текущую и следующую, если есть ещё порция.
 */
export function buildOrdersListPageItemsUnknownTotal(
  currentPage: number,
  hasMore: boolean,
  hrefForPage: (page: number) => string,
): OrdersListPageItem[] {
  const cur = Math.max(1, currentPage);
  const want = new Set<number>();
  want.add(1);
  want.add(cur);
  if (hasMore) want.add(cur + 1);
  if (cur > 1) want.add(cur - 1);
  const sorted = [...want].sort((a, b) => a - b);
  const items: OrdersListPageItem[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]!;
    if (i > 0 && p - sorted[i - 1]! > 1) {
      items.push({ kind: "gap" });
    }
    items.push({
      kind: "page",
      page: p,
      href: hrefForPage(p),
      current: p === cur,
    });
  }
  return items.length <= 1 ? [] : items;
}
