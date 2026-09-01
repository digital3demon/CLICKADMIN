import { ORDERS_LIST_PAGE_NUM_MAX } from "@/lib/orders-list-query";
import type { OrdersShipmentMode } from "@/lib/orders-shipment-list-query";
import { parseYmdOrNull } from "@/lib/shipments-date-range";

/** Как у заказов: страница по умолчанию, без загрузки всего списка. */
export const FINANCE_OFFICE_DEFAULT_PAGE_SIZE = 30;
export const FINANCE_OFFICE_PAGE_SIZE_MIN = 1;
export const FINANCE_OFFICE_PAGE_SIZE_MAX = 100;

export type FinanceOfficeListHrefInput = {
  tag?: string | null;
  q?: string | null;
  tab?: string | null;
  from?: string | null;
  to?: string | null;
  ship?: OrdersShipmentMode | string | null;
  shipFrom?: string | null;
  shipTo?: string | null;
  invFrom?: string | null;
  invTo?: string | null;
  /** С 1. `1` в URL не пишем. */
  page?: number | null;
  /** Если равно дефолту — в URL не пишем. */
  limit?: number | null;
};

export function parseFinanceOfficePageSize(
  raw: string | null | undefined,
): number {
  const n =
    raw == null || String(raw).trim() === ""
      ? FINANCE_OFFICE_DEFAULT_PAGE_SIZE
      : Number(String(raw).trim().replace(",", "."));
  if (!Number.isFinite(n)) return FINANCE_OFFICE_DEFAULT_PAGE_SIZE;
  return Math.min(
    FINANCE_OFFICE_PAGE_SIZE_MAX,
    Math.max(FINANCE_OFFICE_PAGE_SIZE_MIN, Math.floor(n)),
  );
}

/**
 * Срез страницы после сортировки индекса. Пустой список → стр. 1.
 * Страница за пределами → последняя.
 */
export function sliceFinanceOfficePage<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): { slice: T[]; page: number; totalPages: number } {
  const size = parseFinanceOfficePageSize(String(pageSize));
  if (items.length === 0) {
    return { slice: [], page: 1, totalPages: 1 };
  }
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const rawPage = Number.isFinite(page) ? Math.floor(page) : 1;
  const safePage = Math.min(Math.max(1, rawPage), totalPages);
  const start = (safePage - 1) * size;
  return {
    slice: items.slice(start, start + size),
    page: safePage,
    totalPages,
  };
}

export function parseFinanceOfficeInvoiceIssuedParams(input: {
  invFrom?: string | null;
  invTo?: string | null;
}): {
  fromYmd: string | null;
  toYmd: string | null;
  error: string | null;
} {
  const fromRaw = input.invFrom?.trim() || "";
  const toRaw = input.invTo?.trim() || "";
  if (!fromRaw && !toRaw) {
    return { fromYmd: null, toYmd: null, error: null };
  }
  const toYmd = parseYmdOrNull(input.invTo);
  if (!toYmd) {
    return {
      fromYmd: null,
      toYmd: null,
      error: "Укажите дату «по» для «Счёт выставлен».",
    };
  }
  const fromYmd = parseYmdOrNull(input.invFrom);
  if (fromRaw && !fromYmd) {
    return {
      fromYmd: null,
      toYmd,
      error: "Некорректная дата «с» у счёта.",
    };
  }
  if (fromYmd && fromYmd > toYmd) {
    return {
      fromYmd,
      toYmd,
      error: "Дата «с» не может быть позже даты «по».",
    };
  }
  return { fromYmd, toYmd, error: null };
}

export function financeOfficeListHref(
  input: FinanceOfficeListHrefInput = {},
): string {
  const sp = new URLSearchParams();
  const tab = input.tab?.trim();
  const from = input.from?.trim();
  const to = input.to?.trim();
  const tag = input.tag?.trim();
  const q = input.q?.trim();
  const ship = String(input.ship ?? "").trim().toLowerCase();
  const shipFrom = input.shipFrom?.trim();
  const shipTo = input.shipTo?.trim();
  const invFrom = input.invFrom?.trim();
  const invTo = input.invTo?.trim();
  if (tab && tab !== "all") sp.set("tab", tab);
  if (from) sp.set("from", from);
  if (to) sp.set("to", to);
  if (tag) sp.set("tag", tag);
  if (q) sp.set("q", q);
  if (ship === "actual" || ship === "period") {
    sp.set("ship", ship);
    if (ship === "period") {
      if (shipFrom) sp.set("shipFrom", shipFrom);
      if (shipTo) sp.set("shipTo", shipTo);
    }
  }
  if (invFrom) sp.set("invFrom", invFrom);
  if (invTo) sp.set("invTo", invTo);
  const pageNum =
    input.page != null && Number.isFinite(input.page)
      ? Math.floor(input.page)
      : 0;
  if (pageNum > 1) {
    sp.set("page", String(Math.min(ORDERS_LIST_PAGE_NUM_MAX, pageNum)));
  }
  if (
    input.limit != null &&
    Number.isFinite(input.limit) &&
    input.limit >= 1
  ) {
    const lim = parseFinanceOfficePageSize(String(input.limit));
    if (lim !== FINANCE_OFFICE_DEFAULT_PAGE_SIZE) {
      sp.set("limit", String(lim));
    }
  }
  const qs = sp.toString();
  return qs ? `/finance-office?${qs}` : "/finance-office";
}
