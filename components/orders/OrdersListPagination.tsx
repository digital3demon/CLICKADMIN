"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { OrdersListPagerLink } from "@/components/orders/OrdersListPagerLink";
import {
  buildOrdersListPageItems,
  buildOrdersListPageItemsUnknownTotal,
} from "@/lib/orders-list-page-items";
import {
  ordersListHref,
  parseOrdersListPage,
  type OrdersListHrefShipmentOpts,
} from "@/lib/orders-list-query";

export type OrdersListPaginationHrefOpts = {
  limit?: number;
  tag?: string | null;
  hideShipped?: boolean;
  onlyShipped?: boolean;
  q?: string | null;
  from?: string | null;
  to?: string | null;
  ship?: OrdersListHrefShipmentOpts["ship"];
  shipFrom?: string | null;
  shipTo?: string | null;
  otprFrom?: string | null;
  otprTo?: string | null;
};

const pagerBtnClass =
  "rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]";
const pagerBtnDisabledClass =
  "rounded-lg border border-transparent px-3 py-1.5 text-xs text-[var(--text-placeholder)]";
const pageNumClass =
  "inline-flex min-w-8 justify-center rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--table-row-hover)]";

function hrefFor(
  opts: OrdersListPaginationHrefOpts,
  page: number,
): string {
  return ordersListHref({ ...opts, page });
}

function OrdersListPageJump({
  currentPage,
  totalPages,
  hrefOpts,
}: {
  currentPage: number;
  totalPages: number | null;
  hrefOpts: OrdersListPaginationHrefOpts;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(String(currentPage));

  useEffect(() => {
    setDraft(String(currentPage));
  }, [currentPage]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    let n = parseOrdersListPage(draft);
    if (totalPages != null) {
      n = Math.min(n, Math.max(1, totalPages));
    }
    if (n === currentPage) return;
    router.push(hrefFor(hrefOpts, n));
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"
    >
      <label className="flex items-center gap-1.5">
        <span className="shrink-0">Перейти</span>
        <input
          type="number"
          min={1}
          max={totalPages ?? undefined}
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-8 w-14 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-1.5 text-center font-mono text-xs tabular-nums text-[var(--app-text)]"
          aria-label="Номер страницы"
        />
      </label>
      <button
        type="submit"
        className="h-8 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
      >
        OK
      </button>
    </form>
  );
}

export function OrdersListPagination({
  totalCount,
  pageSize,
  currentPage,
  hasMore,
  hrefOpts,
  pageSizeControl,
}: {
  totalCount: number | null;
  pageSize: number;
  currentPage: number;
  hasMore: boolean;
  hrefOpts: OrdersListPaginationHrefOpts;
  pageSizeControl?: ReactNode;
}) {
  const knownTotal = totalCount != null;
  const totalPages = knownTotal
    ? Math.max(1, Math.ceil(totalCount / pageSize))
    : null;
  const showNumbers =
    (totalPages != null && totalPages > 1) ||
    (!knownTotal && (hasMore || currentPage > 1));

  const from = (currentPage - 1) * pageSize + 1;
  const to =
    totalCount != null
      ? Math.min(currentPage * pageSize, totalCount)
      : currentPage * pageSize;

  const items = knownTotal
    ? buildOrdersListPageItems(totalPages!, currentPage, (p) =>
        hrefFor(hrefOpts, p),
      )
    : buildOrdersListPageItemsUnknownTotal(currentPage, hasMore, (p) =>
        hrefFor(hrefOpts, p),
      );

  const prevHref =
    currentPage > 1 ? hrefFor(hrefOpts, currentPage - 1) : null;
  const nextHref =
    (totalPages != null && currentPage < totalPages) ||
    (totalPages == null && hasMore)
      ? hrefFor(hrefOpts, currentPage + 1)
      : null;

  return (
    <div className="no-print flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-2">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-1">
        {totalCount !== 0 || currentPage > 1 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            {knownTotal ? (
              <>
                Показано{" "}
                <span className="font-medium tabular-nums text-[var(--app-text)]">
                  {from}–{to}
                </span>{" "}
                из{" "}
                <span className="font-medium tabular-nums text-[var(--app-text)]">
                  {totalCount}
                </span>
                {totalPages != null && totalPages > 1 ? (
                  <>
                    {" "}
                    · стр.{" "}
                    <span className="font-medium tabular-nums text-[var(--app-text)]">
                      {currentPage}
                    </span>{" "}
                    из {totalPages}
                  </>
                ) : null}
              </>
            ) : (
              <>
                Стр.{" "}
                <span className="font-medium tabular-nums text-[var(--app-text)]">
                  {currentPage}
                </span>
                {hasMore ? " · есть ещё" : null}
              </>
            )}
          </p>
        ) : null}
        {showNumbers ? (
          <div className="flex flex-wrap items-center gap-2">
            {prevHref ? (
              <OrdersListPagerLink href={prevHref} className={pagerBtnClass}>
                Назад
              </OrdersListPagerLink>
            ) : (
              <span className={pagerBtnDisabledClass}>Назад</span>
            )}
            <nav className="flex flex-wrap items-center gap-1" aria-label="Страницы">
              {items.map((it, i) =>
                it.kind === "gap" ? (
                  <span
                    key={`gap-${i}`}
                    className="px-1 text-xs text-[var(--text-placeholder)]"
                    aria-hidden
                  >
                    …
                  </span>
                ) : it.current ? (
                  <span
                    key={it.page}
                    className="inline-flex min-w-8 justify-center rounded-md bg-[var(--sidebar-blue)] px-2 py-1 text-xs font-semibold text-white"
                    aria-current="page"
                  >
                    {it.page}
                  </span>
                ) : (
                  <OrdersListPagerLink
                    key={it.page}
                    href={it.href}
                    pendingLabel="…"
                    className={pageNumClass}
                  >
                    {it.page}
                  </OrdersListPagerLink>
                ),
              )}
            </nav>
            {nextHref ? (
              <OrdersListPagerLink href={nextHref} className={pagerBtnClass}>
                Вперёд
              </OrdersListPagerLink>
            ) : (
              <span className={pagerBtnDisabledClass}>Вперёд</span>
            )}
            {showNumbers ? (
              <OrdersListPageJump
                currentPage={currentPage}
                totalPages={totalPages}
                hrefOpts={hrefOpts}
              />
            ) : null}
          </div>
        ) : null}
      </div>
      {pageSizeControl ? (
        <div className="min-w-0 sm:ml-auto sm:max-w-[min(100%,28rem)]">
          {pageSizeControl}
        </div>
      ) : null}
    </div>
  );
}
