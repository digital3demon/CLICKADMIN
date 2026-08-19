import {
  appendOrdersShipmentParams,
  type OrdersListHrefShipmentOpts,
} from "./orders-shipment-list-query";

export type { OrdersListHrefShipmentOpts };

/** Нормализация строки поиска по списку заказов (URL `q`). */
export function normalizeOrdersSearchQuery(
  raw: string | null | undefined,
): string {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

/** Максимум номера страницы в URL списка заказов (защита от абсурда в `skip`). */
export const ORDERS_LIST_PAGE_NUM_MAX = 20_000;

/**
 * Номер страницы списка заказов из URL `page` (с 1). Пустое / мусор → 1.
 * Не путать с размером страницы (`limit`).
 */
export function parseOrdersListPage(raw: string | null | undefined): number {
  const n = Math.floor(Number(String(raw ?? "").trim().replace(",", ".")));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(ORDERS_LIST_PAGE_NUM_MAX, n);
}

/** Параметры ссылки на страницу списка заказов (сохраняют фильтр по тегу и пагинацию). */
export function ordersListHref(opts: {
  /** Если не задан — параметр `limit` в URL не добавляется (размер берётся из профиля или дефолта). */
  limit?: number;
  /**
   * Номер страницы (с 1). `1` и пустое в URL не пишем.
   * Если задан `page` > 1, курсор в ссылку не кладём.
   */
  page?: number | null;
  /** Устаревший курсор «следующие N»; для UI больше не используем. */
  cursor?: string | null;
  tag?: string | null;
  /** Скрыть наряды с отметкой «Работа отправлена». */
  hideShipped?: boolean;
  /** Только наряды с отметкой «Работа отправлена» (в URL взаимоисключает hideShipped). */
  onlyShipped?: boolean;
  /** Поиск по наряду, врачу, клинике, пациенту. */
  q?: string | null;
  /** Лабораторный срок с (YYYY-MM-DD, МСК), колонка «ЛАБ». */
  from?: string | null;
  /** Лабораторный срок по (YYYY-MM-DD, МСК), колонка «ЛАБ». */
  to?: string | null;
  /** Режим фильтра по записи на странице заказов. */
  ship?: OrdersListHrefShipmentOpts["ship"];
  shipFrom?: string | null;
  shipTo?: string | null;
  /** Дата отправки (`adminShippedAt`) с (YYYY-MM-DD, МСК). */
  otprFrom?: string | null;
  /** Дата отправки (`adminShippedAt`) по (YYYY-MM-DD, МСК). */
  otprTo?: string | null;
}): string {
  const p = new URLSearchParams();
  if (
    opts.limit !== undefined &&
    Number.isFinite(opts.limit) &&
    opts.limit >= 1
  ) {
    p.set("limit", String(Math.floor(opts.limit)));
  }
  const pageNum =
    opts.page != null && Number.isFinite(opts.page)
      ? Math.floor(opts.page)
      : 0;
  if (pageNum > 1) {
    p.set("page", String(Math.min(ORDERS_LIST_PAGE_NUM_MAX, pageNum)));
  } else if (opts.cursor) {
    p.set("cursor", opts.cursor);
  }
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
  appendOrdersShipmentParams(p, {
    ship: opts.ship ?? null,
    shipFrom: opts.shipFrom,
    shipTo: opts.shipTo,
  });
  const otprFrom = opts.otprFrom?.trim() || "";
  const otprTo = opts.otprTo?.trim() || "";
  if (otprFrom) p.set("otprFrom", otprFrom);
  if (otprTo) p.set("otprTo", otprTo);
  const q = p.toString();
  return q ? `/orders?${q}` : "/orders";
}

/** Сохранить otprFrom/otprTo из текущего URL при навигации. */
export function pickOrdersOtprHrefOpts(sp: {
  get: (key: string) => string | null;
}): { otprFrom?: string; otprTo?: string } {
  const otprFrom = sp.get("otprFrom")?.trim() || undefined;
  const otprTo = sp.get("otprTo")?.trim() || undefined;
  return {
    ...(otprFrom ? { otprFrom } : {}),
    ...(otprTo ? { otprTo } : {}),
  };
}
