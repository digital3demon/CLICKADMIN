/** Видимые модалки CRM — глобальный Ctrl+V с файлами только у верхней. */
function visibleModalDialogs(): HTMLElement[] {
  if (typeof document === "undefined") return [];
  return [
    ...document.querySelectorAll<HTMLElement>(
      '[role="dialog"][aria-modal="true"]',
    ),
  ].filter((el) => {
    const style = getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number.parseFloat(style.opacity) === 0
    ) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

function elementStackZIndex(el: HTMLElement): number {
  let node: HTMLElement | null = el;
  let maxZ = 0;
  while (node) {
    const z = Number.parseInt(getComputedStyle(node).zIndex, 10);
    if (Number.isFinite(z)) maxZ = Math.max(maxZ, z);
    node = node.parentElement;
  }
  return maxZ;
}

function isElementVisible(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Решает, может ли эта панель файлов обработать глобальную вставку.
 * Если открыта модалка «Новый наряд» поверх страницы редактирования — вставка
 * не должна дублироваться в оба наряда.
 */
export function shouldHandleOrderFilesGlobalPaste(
  panelRoot: HTMLElement,
): boolean {
  const dialogs = visibleModalDialogs();
  if (dialogs.length > 0) {
    const top = dialogs.reduce((best, el) =>
      elementStackZIndex(el) >= elementStackZIndex(best) ? el : best,
    );
    return top.contains(panelRoot);
  }

  const dialogAncestor = panelRoot.closest<HTMLElement>(
    '[role="dialog"][aria-modal="true"]',
  );
  if (dialogAncestor) {
    return isElementVisible(dialogAncestor);
  }
  return true;
}

/** Зона счёта / платёжки — глобальный paste из блока «Файлы» не должен перехватывать. */
export function isInsideOrderAccountingUploadZone(
  target: EventTarget | null,
): boolean {
  if (typeof document === "undefined") return false;
  const selector = '[data-order-accounting-upload="true"]';
  if (target instanceof Element && target.closest(selector)) return true;
  const active = document.activeElement;
  if (active instanceof Element && active.closest(selector)) return true;
  return false;
}
