"use client";

/** Абсолютная ссылка на карточку CRM-канбана (текущая страница + query card/board). */
export function kanbanCardAbsoluteUrl(cardId: string, boardId: string): string {
  if (typeof window === "undefined") return "";
  const basePath = window.location.pathname.split("?")[0] || "/kanban";
  const q = new URLSearchParams({ card: cardId, board: boardId });
  return `${window.location.origin}${basePath}?${q.toString()}`;
}
