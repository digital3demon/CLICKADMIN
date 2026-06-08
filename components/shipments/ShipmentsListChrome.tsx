"use client";

import type { ReactNode } from "react";
import { StickyListChrome } from "@/components/layout/StickyListChrome";
import { useUiDesign } from "@/lib/hooks/useUiDesign";

export function ShipmentsListChrome({
  toolbar,
  children,
  className,
  toolbarClassName,
}: {
  toolbar: ReactNode;
  children: ReactNode;
  className?: string;
  toolbarClassName?: string;
}) {
  const isHarmony = useUiDesign() === "harmony";

  return (
    <StickyListChrome
      className={className}
      harmonyUnifiedCard={isHarmony}
      toolbarClassName={
        isHarmony
          ? ["orders-harmony-sticky-toolbar", toolbarClassName ?? ""]
              .filter(Boolean)
              .join(" ")
          : toolbarClassName
      }
      toolbar={toolbar}
    >
      {children}
    </StickyListChrome>
  );
}
