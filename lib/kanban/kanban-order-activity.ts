/**
 * Журнал карточки наряда. Slim tenant JSON обнуляет card.activity —
 * храним в tenantClientState `kanbanActivityV1:{orderId}`.
 */
import type { CardActivity, KanbanAppState, KanbanCard } from "@/lib/kanban/types";
import { forEachKanbanCardInState } from "@/lib/kanban/kanban-stage-due";

export function kanbanOrderActivityStateKey(orderId: string): string {
  return `kanbanActivityV1:${orderId.trim()}`;
}

export const KANBAN_ORDER_ACTIVITY_MAX = 80;

type Stored = { activity?: unknown };

export function normalizeCardActivity(row: CardActivity): CardActivity {
  return {
    id: String(row.id || "").trim(),
    type: String(row.type || "update").trim() || "update",
    text: String(row.text || "").trim(),
    userId: String(row.userId || "").trim(),
    ...(row.actorLabel?.trim() ? { actorLabel: row.actorLabel.trim() } : {}),
    at: String(row.at || "").trim(),
  };
}

export function parseStoredKanbanOrderActivity(raw: unknown): CardActivity[] {
  if (!raw || typeof raw !== "object") return [];
  const list = (raw as Stored).activity;
  if (!Array.isArray(list)) return [];
  const out: CardActivity[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const n = normalizeCardActivity(item as CardActivity);
    if (!n.text || !n.at) continue;
    const key = n.id || `${n.at}:${n.text}:${n.userId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return out.slice(0, KANBAN_ORDER_ACTIVITY_MAX);
}

export function activityLooksLikeCreate(row: CardActivity): boolean {
  if (row.type === "create") return true;
  const t = (row.text || "").trim().toLowerCase();
  return t === "карточка создана" || t.startsWith("карточка создана");
}

/** Пустой incoming не затирает журнал (slim / плитка без activity). */
export function resolveKanbanOrderActivityToPersist(
  incoming: CardActivity[],
  existing: CardActivity[],
): CardActivity[] | "keep-existing" {
  if (incoming.length === 0 && existing.length > 0) return "keep-existing";
  return mergeKanbanOrderActivity(incoming, existing);
}

export function mergeKanbanOrderActivity(
  fromCard: CardActivity[] | undefined,
  fromStore: CardActivity[],
): CardActivity[] {
  const byKey = new Map<string, CardActivity>();
  for (const row of [...(fromCard || []), ...fromStore]) {
    const n = normalizeCardActivity(row);
    if (!n.text || !n.at) continue;
    const key = n.id || `${n.at}:${n.text}:${n.userId}`;
    if (!byKey.has(key)) byKey.set(key, n);
  }
  const out = [...byKey.values()].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return out.slice(0, KANBAN_ORDER_ACTIVITY_MAX);
}

export function seedKanbanCreatedActivity(
  card: Pick<KanbanCard, "id" | "linkedOrderId" | "createdAt" | "createdByUserId" | "activity">,
): CardActivity[] {
  const current = mergeKanbanOrderActivity(card.activity, []);
  if (current.some(activityLooksLikeCreate)) return current;
  const at = String(card.createdAt || "").trim();
  if (!at) return current;
  const oid = String(card.linkedOrderId || card.id || "").trim();
  return mergeKanbanOrderActivity(current, [
    {
      id: `act-created-${oid}`,
      type: "create",
      text: "Карточка создана",
      userId: String(card.createdByUserId || "").trim(),
      at,
    },
  ]);
}

export function collectLinkedOrderActivityFromState(
  state: KanbanAppState,
): Map<string, CardActivity[]> {
  const byOrder = new Map<string, CardActivity[]>();
  forEachKanbanCardInState(state, (card) => {
    const oid = String(card.linkedOrderId || "").trim();
    if (!oid) return;
    const rows = (card.activity || []).filter((a) => String(a.text || "").trim());
    if (rows.length === 0) return;
    const prev = byOrder.get(oid) ?? [];
    byOrder.set(oid, mergeKanbanOrderActivity(rows, prev));
  });
  return byOrder;
}
