"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_UI_DESIGN,
  isUiDesign,
  type UiDesign,
} from "@/lib/ui-design";

function readDesignFromDom(): UiDesign {
  if (typeof document === "undefined") return DEFAULT_UI_DESIGN;
  const v = document.documentElement.dataset.ui ?? null;
  return isUiDesign(v) ? v : DEFAULT_UI_DESIGN;
}

function subscribe(onStoreChange: () => void) {
  if (typeof document === "undefined") return () => {};
  const obs = new MutationObserver(onStoreChange);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-ui"],
  });
  return () => obs.disconnect();
}

export function useUiDesign(): UiDesign {
  return useSyncExternalStore(subscribe, readDesignFromDom, () => DEFAULT_UI_DESIGN);
}

export function isHarmonyUi(): boolean {
  return readDesignFromDom() === "harmony";
}
