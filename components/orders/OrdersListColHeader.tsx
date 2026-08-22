"use client";

import type { ReactNode } from "react";
import { useOrdersListColCollapse } from "@/components/orders/OrdersListColumnsProvider";
import {
  ORDERS_LIST_COL_LABELS,
  type OrdersListColId,
} from "@/lib/orders-list-collapsed-cols";

const TH =
  "min-w-0 overflow-hidden whitespace-nowrap px-1 py-1 text-center sm:px-1.5 sm:py-1.5";

function HideColIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M3.5 8h9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
      <div className="flex min-w-0 items-center justify-center gap-0.5">
        <div className="min-w-0 truncate">{children}</div>
        <button
          type="button"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-[var(--table-row-hover)] hover:text-[var(--app-text)] group-hover:opacity-100 focus-visible:opacity-100"
          title={`Скрыть столбец «${label}»`}
          aria-label={`Скрыть столбец ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            toggle(col);
          }}
        >
          <HideColIcon />
        </button>
      </div>
    </th>
  );
}

/** Узкая колонка точек: только свёрнутые столбцы, без щели table-fixed. */
export function OrdersListCollapsedDotsTh() {
  const { collapsed, toggle } = useOrdersListColCollapse();
  const n = collapsed.length;
  return (
    <th
      data-collapsed-rail=""
      className="overflow-hidden p-0 text-center"
      style={{ width: n ? n * 14 : 0, maxWidth: n ? n * 14 : 0 }}
      aria-label={n ? "Скрытые столбцы" : undefined}
    >
      {n ? (
        <div
          data-collapsed-dots=""
          className="flex items-center justify-center print:hidden"
        >
          {collapsed.map((id) => (
            <button
              key={id}
              type="button"
              className="inline-flex h-7 w-3.5 items-center justify-center rounded hover:bg-[var(--table-row-hover)]"
              title={`Показать столбец «${ORDERS_LIST_COL_LABELS[id]}»`}
              aria-label={`Показать столбец ${ORDERS_LIST_COL_LABELS[id]}`}
              onClick={(e) => {
                e.stopPropagation();
                toggle(id);
              }}
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]"
              />
            </button>
          ))}
        </div>
      ) : null}
    </th>
  );
}
