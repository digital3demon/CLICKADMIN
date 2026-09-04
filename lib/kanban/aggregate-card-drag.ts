import type { KaitenTrackLane } from "@prisma/client";
import type { KanbanAppState, KanbanBoard, KanbanCard } from "./types";import { visibleCardsInColumn, visibleIndexToFullInsertIndex } from "./board-visible-cards";
import { previewLinkedCardKaitenSortOrderAfterDrag } from "./kanban-card-move-preview";
import { runKanbanAutomations } from "./automations";
import {
  annulKanbanStageTimerOnMemberAdvance,
  findCardInAppState,
  KANBAN_BOARD_ORTHODONTICS_ID,
  pushActivity,
} from "./model";
import { crmColumnPersistFromLinkedMove } from "./crm-column-persist";

export type AggregateCardDragArgs = {
  cardId: string;
  fromDisplayColId: string;
  toDisplayColId: string;
  newIndex: number;
  overIsColumn: boolean;
  /** id карточки под курсором (если не бросок на заголовок колонки) */
  overCardId: string | null;
};

function colByTitle(board: KanbanBoard, title: string) {
  const t = title.trim().toLowerCase();
  return board.columns.find((c) => c.title.trim().toLowerCase() === t) ?? null;
}

function trackLaneForBoardId(boardId: string): "ORTHOPEDICS" | "ORTHODONTICS" {
  return boardId === KANBAN_BOARD_ORTHODONTICS_ID ? "ORTHODONTICS" : "ORTHOPEDICS";
}

/**
 * Перенос карточки по «виртуальной» доске (Мои / Ответственный): правит реальные колонки
 * на дорожках «Ортопедия» / «Ортодонтия» по совпадению названия колонки.
 */
