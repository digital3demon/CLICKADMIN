/** Прямоугольник карточки на доске (viewport) — точка старта анимации модалки. */
export type KanbanCardOpenOrigin = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const KANBAN_CARD_MODAL_ANIM_MS = 240;

export function kanbanCardModalClosedTransform(
  panelRect: DOMRect,
  origin: KanbanCardOpenOrigin | null | undefined,
): string {
  if (!origin) {
    return "translate(0, 0) scale(0.94)";
  }
  const ox = origin.x + origin.width / 2;
  const oy = origin.y + origin.height / 2;
  const px = panelRect.left + panelRect.width / 2;
  const py = panelRect.top + panelRect.height / 2;
  const sx = Math.max(0.06, origin.width / panelRect.width);
  const sy = Math.max(0.06, origin.height / panelRect.height);
  const tx = ox - px;
  const ty = oy - py;
  return `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`;
}

export function readKanbanCardOpenOrigin(el: Element): KanbanCardOpenOrigin {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}
