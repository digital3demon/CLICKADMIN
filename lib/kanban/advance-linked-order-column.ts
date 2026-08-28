import { findCardByLinkedOrderId } from "@/lib/kanban/chat-sync";
import { isKanbanAggregateBoardId } from "@/lib/kanban/model";
import type { KanbanAppState } from "@/lib/kanban/types";
import { normalizeKanbanColumnTitle } from "@/lib/kaiten-column-title";
import { LAB_WORK_STATUS_LABELS } from "@/lib/lab-work-status";
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

/** Карточка наряда на реальной доске, не на «Мои» / «Ответственный». */
export function findLinkedOrderCardOnSourceBoard(
  state: KanbanAppState,
  orderId: string,
): ReturnType<typeof findCardByLinkedOrderId> {
  const orderIdTrim = String(orderId || "").trim();
  if (!orderIdTrim) return null;
  for (let bi = 0; bi < state.boards.length; bi += 1) {
    const board = state.boards[bi]!;
    if (isKanbanAggregateBoardId(board.id)) continue;
    for (let ci = 0; ci < board.columns.length; ci += 1) {
      const col = board.columns[ci]!;
      for (let i = 0; i < col.cards.length; i += 1) {
        if (String(col.cards[i]!.linkedOrderId || "").trim() !== orderIdTrim) {
          continue;
        }
        return { boardIndex: bi, columnIndex: ci, cardIndex: i };
      }
    }
  }
  return findCardByLinkedOrderId(state, orderId);
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

/** Индекс колонки по подписи (в т.ч. «Сдана админам»). */
export function findKanbanColumnIndexByTitle(
  columns: Array<{ id?: string; title?: string | null }>,
  title: string,
): number {
  const want = String(title || "").trim();
  if (!want) return -1;
  if (isHandedToAdminsKaitenColumnTitle(want)) {
    const handed = findHandedToAdminsColumnIndex(columns);
    if (handed >= 0) return handed;
  }
  const wantNorm = normalizeKanbanColumnTitle(want);
  for (let i = 0; i < columns.length; i += 1) {
    const t = normalizeKanbanColumnTitle(String(columns[i]!.title ?? ""));
    if (t && t === wantNorm) return i;
  }
  return -1;
}

/** Запомнить колонку до «Работа отправлена», не затирая уже сохранённый откат. */
export function snapshotColumnBeforeWorkSent(
  currentTitle: string | null | undefined,
  existingSnapshot: string | null | undefined,
): string | null {
  const current = String(currentTitle || "").trim();
  const prev = String(existingSnapshot || "").trim();
  if (current && !isHandedToAdminsKaitenColumnTitle(current)) return current;
  return prev || null;
}

/** Куда вернуть карточку после снятия «Работа отправлена». */
export function columnTitleAfterWorkUnsent(
  snapshot: string | null | undefined,
  currentTitle: string | null | undefined,
): string {
  const snap = String(snapshot || "").trim();
  if (snap && !isHandedToAdminsKaitenColumnTitle(snap)) return snap;
  const current = String(currentTitle || "").trim();
  if (current && !isHandedToAdminsKaitenColumnTitle(current)) return current;
  return LAB_WORK_STATUS_LABELS.TO_EXECUTION;
}
