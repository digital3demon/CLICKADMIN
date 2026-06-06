"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import type { ClientSessionBootstrap } from "@/lib/auth/client-session-bootstrap.server";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { UiDesignProvider } from "@/components/providers/UiDesignProvider";
import { SessionUserProvider } from "@/components/providers/SessionUserProvider";
import { NewOrderPanelProvider } from "@/components/orders/new-order-panel-context";

const NewOrderPanelLazy = dynamic(
  () =>
    import("@/components/orders/NewOrderPanel").then((m) => ({
      default: m.NewOrderPanel,
    })),
  { ssr: false },
);

function PreloadNewOrderPanel() {
  useEffect(() => {
    void import("@/components/orders/NewOrderPanel");
  }, []);
  return null;
}

export function AppProviders({
  children,
  sessionBootstrap = null,
}: {
  children: ReactNode;
  sessionBootstrap?: ClientSessionBootstrap | null;
}) {
  return (
    <ThemeProvider>
      <UiDesignProvider>
        <SessionUserProvider initial={sessionBootstrap}>
          <NewOrderPanelProvider>
            <PreloadNewOrderPanel />
            {children}
            <NewOrderPanelLazy />
          </NewOrderPanelProvider>
        </SessionUserProvider>
      </UiDesignProvider>
    </ThemeProvider>
  );
}
