import { getKaitenCardWebUrl } from "@/lib/kaiten-card-web-url";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";

export type ContinuationParentRef = {
  orderNumber: string;
  orderId?: string | null;
  kaitenCardId?: number | null;
};

/** Строка для описания карточки Kaiten (markdown-ссылка при наличии kaitenCardId). */
export function buildKaitenContinuationLine(
  parent: ContinuationParentRef,
): string {
  const num = parent.orderNumber.trim();
  if (!num) return "";
  const kid = parent.kaitenCardId;
  if (kid != null && Number.isFinite(kid)) {
    const url = getKaitenCardWebUrl(kid);
    if (url) return `Продолжение работы [${num}](${url})`;
  }
  return `Продолжение работы ${num}`;
}

/** Строка для описания карточки CRM-канбана (относительная ссылка на карточку родителя). */
export function buildKanbanContinuationLine(
  parent: ContinuationParentRef,
): string {
  const num = parent.orderNumber.trim();
  if (!num) return "";
  const orderId = parent.orderId?.trim();
  if (orderId) {
    const path = kanbanOrderDeepLinkPath(orderId);
    return `Продолжение работы [${num}](${path})`;
  }
  return `Продолжение работы ${num}`;
}
