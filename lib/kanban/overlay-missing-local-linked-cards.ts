/**
 * Tenant JSON — база merge. Поиск upsert’ит карточку только локально;
 * F5 без этого оверлея снова теряет наряд (и «МОИ» его не видит).
 */
import { forEachKanbanCardInState } from "@/lib/kanban/kanban-stage-due";
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";

function linkedOrderIdsInState(state: KanbanAppState): Set<string> {
  const ids = new Set<string>();
  forEachKanbanCardInState(state, (card) => {
    const oid = String(card.linkedOrderId || "").trim();
    if (oid) ids.add(oid);
  });
  return ids;
}

function placeLinkedCardOnRemoteBoard(
  remote: KanbanAppState,
  boardId: string,
  columnId: string,
  columnTitle: string,
  card: KanbanCard,
): boolean {
  const remoteBoard = remote.boards.find((b) => b.id === boardId);
  if (!remoteBoard?.columns?.length) return false;
  const titleNorm = columnTitle.trim().toLowerCase();
  const targetCol =
    remoteBoard.columns.find((c) => c.id === columnId) ??
    remoteBoard.columns.find((c) => c.title.trim().toLowerCase() === titleNorm) ??
    remoteBoard.columns[0];
  if (!targetCol) return false;
  targetCol.cards.unshift(structuredClone(card));
  return true;
}

/**
 * Карточки с `linkedOrderId`, которые есть локально, но пропали из remote
 * (неполный PUT / гонка debounce). Архив и СТОП remote не трогаем —
 * `forEach` уже видит их, повторно не кладём в колонку.
 */
export function overlayMissingLocalLinkedCardsOntoRemote(
  local: KanbanAppState,
  remote: KanbanAppState,
): boolean {
  const hidden = new Set(
    (remote.hiddenLinkedOrderIds || []).map((id) => String(id || "").trim()).filter(Boolean),
  );
  const remoteOids = linkedOrderIdsInState(remote);
  let changed = false;
  for (const localBoard of local.boards ?? []) {
    for (const localCol of localBoard.columns ?? []) {
      for (const card of localCol.cards ?? []) {
        const oid = String(card.linkedOrderId || "").trim();
        if (!oid || hidden.has(oid) || remoteOids.has(oid)) continue;
        if (
          placeLinkedCardOnRemoteBoard(
            remote,
            localBoard.id,
            localCol.id,
            localCol.title,
            card,
          )
        ) {
          remoteOids.add(oid);
          changed = true;
        }
      }
    }
  }
  return changed;
}