export function applyAggregateCardDrag(
  next: KanbanAppState,
  displayBoard: KanbanBoard,
  cardHomeBoardId: Map<string, string>,
  drag: AggregateCardDragArgs,
  opts: { activityUserId: string; activityActorLabel?: string; sessionUserId?: string | null },
): {
  ok: boolean;
  kaiten?: {
    orderId: string;
    kaitenCardId: number;
    columnTitle?: string;
    /** Смена дорожки Kaiten (ортопедия/ортодонтия) — иначе column_id подставлялся с чужой доски. */
    kaitenTrackLane?: KaitenTrackLane;
    sortOrder: number;
  };
  /** Колонка в CRM (наряд), даже если Kaiten выключен / нет kaitenCardId. */
  crmPersist?: {
    orderId: string;
    columnTitle: string;
    sortOrder?: number;
  };
} {
  const fromDisp = displayBoard.columns.find((c) => c.id === drag.fromDisplayColId);
  const toDisp = displayBoard.columns.find((c) => c.id === drag.toDisplayColId);
  if (!fromDisp || !toDisp) return { ok: false };

  const fromHomeId = cardHomeBoardId.get(drag.cardId);
  if (!fromHomeId) return { ok: false };

  const fromHome = next.boards.find((b) => b.id === fromHomeId);
  if (!fromHome) return { ok: false };

  const fromCol = colByTitle(fromHome, fromDisp.title);
  if (!fromCol) return { ok: false };

  const idx = fromCol.cards.findIndex((c) => c.id === drag.cardId);
  if (idx < 0) return { ok: false };

  const resolveForPreview = (card: KanbanCard): KanbanBoard => {
    const hid = cardHomeBoardId.get(card.id) ?? fromHomeId;
    return next.boards.find((b) => b.id === hid) ?? fromHome;
  };

  const sortPreview = previewLinkedCardKaitenSortOrderAfterDrag(
    displayBoard,
    next,
    resolveForPreview,
    drag.fromDisplayColId,
    drag.toDisplayColId,
    drag.cardId,
    drag.newIndex,
    drag.overIsColumn,
  );

  const [card] = fromCol.cards.splice(idx, 1);
  if (!card) return { ok: false };

  // Колонки «Мои» / «Ответственный» общие по названию. Бросок на чужую карточку
  // не должен менять дорожку (ортодонтия → ортопедия) и уезжать в Kaiten.
  const toHomeId = fromHomeId;

  const toHome = next.boards.find((b) => b.id === toHomeId);
  if (!toHome) {
    fromCol.cards.splice(idx, 0, card);
    return { ok: false };
  }

  const toCol = colByTitle(toHome, toDisp.title);
  if (!toCol) {
    fromCol.cards.splice(idx, 0, card);
    return { ok: false };
  }

  const resolveAfter = (c: KanbanCard): KanbanBoard =>
    findCardInAppState(next, c.id)?.board ?? toHome;

  let visInsert = drag.newIndex;
  if (drag.overIsColumn) {
    visInsert = visibleCardsInColumn(toDisp, next, resolveForPreview).length;
  }

  let fullInsert = visibleIndexToFullInsertIndex(toCol, visInsert, next, resolveAfter);
  if (fromCol === toCol && idx < fullInsert) {
    fullInsert -= 1;
  }
  fullInsert = Math.max(0, Math.min(fullInsert, toCol.cards.length));
  toCol.cards.splice(fullInsert, 0, card);

  if (fromHome.id !== toHome.id) {
    card.trackLane = trackLaneForBoardId(toHome.id);
  }

  const now = new Date().toISOString();
  card.updatedAt = now;
  if (fromCol.id !== toCol.id || fromHome.id !== toHome.id) {
    card.lastMovedAt = now;
  }

  pushActivity(
    card,
    fromCol.id === toCol.id && fromHome.id === toHome.id
      ? "Изменён порядок"
      : `Перемещена в «${toCol.title}»`,
    opts.activityUserId,
    toHome,
    opts.activityActorLabel,
  );

  if (fromCol.id !== toCol.id || fromHome.id !== toHome.id) {
    runKanbanAutomations(
      toHome,
      {
        type: "card_moved_to_column",
        cardId: drag.cardId,
        fromColumnId: fromCol.id,
        toColumnId: toCol.id,
      },
      0,
      opts.activityActorLabel,
    );
    if (fromHome.id === toHome.id) {
      const fromIdx = fromHome.columns.findIndex((c) => c.id === fromCol.id);
      const toIdx = toHome.columns.findIndex((c) => c.id === toCol.id);
      annulKanbanStageTimerOnMemberAdvance(
        card,
        fromIdx,
        toIdx,
        opts.sessionUserId,
        toHome,
        opts.activityActorLabel,
      );
    }
  }

  let kaiten:
    | {
        orderId: string;
        kaitenCardId: number;
        columnTitle?: string;
        kaitenTrackLane?: KaitenTrackLane;
        sortOrder: number;
      }
    | undefined;

  const laneChange = fromHome.id !== toHome.id;
  if (
    sortPreview != null &&
    Number.isFinite(sortPreview) &&
    card.linkedOrderId &&
    typeof card.kaitenCardId === "number" &&
    Number.isFinite(card.kaitenCardId)
  ) {
    const cross = drag.fromDisplayColId !== drag.toDisplayColId;
    const toTitle = toCol.title?.trim() ?? "";
    kaiten = {
      orderId: card.linkedOrderId,
      kaitenCardId: card.kaitenCardId,
      ...(cross && toTitle ? { columnTitle: toTitle } : {}),
      ...(laneChange ? { kaitenTrackLane: trackLaneForBoardId(toHome.id) } : {}),
      sortOrder: sortPreview,
    };
  }

  const crmPersist =
    drag.fromDisplayColId !== drag.toDisplayColId
      ? crmColumnPersistFromLinkedMove({
          linkedOrderId: card.linkedOrderId,
          columnTitle: toCol.title,
          sortOrder: sortPreview,
          ...(laneChange
            ? { trackLane: trackLaneForBoardId(toHome.id) }
            : {}),
        }) ?? undefined
      : undefined;

  return { ok: true, kaiten, crmPersist };
}
