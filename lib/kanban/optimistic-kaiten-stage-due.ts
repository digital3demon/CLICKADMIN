/** Пока PATCH due_date в полёте, входящий синг не должен откатывать срок. */
const OPTIMISTIC_STAGE_DUE_TTL_MS = 45_000;

const byOrderId = new Map<string, { ymd: string; until: number }>();

export function rememberOptimisticKanbanStageDue(
  orderId: string,
  ymd: string,
): void {
  const id = orderId.trim();
  if (!id) return;
  byOrderId.set(id, {
    ymd: ymd.trim(),
    until: Date.now() + OPTIMISTIC_STAGE_DUE_TTL_MS,
  });
}

export function forgetOptimisticKanbanStageDue(orderId: string): void {
  byOrderId.delete(orderId.trim());
}

/** true — не применять входящий срок (локальная запись ещё не подтверждена Kaiten). */
export function shouldSkipInboundKanbanStageDue(
  orderId: string,
  inboundYmd: string,
): boolean {
  const id = orderId.trim();
  const row = byOrderId.get(id);
  if (!row) return false;
  if (Date.now() >= row.until) {
    byOrderId.delete(id);
    return false;
  }
  if (row.ymd === inboundYmd.trim()) {
    byOrderId.delete(id);
    return false;
  }
  return true;
}
