"use client";

import type { ReactNode } from "react";
import { OrderListKaitenPoller } from "@/components/orders/OrderListKaitenPoller";

export function OrdersListKaitenChatShell({
  orderIds,
  pollingEnabled,
  /** Поиск по q: наряд мог не быть на странице до запроса — нужен агрессивный live-синк видимых строк. */
  searchActive = false,
  children,
}: {
  orderIds: string[];
  pollingEnabled: boolean;
  searchActive?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {pollingEnabled ? (
        <OrderListKaitenPoller orderIds={orderIds} searchActive={searchActive} />
      ) : null}
      {children}
    </>
  );
}
