import { findCardByLinkedOrderId } from "@/lib/kanban/chat-sync";
import type { KanbanAppState } from "@/lib/kanban/types";
import { isHandedToAdminsKaitenColumnTitle } from "@/lib/sticker-public-client-copy";

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
      /** Уже была в целевой колонке — канбан не меняли. */
      alreadyThere?: boolean;
    }
  | {
      ok: false;
      error: string;
      code?: "not_found" | "last" | "conflict" | "no_target";
    };

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

/** Индекс колонки «Сдана админам» (title / idSuffix col_shipped). */
export function findHandedToAdminsColumnIndex(
  columns: Array<{ id?: string; title?: string | null }>,
): number {
  for (let i = 0; i < columns.length; i += 1) {
    const col = columns[i]!;
    const id = String(col.id ?? "");
    if (id.endsWith("_col_shipped") || id === "col_shipped") return i;
    if (isHandedToAdminsKaitenColumnTitle(col.title)) return i;
  }
  return -1;
}
