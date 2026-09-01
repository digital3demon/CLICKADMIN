"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { OrdersListPagerLink } from "@/components/orders/OrdersListPagerLink";
import { buildOrdersListPageItems } from "@/lib/orders-list-page-items";
import { parseOrdersListPage } from "@/lib/orders-list-query";
import {
  financeOfficeListHref,
  type FinanceOfficeListHrefInput,
} from "@/lib/finance-office-list-query";

export type FinanceOfficeListPaginationHrefOpts = FinanceOfficeListHrefInput;

const pagerBtnClass =
  "rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]";
const pagerBtnDisabledClass =
  "rounded-lg border border-transparent px-3 py-1.5 text-xs text-[var(--text-placeholder)]";
const pageNumClass =
  "inline-flex min-w-8 justify-center rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--table-row-hover)]";

function hrefFor(
  opts: FinanceOfficeListPaginationHrefOpts,
  page: number,
): string {
  return financeOfficeListHref({ ...opts, page });
}

function FinanceOfficePageJump({
  currentPage,
  totalPages,
  hrefOpts,
}: {
  currentPage: number;
  totalPages: number;
  hrefOpts: FinanceOfficeListPaginationHrefOpts;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(String(currentPage));

  useEffect(() => {
    setDraft(String(currentPage));
  }, [currentPage]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const n = Math.min(parseOrdersListPage(draft), Math.max(1, totalPages));
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
          max={totalPages}
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

export function FinanceOfficeListPagination({
  totalCount,
  pageSize,
  currentPage,
  hrefOpts,
}: {
  totalCount: number;
  pageSize: number;
  currentPage: number;
  hrefOpts: FinanceOfficeListPaginationHrefOpts;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1);
  const showNumbers = totalPages > 1;
  const from = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalCount);
  const items = buildOrdersListPageItems(totalPages, currentPage, (p) =>
    hrefFor(hrefOpts, p),
  );
  const prevHref = currentPage > 1 ? hrefFor(hrefOpts, currentPage - 1) : null;
  const nextHref =
    currentPage < totalPages ? hrefFor(hrefOpts, currentPage + 1) : null;

  if (totalCount === 0 && currentPage <= 1) return null;

  return (
    <div className="no-print flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-2">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-1">
        <p className="text-sm text-[var(--text-secondary)]">
          Показано{" "}
          <span className="font-medium tabular-nums text-[var(--app-text)]">
            {from}–{to}
          </span>{" "}
          из{" "}
          <span className="font-medium tabular-nums text-[var(--app-text)]">
            {totalCount}
          </span>
          {totalPages > 1 ? (
            <>
              {" "}
              · стр.{" "}
              <span className="font-medium tabular-nums text-[var(--app-text)]">
                {currentPage}
              </span>{" "}
              из {totalPages}
            </>
          ) : null}
        </p>
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
            <FinanceOfficePageJump
              currentPage={currentPage}
              totalPages={totalPages}
              hrefOpts={hrefOpts}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
