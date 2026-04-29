/**
 * Id карточки на встроенном канбане CRM (совпадает с `mergeKaitenLinkedOrdersIntoAppState`).
 */
export function crmKanbanLinkedCardId(orderId: string): string {
  return `kaiten-order-${orderId}`;
}

/** Относительный URL страницы канбана с открытием карточки наряда. */
export function kanbanOrderDeepLinkPath(orderId: string): string {
  const params = new URLSearchParams({ card: crmKanbanLinkedCardId(orderId) });
  return `/kanban?${params.toString()}`;
}
