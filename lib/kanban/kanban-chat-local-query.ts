/**
 * GET /api/orders/:id/kanban-chat?local=1 (или sync=0):
 * только CRM (наряд + persisted чат). Live Kaiten на GET больше не вызывается.
 */
export function isKanbanChatLocalOnlyRequest(url: URL): boolean {
  const local = url.searchParams.get("local");
  if (local === "1" || local === "true") return true;
  const sync = url.searchParams.get("sync");
  if (sync === "0" || sync === "false") return true;
  return false;
}
