/**
 * Тиры раскладки CRM.
 * Оболочка (сайдбар) — viewport + высота. Списки/формы — ширина main (@container crm-shell).
 * Совпадает с @custom-variant в app/globals.css.
 * Не подменять sm/md/lg по репо; Harmony/classic палитры не унифицировать.
 * Аналитика / почта / склад — те же токены, когда экран реально трогают.
 *
 * Канбан (laptop+): zoom подбирается по ширине main и числу колонок
 * (`kanbanBoardFitZoom`), чтобы 9 столбцов влезали без обрезки.
 * Высота — 100dvh / zoom, колонки stretch на всю рабочую область.
 * Узкий main / крупный масштаб браузера — min-width колонок + горизонтальный скролл.
 *
 * Единицы высоты (поколение 2):
 * - оболочка / full-screen: 100dvh (живой chrome) или min-h-dvh; не 100vh / min-h-screen;
 * - модалки / bottom-sheet: max-height min(90dvh, …); не 90vh;
 * - svh — если элемент не должен прыгать при появлении адресной строки;
 * - новые правки: голый 100vh / 90vh не добавлять.
 * Инвентарь наследия: login/public sticker — min-h-screen (вне CRM-shell);
 * кастомные оверлеи orders/finance/directory — 85vh/90vh, править при касании экрана.
 */
export const APP_SHELL_LAPTOP_MIN_W = 1024;
export const APP_SHELL_DESKTOP_MIN_W = 1400;
export const APP_SHELL_MIN_H = 560;

/** Развёрнутое левое меню (classic + AppShell). Было 1/7 — канбан с 9 колонками не влезал. */
export const APP_SIDEBAR_W_EXPANDED = "calc(100% / 8)";

export const SHELL_LAPTOP_MEDIA =
  "(min-width: 1024px) and (min-height: 560px)";
export const SHELL_DESKTOP_MEDIA =
  "(min-width: 1400px) and (min-height: 560px)";

/**
 * Десктопный канбан: CSS zoom (не font-size на .kanban-root).
 * Tailwind rem считается от html, колонки в px — font-size их не жмёт.
 * 0.875 — стартовая плотность, пока JS не подберёт fit-zoom.
 */
export const KANBAN_BOARD_DESKTOP_ZOOM = 0.875;

/** Предпочтительная ширина колонки в layout-px (до zoom). */
export const KANBAN_COL_PREFERRED_LAYOUT_PX = 240;
/**
 * Минимальная визуальная ширина колонки (CSS px после zoom).
 * Ниже — grid не сжимает дальше: горизонтальный скролл.
 */
export const KANBAN_COL_MIN_VISUAL_PX = 200;
export const KANBAN_BOARD_FIT_GAP_PX = 8;
export const KANBAN_BOARD_FIT_PAD_PX = 16;
/** Пол zoom: дальше не давим — помогают min-width колонок и скролл. */
export const KANBAN_BOARD_MIN_ZOOM = 0.78;
export const KANBAN_BOARD_MAX_ZOOM = 0.92;
/** Запас под субпиксели / скроллбар, чтобы крайний столбец не срезало. */
export const KANBAN_BOARD_FIT_SLACK_PX = 8;

let liveKanbanBoardZoom = KANBAN_BOARD_DESKTOP_ZOOM;

export function setKanbanBoardLiveZoom(zoom: number): void {
  liveKanbanBoardZoom = zoom;
}

export function kanbanBoardDesktopZoom(): number {
  if (typeof window === "undefined") return 1;
  if (!window.matchMedia(SHELL_LAPTOP_MEDIA).matches) return 1;
  return liveKanbanBoardZoom;
}

/**
 * Zoom так, чтобы N колонок влезли в availCssPx (ширина main после сайдбара).
 * Широкий экран — ближе к max; 9 колонок на ноутбуке — ниже, без обрезки.
 */
export function kanbanBoardFitZoom(
  availCssPx: number,
  columnCount: number,
  extraCssPx = 0,
): number {
  if (columnCount <= 0 || availCssPx <= 0) return 1;
  const usable = Math.max(
    0,
    availCssPx - extraCssPx - KANBAN_BOARD_FIT_SLACK_PX,
  );
  const gaps =
    Math.max(0, columnCount - 1) * KANBAN_BOARD_FIT_GAP_PX +
    KANBAN_BOARD_FIT_PAD_PX;
  const preferred = columnCount * KANBAN_COL_PREFERRED_LAYOUT_PX + gaps;
  if (preferred <= 0) return 1;
  return Math.min(
    KANBAN_BOARD_MAX_ZOOM,
    Math.max(KANBAN_BOARD_MIN_ZOOM, usable / preferred),
  );
}

/**
 * Визуальная ширина одной колонки при текущем fit-zoom (CSS px).
 * Если меньше `KANBAN_COL_MIN_VISUAL_PX` — нужен горизонтальный скролл.
 */
export function kanbanBoardColumnVisualWidthPx(
  availCssPx: number,
  columnCount: number,
  extraCssPx = 0,
): number {
  if (columnCount <= 0 || availCssPx <= 0) {
    return KANBAN_COL_PREFERRED_LAYOUT_PX;
  }
  const z = kanbanBoardFitZoom(availCssPx, columnCount, extraCssPx);
  const gaps =
    Math.max(0, columnCount - 1) * KANBAN_BOARD_FIT_GAP_PX +
    KANBAN_BOARD_FIT_PAD_PX;
  return (availCssPx - (gaps + extraCssPx) * z) / columnCount;
}

export function kanbanBoardNeedsHorizontalScroll(
  availCssPx: number,
  columnCount: number,
  extraCssPx = 0,
): boolean {
  return (
    kanbanBoardColumnVisualWidthPx(availCssPx, columnCount, extraCssPx) <
    KANBAN_COL_MIN_VISUAL_PX
  );
}
