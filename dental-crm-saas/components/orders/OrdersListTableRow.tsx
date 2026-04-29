"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

function targetInsideInteractive(target: EventTarget | null) {
  if (target == null || !(target instanceof Node)) return false;
  const el =
    target instanceof Element ? target : (target.parentElement ?? null);
  if (!el) return false;
  return Boolean(
    el.closest(
      "a, button, input, select, textarea, label, [role='button'], [role='combobox'], [data-row-click-ignore]",
    ),
  );
}

/**
 * Строка списка нарядов: клик по пустой области ведёт в карточку наряда
 * (клики по ссылкам, кнопкам и полям — без перехода).
 */
export function OrdersListTableRow({
  orderId,
  orderNumber,
  className,
  children,
}: {
  orderId: string;
  orderNumber: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const href = `/orders/${orderId}`;

  const go = (
    e: MouseEvent<HTMLTableRowElement> | KeyboardEvent<HTMLTableRowElement>,
  ) => {
    if ("button" in e && e.button !== 0) return;
    if ("metaKey" in e && (e.metaKey || e.ctrlKey)) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(href);
  };

  return (
    <tr
      className={className ? `${className} cursor-pointer` : "cursor-pointer"}
      onClick={(e) => {
        if (targetInsideInteractive(e.target)) return;
        go(e);
      }}
      title={`${orderNumber} — открыть наряд (клик по строке)`}
    >
      {children}
    </tr>
  );
}
