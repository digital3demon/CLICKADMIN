/**
 * Тиры раскладки CRM.
 * Оболочка (сайдбар) — viewport + высота. Списки/формы — ширина main (@container crm-shell).
 * Совпадает с @custom-variant в app/globals.css.
 * Не подменять sm/md/lg по репо; Harmony/classic палитры не унифицировать.
 * Аналитика / почта / склад — те же токены, когда экран реально трогают.
 */
export const APP_SHELL_LAPTOP_MIN_W = 1024;
export const APP_SHELL_DESKTOP_MIN_W = 1400;
export const APP_SHELL_MIN_H = 560;

export const SHELL_LAPTOP_MEDIA =
  "(min-width: 1024px) and (min-height: 560px)";
export const SHELL_DESKTOP_MEDIA =
  "(min-width: 1400px) and (min-height: 560px)";

/**
 * Десктопный канбан: CSS zoom (не font-size на .kanban-root).
 * Tailwind rem считается от html, колонки в px — font-size их не жмёт.
 */
export const KANBAN_BOARD_DESKTOP_ZOOM = 0.875;

export function kanbanBoardDesktopZoom(): number {
  if (typeof window === "undefined") return 1;
  return window.matchMedia(SHELL_LAPTOP_MEDIA).matches
    ? KANBAN_BOARD_DESKTOP_ZOOM
    : 1;
}
