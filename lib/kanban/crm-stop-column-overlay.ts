import {
  isKanbanStopColumnTitle,
  KANBAN_STOP_COLUMN_TITLE,
} from "@/lib/kanban/kanban-stop-column";

/**
 * Колонка для списков и формы наряда: CRM СТОП важнее зеркала Kaiten («Очередь»).
 */
export function overlayCrmStopColumnTitle(
  orderId: string,
  columnTitle: string | null | undefined,
  stoppedOrderIds: ReadonlySet<string>,
): string | null {
  const oid = String(orderId || "").trim();
  if (oid && stoppedOrderIds.has(oid)) return KANBAN_STOP_COLUMN_TITLE;
  if (isKanbanStopColumnTitle(columnTitle)) return KANBAN_STOP_COLUMN_TITLE;
  const t = String(columnTitle || "").trim();
  return t.length ? t : columnTitle ?? null;
}
