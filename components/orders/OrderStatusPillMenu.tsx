"use client";

import { createPortal } from "react-dom";
import { useCallback, useRef, useState } from "react";
import { useFixedDropdownPosition } from "@/components/ui/use-fixed-dropdown-position";
import type { OrderStatus } from "@prisma/client";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_ORDER,
} from "@/lib/order-status-labels";
import { useMenuDismiss } from "@/components/orders/LabStatusPillMenu";

function ChevronMini({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 opacity-75 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

const BTN =
  "inline-flex min-h-9 max-w-[min(100vw-8rem,14rem)] items-center gap-1.5 rounded-full border border-[var(--card-border)] bg-[var(--surface-muted)] px-2.5 py-1.5 text-left text-[11px] font-semibold text-[var(--text-body)] shadow-sm sm:min-h-10 sm:px-3 sm:text-xs";

export function OrderStatusPillMenu({
  value,
  onChange,
}: {
  value: OrderStatus;
  onChange: (v: OrderStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useMenuDismiss(open, close, wrapRef, listRef);
  const pos = useFixedDropdownPosition(open, buttonRef, {
    maxListHeight: 288,
    minWidthPx: 176,
  });
  const label = ORDER_STATUS_LABELS[value];

  return (
    <div className="relative z-[60]" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={BTN}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Статус заказа: ${label}. Открыть список`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">{label}</span>
        <ChevronMini open={open} />
      </button>
      {typeof document !== "undefined" && open
        ? createPortal(
            <ul
              ref={listRef}
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxHeight,
                zIndex: 10000,
              }}
              className="overflow-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] py-1 shadow-xl"
              role="listbox"
              aria-label="Статус заказа"
            >
              {ORDER_STATUS_ORDER.map((key) => (
                <li key={key} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={key === value}
                    className={`flex w-full items-center px-3 py-2 text-left text-xs font-medium hover:bg-[var(--surface-hover)] ${
                      key === value
                        ? "bg-[var(--surface-hover)] text-[var(--app-text)]"
                        : "text-[var(--text-body)]"
                    }`}
                    onClick={() => {
                      onChange(key);
                      setOpen(false);
                    }}
                  >
                    {ORDER_STATUS_LABELS[key]}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
