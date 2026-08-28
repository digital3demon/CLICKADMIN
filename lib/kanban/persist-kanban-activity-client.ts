import { writeClientState } from "@/lib/client-state-client";
import {
  KANBAN_ORDER_ACTIVITY_MAX,
  kanbanOrderActivityStateKey,
} from "@/lib/kanban/kanban-order-activity";
import type { CardActivity } from "@/lib/kanban/types";

export function persistKanbanOrderActivityClient(
  orderId: string | null | undefined,
  activity: readonly CardActivity[] | null | undefined,
): void {
  const oid = String(orderId || "").trim();
  if (!oid) return;
  const rows = (activity || [])
    .filter((a) => String(a.text || "").trim() && String(a.at || "").trim())
    .slice(0, KANBAN_ORDER_ACTIVITY_MAX);
  if (rows.length === 0) return;
  void writeClientState("tenant", kanbanOrderActivityStateKey(oid), {
    activity: rows,
  });
}
