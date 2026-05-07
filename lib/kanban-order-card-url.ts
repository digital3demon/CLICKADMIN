import { decodeOrderPublicRef, encodeOrderPublicRef } from "@/lib/order-public-ref";

/**
 * Id карточки на встроенном канбане CRM (совпадает с `mergeKaitenLinkedOrdersIntoAppState`).
 */
export function crmKanbanLinkedCardId(orderId: string): string {
  return `kaiten-order-${orderId}`;
}

/** Относительный URL страницы канбана с открытием карточки наряда. */
export function kanbanOrderDeepLinkPath(orderId: string): string {
  const params = new URLSearchParams({ orderRef: encodeOrderPublicRef(orderId) });
  return `/kanban?${params.toString()}`;
}

export function kanbanCardIdFromSearchParams(params: URLSearchParams): string | null {
  const card = params.get("card");
  if (card) return card;
  const orderRef = params.get("orderRef");
  if (!orderRef) return null;
  const orderId = decodeOrderPublicRef(orderRef);
  if (!orderId) return null;
  return crmKanbanLinkedCardId(orderId);
}
