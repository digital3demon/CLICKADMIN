"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { NewOrderPanelProvider } from "@/components/orders/new-order-panel-context";

const NewOrderPanelLazy = dynamic(
  () =>
    import("@/components/orders/NewOrderPanel").then((m) => ({
      default: m.NewOrderPanel,
    })),
  { ssr: false },
);

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <NewOrderPanelProvider>
        {children}
        <NewOrderPanelLazy />
      </NewOrderPanelProvider>
    </ThemeProvider>
  );
}
