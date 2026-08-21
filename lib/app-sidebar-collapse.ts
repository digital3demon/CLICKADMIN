import {
  APP_SHELL_DESKTOP_MIN_W,
  APP_SHELL_LAPTOP_MIN_W,
  APP_SHELL_MIN_H,
} from "@/lib/crm-layout-tiers";

/** Предпочтение ширины левого меню (laptop/desktop shell). */
export const APP_SIDEBAR_COLLAPSE_PREF_KEY = "dental-crm:app-sidebar-collapse";

/** Ниже этой ширины viewport меню само сворачивается в «рельс», если нет явного «развернуть». */
export const APP_SIDEBAR_AUTO_COLLAPSE_MAX_PX = 1400;

export const APP_SIDEBAR_W_COLLAPSED = "3.75rem";

/** Совпадает с CSS-вариантами `shell-laptop` / `shell-desktop` (globals.css). */
export { APP_SHELL_DESKTOP_MIN_W, APP_SHELL_LAPTOP_MIN_W };
export const APP_SHELL_DESKTOP_MIN_H = APP_SHELL_MIN_H;

export type AppSidebarCollapsePref = "collapsed" | "expanded" | "auto";

export function readAppSidebarCollapsePref(): AppSidebarCollapsePref {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = window.localStorage.getItem(APP_SIDEBAR_COLLAPSE_PREF_KEY);
    if (raw === "collapsed" || raw === "expanded") return raw;
  } catch {
    /* ignore */
  }
  return "auto";
}

export function writeAppSidebarCollapsePref(pref: AppSidebarCollapsePref): void {
  if (typeof window === "undefined") return;
  try {
    if (pref === "auto") {
      window.localStorage.removeItem(APP_SIDEBAR_COLLAPSE_PREF_KEY);
    } else {
      window.localStorage.setItem(APP_SIDEBAR_COLLAPSE_PREF_KEY, pref);
    }
  } catch {
    /* ignore */
  }
}

export function isAppShellLaptopViewport(width: number, height: number): boolean {
  return width >= APP_SHELL_LAPTOP_MIN_W && height >= APP_SHELL_MIN_H;
}

export function isAppShellDesktopViewport(width: number, height: number): boolean {
  return width >= APP_SHELL_DESKTOP_MIN_W && height >= APP_SHELL_MIN_H;
}

/**
 * Свёрнутый рельс только в laptop/desktop-shell.
 * На мобильном/низком окне drawer всегда полный.
 * auto: рельс на laptop (<1400), развёрнуто на широком desktop.
 */
export function resolveAppSidebarCollapsed(
  viewportWidth: number,
  viewportHeight: number,
  pref: AppSidebarCollapsePref,
): boolean {
  if (!isAppShellLaptopViewport(viewportWidth, viewportHeight)) return false;
  if (pref === "collapsed") return true;
  if (pref === "expanded") return false;
  return viewportWidth < APP_SIDEBAR_AUTO_COLLAPSE_MAX_PX;
}
