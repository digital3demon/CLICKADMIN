/**
 * Кладёт плитки CRM на колонки доски. Не пишет description/files.
 */
import type { CrmBoardTile } from "@/lib/kanban/crm-board-tile";
import { seedKanbanCreatedActivity } from "@/lib/kanban/kanban-order-activity";
import { getKanbanStageDue, setKanbanStageDue } from "@/lib/kanban/kanban-stage-due";
import {
  createCard,
  isKanbanAggregateBoardId,
  KANBAN_BOARD_PRODUCTION_ID,
  resolveOrderKanbanColumnFromKaitenMirrorTitle,
} from "@/lib/kanban/model";
import {
  shouldKeepLocalKanbanMembers,
  shouldKeepLocalKanbanStageDue,
} from "@/lib/kanban/preserve-kanban-card-head";
import { crmKanbanLinkedCardId } from "@/lib/kanban-order-card-url";
import { ensureKanbanBoardCardType } from "@/lib/kanban/resolve-kanban-card-type";
import type { KanbanAppState, KanbanBoard, KanbanCard } from "@/lib/kanban/types";

function findLinkedOnBoard(
  state: KanbanAppState,
  boardId: string,
  orderId: string,
): { colIndex: number; cardIndex: number } | null {
  const board = state.boards.find((b) => b.id === boardId);
  if (!board) return null;
  for (let ci = 0; ci < board.columns.length; ci += 1) {
    const col = board.columns[ci]!;
    const idx = col.cards.findIndex((c) => c.linkedOrderId === orderId);
    if (idx >= 0) return { colIndex: ci, cardIndex: idx };
  }
  return null;
}

function parkedLinkedOrderIds(board: KanbanBoard): Set<string> {
  const ids = new Set<string>();
  for (const row of board.stoppedCards || []) {
    const oid = String(row.card?.linkedOrderId || "").trim();
    if (oid) ids.add(oid);
  }
  for (const row of board.archivedCards || []) {
    const oid = String(row.card?.linkedOrderId || "").trim();
    if (oid) ids.add(oid);
  }
  return ids;
}

function applyTileToCard(
  card: KanbanCard,
  tile: CrmBoardTile,
  board: KanbanBoard,
): void {
  card.title = tile.title;
  card.linkedOrderId = tile.orderId;
  card.linkedOrderNumber = tile.orderNumber;
  const typeId = ensureKanbanBoardCardType(board, tile);
  if (typeId) card.cardTypeId = typeId;
  if (
    !shouldKeepLocalKanbanMembers(card, {
      assignees: tile.assignees,
      participants: tile.participants,
    })
  ) {
    card.assignees = [...tile.assignees];
    card.participants = [...tile.participants];
  }
  const localDue = getKanbanStageDue(card);
  if (!shouldKeepLocalKanbanStageDue(localDue, tile.stageDueYmd)) {
    if (tile.stageDueYmd) setKanbanStageDue(card, tile.stageDueYmd);
  }
  card.urgent = tile.urgent;
  card.blocked = tile.blocked;
  card.blockReason = tile.blockReason;
  card.kaitenCardSortOrder = tile.sortOrder;
  card.trackLane = tile.trackLane || card.trackLane || "";
  if (tile.createdAt && (!card.createdAt || tile.createdAt < card.createdAt)) {
    card.createdAt = tile.createdAt;
  }
  card.updatedAt = tile.updatedAt;
  card.activity = seedKanbanCreatedActivity(card);
}

function sortColumnByCrmOrder(cards: KanbanCard[]): void {
  cards.sort((a, b) => {
    const ao = a.kaitenCardSortOrder;
    const bo = b.kaitenCardSortOrder;
    const an = ao != null && Number.isFinite(ao) ? ao : Number.POSITIVE_INFINITY;
    const bn = bo != null && Number.isFinite(bo) ? bo : Number.POSITIVE_INFINITY;
    if (an !== bn) return an - bn;
    return String(a.id).localeCompare(String(b.id));
  });
}

