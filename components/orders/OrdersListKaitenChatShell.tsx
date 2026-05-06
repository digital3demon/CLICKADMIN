"use client";

import type { ReactNode } from "react";
import { OrderListKaitenPoller } from "@/components/orders/OrderListKaitenPoller";

export function OrdersListKaitenChatShell({
  orderIds,
  pollingEnabled,
  children,
}: {
  orderIds: string[];
  pollingEnabled: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {pollingEnabled ? <OrderListKaitenPoller orderIds={orderIds} /> : null}
      {children}
    </>
  );
}
