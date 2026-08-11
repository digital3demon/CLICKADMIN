/** Предпочтение ширины левого меню (desktop shell). */
export const APP_SIDEBAR_COLLAPSE_PREF_KEY = "dental-crm:app-sidebar-collapse";

/** Ниже этой ширины viewport меню само сворачивается в «рельс», если нет явного «развернуть». */
export const APP_SIDEBAR_AUTO_COLLAPSE_MAX_PX = 1400;

export const APP_SIDEBAR_W_COLLAPSED = "3.75rem";

export const APP_SHELL_DESKTOP_MIN_W = 1024;
export const APP_SHELL_DESKTOP_MIN_H = 560;

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

export function isAppShellDesktopViewport(width: number, height: number): boolean {
  return width >= APP_SHELL_DESKTOP_MIN_W && height >= APP_SHELL_DESKTOP_MIN_H;
}

/**
 * Свёрнутый рельс только в desktop-shell.
 * На мобильном/низком окне drawer всегда полный.
 */
export function resolveAppSidebarCollapsed(
  viewportWidth: number,
  viewportHeight: number,
  pref: AppSidebarCollapsePref,
): boolean {
  if (!isAppShellDesktopViewport(viewportWidth, viewportHeight)) return false;
  if (pref === "collapsed") return true;
  if (pref === "expanded") return false;
  return viewportWidth < APP_SIDEBAR_AUTO_COLLAPSE_MAX_PX;
}
