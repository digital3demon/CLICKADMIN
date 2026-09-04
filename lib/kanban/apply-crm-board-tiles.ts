/**
 * Кладёт плитки CRM на колонки доски. Не пишет description/files.
 */
import type { CrmBoardTile } from "@/lib/kanban/crm-board-tile";
import { kanbanBoardIdFromTrackLane } from "@/lib/kanban/crm-board-tile";
import { seedKanbanCreatedActivity } from "@/lib/kanban/kanban-order-activity";
import { getKanbanStageDue, setKanbanStageDue } from "@/lib/kanban/kanban-stage-due";
import {
  createCard,
  isKanbanAggregateBoardId,
  KANBAN_BOARD_PRODUCTION_ID,
  parkLinkedCardInStop,
  resolveOrderKanbanColumnFromKaitenMirrorTitle,
  restoreStoppedLinkedOrderToColumn,
  stripParkedLinkedOrdersFromAppState,
} from "@/lib/kanban/model";
import { isKanbanStopColumnTitle } from "@/lib/kanban/kanban-stop-column";
import {
  shouldKeepLocalKanbanMembers,
  shouldKeepLocalKanbanStageDue,
} from "@/lib/kanban/preserve-kanban-card-head";
import { crmKanbanLinkedCardId } from "@/lib/kanban-order-card-url";
import {
  applyPendingKanbanColumnMoves,
  clearPendingMovesConfirmedByTiles,
  listPendingKanbanColumnMoves,
  pendingColumnTitleForOrder,
  type PendingKanbanColumnMove,
} from "@/lib/kanban/pending-column-moves";
import {
  applyPendingBlockToCard,
  clearPendingBlocksConfirmedByTiles,
  listPendingKanbanBlocks,
  pendingBlockForOrder,
  type PendingKanbanBlock,
} from "@/lib/kanban/pending-kanban-blocks";
import {
  clearPendingTrackLanesConfirmedByTiles,
  listPendingKanbanTrackLanes,
  pendingTrackLaneForOrder,
  type PendingKanbanTrackLane,
} from "@/lib/kanban/pending-track-lane-moves";
import { slimKanbanChecklist } from "@/lib/kanban/kanban-linked-checklist";
import { ensureKanbanBoardCardType } from "@/lib/kanban/resolve-kanban-card-type";
import type { KanbanAppState, KanbanBoard, KanbanCard } from "@/lib/kanban/types";

function withPendingTrackLaneOnTile(
  tile: CrmBoardTile,
  pendingLanes: readonly PendingKanbanTrackLane[],
): CrmBoardTile {
  const lane = pendingTrackLaneForOrder(tile.orderId, pendingLanes);
  if (!lane) return tile;
  const boardId = kanbanBoardIdFromTrackLane(lane);
  if (tile.boardId === boardId && String(tile.trackLane || "").toUpperCase() === lane) {
    return tile;
  }
  return { ...tile, trackLane: lane, boardId };
}

function applyTileTimer(card: KanbanCard, tile: CrmBoardTile): void {
  const hasTileTimer =
    Boolean(tile.timerStartedAt) ||
    (tile.timerDurationMs != null && Number(tile.timerDurationMs) > 0) ||
    Boolean(tile.timerParkedAt);
  const hasLocalTimer =
    Boolean(card.timerStartedAt) ||
    (card.timerDurationMs != null && card.timerDurationMs > 0) ||
    Boolean(card.timerParkedAt);
  if (!hasTileTimer && hasLocalTimer) return;
  card.timerStartedAt = tile.timerStartedAt;
  card.timerDurationMs = tile.timerDurationMs;
  card.timerFrozenAt = tile.timerFrozenAt;
  card.timerStartedByUserId = tile.timerStartedByUserId;
  card.timerParkedAt = tile.timerParkedAt;
  card.timerParkedRemainingMs = tile.timerParkedRemainingMs;
}

function applyTileChecklist(card: KanbanCard, tile: CrmBoardTile): void {
  if (tile.checklist != null) {
    card.checklist = slimKanbanChecklist(tile.checklist);
    return;
  }
  if ((card.checklist || []).length > 0) return;
  card.checklist = [];
}