export function applyCrmBoardTilesToAppState(
  state: KanbanAppState,
  tiles: readonly CrmBoardTile[],
  opts?: { replaceBoardId?: string | null; pruneMemberUserId?: string | null },
): KanbanAppState {
  const next = structuredClone(state);
  const seenOnBoard = new Map<string, Set<string>>();
  const parkedByBoard = new Map(
    (next.boards || []).map((b) => [b.id, parkedLinkedOrderIds(b)] as const),
  );
  for (const tile of tiles) {
    const board = next.boards.find((b) => b.id === tile.boardId);
    if (!board?.columns.length) continue;
    if (parkedByBoard.get(board.id)?.has(tile.orderId)) continue;
    const targetCol = resolveOrderKanbanColumnFromKaitenMirrorTitle(
      board,
      tile.columnTitle,
    );
    const found = findLinkedOnBoard(next, board.id, tile.orderId);
    if (found) {
      const fromCol = board.columns[found.colIndex]!;
      const [card] = fromCol.cards.splice(found.cardIndex, 1);
      if (!card) continue;
      applyTileToCard(card, tile, board);
      if (fromCol.id !== targetCol.id) {
        targetCol.cards.push(card);
      } else {
        targetCol.cards.splice(Math.min(found.cardIndex, targetCol.cards.length), 0, card);
      }
    } else {
      const card = createCard({
        id: crmKanbanLinkedCardId(tile.orderId),
        title: tile.title,
        description: "",
        cardTypeId: ensureKanbanBoardCardType(board, tile),
        linkedOrderId: tile.orderId,
        linkedOrderNumber: tile.orderNumber,
        assignees: tile.assignees,
        participants: tile.participants,
        urgent: tile.urgent,
        blocked: tile.blocked,
        blockReason: tile.blockReason,
        kaitenCardSortOrder: tile.sortOrder,
        trackLane: tile.trackLane || "",
        createdAt: tile.createdAt || undefined,
      });
      if (tile.stageDueYmd) setKanbanStageDue(card, tile.stageDueYmd);
      card.activity = seedKanbanCreatedActivity(card);
      targetCol.cards.push(card);
    }
    const set = seenOnBoard.get(board.id) ?? new Set<string>();
    set.add(tile.orderId);
    seenOnBoard.set(board.id, set);
  }

  const replaceId = (opts?.replaceBoardId || "").trim();
  if (replaceId) {
    const board = next.boards.find((b) => b.id === replaceId);
    const keep = seenOnBoard.get(replaceId) ?? new Set<string>();
    if (board) {
      for (const col of board.columns) {
        col.cards = col.cards.filter((c) => {
          const oid = String(c.linkedOrderId || "").trim();
          if (!oid) return true;
          return keep.has(oid);
        });
      }
    }
  }

  const pruneUid = String(opts?.pruneMemberUserId || "").trim();
  if (pruneUid) {
    const keep = new Set(tiles.map((t) => t.orderId));
    for (const board of next.boards || []) {
      if (isKanbanAggregateBoardId(board.id) || board.id === KANBAN_BOARD_PRODUCTION_ID) {
        continue;
      }
      for (const col of board.columns) {
        col.cards = col.cards.filter((c) => {
          const oid = String(c.linkedOrderId || "").trim();
          if (!oid) return true;
          if (keep.has(oid)) return true;
          const mine =
            (c.assignees || []).includes(pruneUid) ||
            (c.participants || []).includes(pruneUid);
          return !mine;
        });
      }
    }
  }

  const touched = new Set<string>([
    ...seenOnBoard.keys(),
    ...(replaceId ? [replaceId] : []),
  ]);
  for (const board of next.boards || []) {
    if (!touched.has(board.id) && !pruneUid) continue;
    if (isKanbanAggregateBoardId(board.id)) continue;
    for (const col of board.columns) {
      sortColumnByCrmOrder(col.cards);
    }
  }
  return next;
}
