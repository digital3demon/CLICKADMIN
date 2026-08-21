"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  APP_SIDEBAR_AUTO_COLLAPSE_MAX_PX,
  APP_SHELL_DESKTOP_MIN_H,
  readAppSidebarCollapsePref,
  resolveAppSidebarCollapsed,
  writeAppSidebarCollapsePref,
  type AppSidebarCollapsePref,
} from "@/lib/app-sidebar-collapse";

type DesktopSidebarCollapseValue = {
  /** Свёрнуто в узкий рельс (только на shell-laptop / shell-desktop). */
  collapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (next: boolean) => void;
};

const DesktopSidebarCollapseContext =
  createContext<DesktopSidebarCollapseValue | null>(null);

export function DesktopSidebarCollapseProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [pref, setPref] = useState<AppSidebarCollapsePref>("auto");
  /* SSR/первый кадр: не сворачиваем (избегаем hydration mismatch), затем sync с окном. */
  const [viewportW, setViewportW] = useState(APP_SIDEBAR_AUTO_COLLAPSE_MAX_PX);
  const [viewportH, setViewportH] = useState(APP_SHELL_DESKTOP_MIN_H);

  useEffect(() => {
    setPref(readAppSidebarCollapsePref());
    const sync = () => {
      setViewportW(window.innerWidth);
      setViewportH(window.innerHeight);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const collapsed = resolveAppSidebarCollapsed(viewportW, viewportH, pref);

  const setCollapsed = useCallback((next: boolean) => {
    const nextPref: AppSidebarCollapsePref = next ? "collapsed" : "expanded";
    setPref(nextPref);
    writeAppSidebarCollapsePref(nextPref);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  const value = useMemo(
    () => ({ collapsed, toggleCollapsed, setCollapsed }),
    [collapsed, toggleCollapsed, setCollapsed],
  );

  return (
    <DesktopSidebarCollapseContext.Provider value={value}>
      {children}
    </DesktopSidebarCollapseContext.Provider>
  );
}

export function useDesktopSidebarCollapse(): DesktopSidebarCollapseValue {
  const ctx = useContext(DesktopSidebarCollapseContext);
  if (!ctx) {
    throw new Error(
      "useDesktopSidebarCollapse must be used within DesktopSidebarCollapseProvider",
    );
  }
  return ctx;
}

export function useDesktopSidebarCollapseOptional(): DesktopSidebarCollapseValue | null {
  return useContext(DesktopSidebarCollapseContext);
}
