"use client";

import type { ReactNode } from "react";
import { StickyListChrome } from "@/components/layout/StickyListChrome";
import { OrdersListColumnsProvider } from "@/components/orders/OrdersListColumnsProvider";
import { OrdersListDueTintProvider } from "@/components/orders/OrdersListDueTint";
import { useUiDesign } from "@/lib/hooks/useUiDesign";

export function OrdersListChrome({
  toolbar,
  children,
  className,
}: {
  toolbar: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const isHarmony = useUiDesign() === "harmony";

  return (
    <OrdersListColumnsProvider>
      <OrdersListDueTintProvider>
        <StickyListChrome
          className={className}
          harmonyUnifiedCard={isHarmony}
          toolbarClassName={isHarmony ? "orders-harmony-sticky-toolbar" : undefined}
          toolbar={toolbar}
        >
          {children}
        </StickyListChrome>
      </OrdersListDueTintProvider>
    </OrdersListColumnsProvider>
  );
}
