"use client";

import type { ReactNode } from "react";
import { useOrdersListColCollapse } from "@/components/orders/OrdersListColumnsProvider";
import {
  collapsedRunAtStart,
  collapsedRunsAfter,
  firstVisibleColId,
  ORDERS_LIST_COL_LABELS,
  type OrdersListColId,
} from "@/lib/orders-list-collapsed-cols";

const TH =
  "relative min-w-0 overflow-visible whitespace-nowrap px-1 py-1 text-center sm:px-1.5 sm:py-1.5";

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

function RestoreDots({
  ids,
  toggle,
  edge,
}: {
  ids: OrdersListColId[];
  toggle: (id: OrdersListColId) => void;
  edge: "start" | "end";
}) {
  if (!ids.length) return null;
  return (
    <div
      data-collapsed-dots=""
      className={[
        "absolute top-1/2 z-20 flex -translate-y-1/2 print:hidden",
        edge === "start" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2",
      ].join(" ")}
    >
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          className="inline-flex h-6 w-3 items-center justify-center rounded hover:bg-[var(--table-row-hover)]"
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
  const { collapsed, isCollapsed, toggle } = useOrdersListColCollapse();
  const label = title ?? ORDERS_LIST_COL_LABELS[col];
  if (isCollapsed(col)) return null;

  const after = collapsedRunsAfter(col, collapsed);
  const lead =
    firstVisibleColId(collapsed) === col
      ? collapsedRunAtStart(collapsed)
      : [];

  return (
    <th
      data-col={col}
      className={`group ${TH} ${className ?? ""}`}
      title={label}
    >
      <div className="relative flex min-w-0 items-center justify-center px-0.5">
        <div className="min-w-0 whitespace-nowrap">{children}</div>
        <button
          type="button"
          tabIndex={-1}
          className="pointer-events-none absolute inset-y-0 right-0 z-10 inline-flex w-6 items-center justify-center rounded text-[var(--text-muted)] opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100 hover:bg-[var(--table-row-hover)] hover:text-[var(--app-text)]"
          title={`Скрыть столбец «${label}»`}
          aria-label={`Скрыть столбец ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            toggle(col);
          }}
        >
          <HideColIcon />
        </button>
        <RestoreDots ids={lead} toggle={toggle} edge="start" />
        <RestoreDots ids={after} toggle={toggle} edge="end" />
      </div>
    </th>
  );
}
