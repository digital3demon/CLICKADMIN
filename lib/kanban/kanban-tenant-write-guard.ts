/**
 * PUT kanbanAppStateV3 с пустым/черновым снимком не должен затирать живые доски.
 * F5: memory-кеш пуст → defaultAppState → pagehide/unmount успевал записать «ноль».
 */
import { forEachKanbanCardInState } from "@/lib/kanban/kanban-stage-due";
import type { KanbanAppState } from "@/lib/kanban/types";

export function countKanbanCardsForWriteGuard(state: KanbanAppState): {
  linked: number;
  other: number;
} {
  let linked = 0;
  let other = 0;
  forEachKanbanCardInState(state, (card) => {
    if (String(card.linkedOrderId || "").trim()) linked += 1;
    else other += 1;
  });
  return { linked, other };
}

/** Входящий снимок явно беднее сохранённого — не писать в tenant. */
export function shouldSkipSparseKanbanTenantWrite(
  incoming: KanbanAppState,
  stored: KanbanAppState,
): boolean {
  const inc = countKanbanCardsForWriteGuard(incoming);
  const sto = countKanbanCardsForWriteGuard(stored);
  const incTotal = inc.linked + inc.other;
  const stoTotal = sto.linked + sto.other;
  if (incTotal === 0 && stoTotal > 0) return true;
  if (inc.linked === 0 && sto.linked > 0) return true;
  if (sto.linked >= 8 && inc.linked < Math.ceil(sto.linked * 0.25)) return true;
  return false;
}
