import type { KanbanAppState } from "@/lib/kanban/types";
import { resolveKanbanColumnByKaitenTitle } from "@/lib/kanban/kaiten-position-to-kanban";
import {
  findCardInAppState,
  isKanbanAggregateBoardId,
  KANBAN_BOARD_ORTHODONTICS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
  pushActivity,
} from "@/lib/kanban/model";

export function kanbanBoardIdForTrackLane(lane: string): string {
  return String(lane || "").trim().toUpperCase() === "ORTHODONTICS"
    ? KANBAN_BOARD_ORTHODONTICS_ID
    : KANBAN_BOARD_ORTHOPEDICS_ID;
}

export function normalizeKanbanTrackLane(
  raw: string | null | undefined,
): "ORTHOPEDICS" | "ORTHODONTICS" | null {
  const u = String(raw || "").trim().toUpperCase();
  if (u === "ORTHODONTICS") return "ORTHODONTICS";
  if (u === "ORTHOPEDICS") return "ORTHOPEDICS";
  return null;
}

/**
 * Перенос карточки на доску «Ортопедия» / «Ортодонтия» по полю «Расположение».
 * Колонку сохраняем по названию; sort_order — в конец связанных карточек.
 */
export function applyKanbanCardTrackLaneChange(
  state: KanbanAppState,
  cardId: string,
  laneRaw: string,
  opts: { activityUserId: string; activityActorLabel?: string },
): { ok: true; columnTitle: string; sortOrder: number } | { ok: false } {
  const lane = normalizeKanbanTrackLane(laneRaw);
  if (!lane) return { ok: false };
  const loc = findCardInAppState(state, cardId);
  if (!loc) return { ok: false };

  const targetId = kanbanBoardIdForTrackLane(lane);
  const target = state.boards.find((b) => b.id === targetId);
  if (!target?.columns.length) return { ok: false };

  const alreadyThere =
    loc.board.id === target.id && String(loc.card.trackLane || "") === lane;
  if (alreadyThere) return { ok: false };

  const fromCol = loc.col;
  const card = loc.card;
  fromCol.cards = fromCol.cards.filter((c) => c.id !== cardId);

  const toCol = resolveKanbanColumnByKaitenTitle(target, fromCol.title);
  const linkedSorts = toCol.cards
    .filter((c) => c.linkedOrderId)
    .map((c) => c.kaitenCardSortOrder)
    .filter((x): x is number => x != null && Number.isFinite(x));
  const sortOrder = (linkedSorts.length ? Math.max(...linkedSorts) : 0) + 1;
  card.kaitenCardSortOrder = sortOrder;
  card.trackLane = lane;
  const now = new Date().toISOString();
  card.updatedAt = now;
  card.lastMovedAt = now;
  toCol.cards.unshift(card);
  pushActivity(
    card,
    `Перенос на доску «${target.title}»`,
    opts.activityUserId,
    target,
    opts.activityActorLabel,
  );
  if (!isKanbanAggregateBoardId(state.activeBoardId)) {
    state.activeBoardId = target.id;
  }
  return { ok: true, columnTitle: toCol.title, sortOrder };
}
