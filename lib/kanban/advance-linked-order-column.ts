import { findCardByLinkedOrderId } from "@/lib/kanban/chat-sync";
import type { KanbanAppState } from "@/lib/kanban/types";

export type LinkedOrderColumnNeighbor = {
  currentTitle: string;
  nextTitle: string | null;
  prevTitle: string | null;
  isLast: boolean;
  boardId: string;
  cardId: string;
  kaitenCardId: number | null;
};

export type AdvanceLinkedOrderColumnResult =
  | {
      ok: true;
      fromTitle: string;
      toTitle: string;
      kaitenCardId: number | null;
      sortOrder: number;
    }
  | { ok: false; error: string; code?: "not_found" | "last" | "conflict" };

export function peekLinkedOrderColumnNeighbor(
  state: KanbanAppState,
  orderId: string,
): LinkedOrderColumnNeighbor | null {
  const loc = findCardByLinkedOrderId(state, orderId);
  if (!loc) return null;
  const board = state.boards[loc.boardIndex]!;
  const col = board.columns[loc.columnIndex]!;
  const card = col.cards[loc.cardIndex]!;
  const next = board.columns[loc.columnIndex + 1] ?? null;
  const prev = board.columns[loc.columnIndex - 1] ?? null;
  const kaitenRaw = card.kaitenCardId;
  return {
    currentTitle: (col.title || "").trim() || "—",
    nextTitle: next ? (next.title || "").trim() || "—" : null,
    prevTitle: prev ? (prev.title || "").trim() || "—" : null,
    isLast: next == null,
    boardId: board.id,
    cardId: card.id,
    kaitenCardId:
      typeof kaitenRaw === "number" && Number.isFinite(kaitenRaw)
        ? kaitenRaw
        : null,
  };
}
