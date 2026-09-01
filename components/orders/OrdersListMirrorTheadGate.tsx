"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { SHELL_LAPTOP_MEDIA } from "@/lib/crm-layout-tiers";

function subscribeWide(cb: () => void) {
  const mq = window.matchMedia(SHELL_LAPTOP_MEDIA);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getWideSnapshot() {
  return window.matchMedia(SHELL_LAPTOP_MEDIA).matches;
}

/** SSR / узкий первый paint: без mirror — меньше DOM на мобильных. */
function getWideServerSnapshot() {
  return false;
}

/** Липкая mirror-шапка таблицы заказов — только shell-laptop+, не CSS hidden. */
export function OrdersListMirrorTheadGate({ children }: { children: ReactNode }) {
  const wide = useSyncExternalStore(
    subscribeWide,
    getWideSnapshot,
    getWideServerSnapshot,
  );
  if (!wide) return null;
  return <>{children}</>;
}
