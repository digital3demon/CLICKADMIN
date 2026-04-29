/** Нормализация строки поиска по списку заказов (URL `q`). */
export function normalizeOrdersSearchQuery(
  raw: string | null | undefined,
): string {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

/** Параметры ссылки на страницу списка заказов (сохраняют фильтр по тегу и пагинацию). */
export function ordersListHref(opts: {
  /** Если не задан — параметр `limit` в URL не добавляется (размер берётся из профиля или дефолта). */
  limit?: number;
  cursor?: string | null;
  tag?: string | null;
  /** Скрыть наряды с отметкой «Работа отправлена». */
  hideShipped?: boolean;
  /** Только наряды с отметкой «Работа отправлена» (в URL взаимоисключает hideShipped). */
  onlyShipped?: boolean;
  /** Поиск по наряду, врачу, клинике, пациенту. */
  q?: string | null;
  /** Дата создания наряда с (YYYY-MM-DD, МСК). */
  from?: string | null;
  /** Дата создания наряда по (YYYY-MM-DD, МСК). */
  to?: string | null;
}): string {
  const p = new URLSearchParams();
  if (
    opts.limit !== undefined &&
    Number.isFinite(opts.limit) &&
    opts.limit >= 1
  ) {
    p.set("limit", String(Math.floor(opts.limit)));
  }
  if (opts.cursor) p.set("cursor", opts.cursor);
  if (opts.tag) p.set("tag", opts.tag);
  if (opts.onlyShipped) {
    p.set("onlyShipped", "1");
  } else if (opts.hideShipped) {
    p.set("hideShipped", "1");
  }
  const qq = normalizeOrdersSearchQuery(opts.q ?? undefined);
  if (qq) p.set("q", qq);
  const from = opts.from?.trim() || "";
  const to = opts.to?.trim() || "";
  if (from) p.set("from", from);
  if (to) p.set("to", to);
  const q = p.toString();
  return q ? `/orders?${q}` : "/orders";
}