function applyTileBlock(
  card: KanbanCard,
  tile: CrmBoardTile,
  pendingBlocks: readonly PendingKanbanBlock[],
): void {
  const oid = String(card.linkedOrderId || tile.orderId || "").trim();
  const pending = oid ? pendingBlockForOrder(oid, pendingBlocks) : null;
  if (pending) {
    applyPendingBlockToCard(card, pending);
    return;
  }
  /* Локальный стоп не снимаем пустой плиткой (лаг БД). Снятие стопа — через pending/кэш. */
  if (card.blocked && !tile.blocked) return;
  card.blocked = tile.blocked;
  card.blockReason = tile.blockReason;
  if (!tile.blocked) {
    card.blockedByUserId = "";
    card.blockedAt = "";
  }
}

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

function extractLinkedFromAnyBoard(
  state: KanbanAppState,
  orderId: string,
): KanbanCard | null {
  for (const board of state.boards || []) {
    if (isKanbanAggregateBoardId(board.id)) continue;
    for (const col of board.columns) {
      const idx = col.cards.findIndex((c) => c.linkedOrderId === orderId);
      if (idx < 0) continue;
      const [card] = col.cards.splice(idx, 1);
      return card ?? null;
    }
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
  pendingBlocks: readonly PendingKanbanBlock[],
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
  /* card.urgent ≠ Order.isUrgent: плитка наряда срочность карточки не затирает. */
  applyTileBlock(card, tile, pendingBlocks);
  card.kaitenCardSortOrder = tile.sortOrder;
  card.trackLane = tile.trackLane || card.trackLane || "";
  if (tile.createdAt && (!card.createdAt || tile.createdAt < card.createdAt)) {
    card.createdAt = tile.createdAt;
  }
  card.updatedAt = tile.updatedAt;
  applyTileTimer(card, tile);
  applyTileChecklist(card, tile);
  card.sourceEmailCount = tile.sourceEmailCount;
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
  opts?: {
    replaceBoardId?: string | null;
    pruneMemberUserId?: string | null;
    pendingMoves?: PendingKanbanColumnMove[];
    /**
     * Только после GET /board-tiles с сервера.
     * Кэш localStorage уже пропатчен при DnD — иначе pending снимается до записи в БД и F5 откатывает колонку.
     */
    confirmPendingMoves?: boolean;
  },
): KanbanAppState {
  const next = structuredClone(state);
  const pending = opts?.pendingMoves ?? listPendingKanbanColumnMoves();
  const pendingBlocks = listPendingKanbanBlocks();
  const pendingLanes = listPendingKanbanTrackLanes();
  const seenOnBoard = new Map<string, Set<string>>();
  const parkedByBoard = new Map(
    (next.boards || []).map((b) => [b.id, parkedLinkedOrderIds(b)] as const),
  );
  for (const rawTile of tiles) {
    const tile = withPendingTrackLaneOnTile(rawTile, pendingLanes);
    const board = next.boards.find((b) => b.id === tile.boardId);
    if (!board?.columns.length) continue;
    const columnTitle =
      pendingColumnTitleForOrder(tile.orderId, pending) || tile.columnTitle;
    if (parkedByBoard.get(board.id)?.has(tile.orderId)) {
      /* Архив плитками не возвращаем на доску; призраки снимет strip в конце. */
      const archived = (board.archivedCards || []).some(
        (r) => String(r.card?.linkedOrderId || "").trim() === tile.orderId,
      );
      if (archived) continue;
      if (isKanbanStopColumnTitle(columnTitle) || !(columnTitle || "").trim()) {
        continue;
      }
      const targetCol = resolveOrderKanbanColumnFromKaitenMirrorTitle(
        board,
        columnTitle,
      );
      const unparked = restoreStoppedLinkedOrderToColumn(
        board,
        tile.orderId,
        targetCol,
      );
      if (!unparked) continue;
      parkedByBoard.get(board.id)?.delete(tile.orderId);
      const foundAfter = findLinkedOnBoard(next, board.id, tile.orderId);
      if (foundAfter) {
        const card =
          board.columns[foundAfter.colIndex]!.cards[foundAfter.cardIndex]!;
        applyTileToCard(card, tile, board, pendingBlocks);
      }
      const set = seenOnBoard.get(board.id) ?? new Set<string>();
      set.add(tile.orderId);
      seenOnBoard.set(board.id, set);
      continue;
    }
    if (isKanbanStopColumnTitle(columnTitle)) {
      const found = findLinkedOnBoard(next, board.id, tile.orderId);
      let card: KanbanCard | null = null;
      let sourceId = board.columns[0]?.id ?? "";
      let sourceTitle = board.columns[0]?.title ?? "";
      if (found) {
        const fromCol = board.columns[found.colIndex]!;
        const spliced = fromCol.cards.splice(found.cardIndex, 1)[0];
        if (!spliced) continue;
        card = spliced;
        sourceId = fromCol.id;
        sourceTitle = fromCol.title;
      } else {
        const pendingBlock = pendingBlockForOrder(tile.orderId, pendingBlocks);
        card = createCard({
          id: crmKanbanLinkedCardId(tile.orderId),
          title: tile.title,
          description: "",
          cardTypeId: ensureKanbanBoardCardType(board, tile),
          linkedOrderId: tile.orderId,
          linkedOrderNumber: tile.orderNumber,
          assignees: tile.assignees,
          participants: tile.participants,
          urgent: false,
          blocked: pendingBlock ? pendingBlock.blocked : tile.blocked,
          blockReason: pendingBlock
            ? pendingBlock.blocked
              ? pendingBlock.blockReason
              : ""
            : tile.blockReason,
          checklist: tile.checklist ?? [],
          kaitenCardSortOrder: tile.sortOrder,
          trackLane: tile.trackLane || "",
          createdAt: tile.createdAt || undefined,
          sourceEmailCount: tile.sourceEmailCount,
        });
      }
      applyTileToCard(card, tile, board, pendingBlocks);
      parkLinkedCardInStop(board, card, sourceId, sourceTitle);
      parkedByBoard.get(board.id)?.add(tile.orderId);
      const set = seenOnBoard.get(board.id) ?? new Set<string>();
      set.add(tile.orderId);
      seenOnBoard.set(board.id, set);
      continue;
    }
    const targetCol = resolveOrderKanbanColumnFromKaitenMirrorTitle(
      board,
      columnTitle,
    );
    const found = findLinkedOnBoard(next, board.id, tile.orderId);
    const fromOther = found ? null : extractLinkedFromAnyBoard(next, tile.orderId);
    if (found) {
      const fromCol = board.columns[found.colIndex]!;
      const [card] = fromCol.cards.splice(found.cardIndex, 1);
      if (!card) continue;
      applyTileToCard(card, tile, board, pendingBlocks);
      if (fromCol.id !== targetCol.id) {
        targetCol.cards.push(card);
      } else {
        targetCol.cards.splice(Math.min(found.cardIndex, targetCol.cards.length), 0, card);
      }
    } else if (fromOther) {
      applyTileToCard(fromOther, tile, board, pendingBlocks);
      targetCol.cards.push(fromOther);
    } else {
      const pendingBlock = pendingBlockForOrder(tile.orderId, pendingBlocks);
      const card = createCard({
        id: crmKanbanLinkedCardId(tile.orderId),
        title: tile.title,
        description: "",
        cardTypeId: ensureKanbanBoardCardType(board, tile),
        linkedOrderId: tile.orderId,
        linkedOrderNumber: tile.orderNumber,
        assignees: tile.assignees,
        participants: tile.participants,
        urgent: false,
        blocked: pendingBlock ? pendingBlock.blocked : tile.blocked,
        blockReason: pendingBlock
          ? pendingBlock.blocked
            ? pendingBlock.blockReason
            : ""
          : tile.blockReason,
        checklist: tile.checklist ?? [],
        kaitenCardSortOrder: tile.sortOrder,
        trackLane: tile.trackLane || "",
        createdAt: tile.createdAt || undefined,
        sourceEmailCount: tile.sourceEmailCount,
      });
      if (tile.stageDueYmd) setKanbanStageDue(card, tile.stageDueYmd);
      applyTileTimer(card, tile);
      applyTileChecklist(card, tile);
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
    /* Optimistic перенос дорожки: карточка уже на новой доске, а плитки ещё без неё. */
    for (const move of pendingLanes) {
      if (kanbanBoardIdFromTrackLane(move.trackLane) !== replaceId) continue;
      const oid = String(move.orderId || move.cardId || "").trim();
      if (oid) keep.add(oid);
    }
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
  const placed = applyPendingKanbanColumnMoves(next, pending);
  stripParkedLinkedOrdersFromAppState(placed);
  if (opts?.confirmPendingMoves) {
    clearPendingMovesConfirmedByTiles(tiles);
    clearPendingBlocksConfirmedByTiles(tiles);
    clearPendingTrackLanesConfirmedByTiles(tiles);
  }
  return placed;
}
