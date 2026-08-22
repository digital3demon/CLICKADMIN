"use client";

import type { ReactNode } from "react";
import { useOrdersListColCollapse } from "@/components/orders/OrdersListColumnsProvider";
import {
  ORDERS_LIST_COL_LABELS,
  type OrdersListColId,
} from "@/lib/orders-list-collapsed-cols";

const TH =
  "min-w-0 overflow-hidden whitespace-nowrap px-1 py-1 text-center sm:px-1.5 sm:py-1.5";

export function OrdersListColHeader({
  col,
  title,
  className,
  children,
}: {
  col: OrdersListColId;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  const { toggle } = useOrdersListColCollapse();
  const label = title ?? ORDERS_LIST_COL_LABELS[col];

  return (
    <th
      data-col={col}
      className={`group ${TH} ${className ?? ""}`}
      title={label}
    >
      <button
        type="button"
        data-col-dot
        className="mx-auto inline-flex h-7 w-full items-center justify-center"
        aria-label={`Показать столбец ${label}`}
        title={`Показать столбец «${label}»`}
        onClick={(e) => {
          e.stopPropagation();
          toggle(col);
        }}
      >
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)] group-hover:bg-[var(--sidebar-blue)]"
        />
      </button>
      <div
        data-col-body
        className="flex min-w-0 items-center justify-center gap-0.5"
      >
        <div className="min-w-0 truncate">{children}</div>
        <button
          type="button"
          className="shrink-0 rounded px-0.5 text-[10px] font-semibold leading-none text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-[var(--table-row-hover)] hover:text-[var(--app-text)] group-hover:opacity-80"
          title={`Скрыть столбец «${label}»`}
          aria-label={`Скрыть столбец ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            toggle(col);
          }}
        >
          −
        </button>
      </div>
    </th>
  );
}
