import type { KanbanAppState, KanbanBoard, KanbanCard, KanbanColumn } from "@/lib/kanban/types";
import { findCardByLinkedOrderId } from "@/lib/kanban/chat-sync";
import { normalizeKanbanColumnTitle } from "@/lib/kaiten-column-title";
import { kaitenSortOrderFromCard } from "@/lib/kaiten-card-sort-order";

/** Колонка зеркала CRM по названию колонки Kaiten. */
export function resolveKanbanColumnByKaitenTitle(
  board: KanbanBoard,
  kaitenColumnTitle: string | null | undefined,
): KanbanColumn {
  const queue =
    board.columns.find(
      (c) => normalizeKanbanColumnTitle(c.title) === "к исполнению",
    ) ?? board.columns[0]!;
  const raw = String(kaitenColumnTitle || "").trim();
  if (!raw) return queue;
  const want = normalizeKanbanColumnTitle(raw);
  const exact = board.columns.find(
    (c) => normalizeKanbanColumnTitle(c.title) === want,
  );
  if (exact) return exact;
  const prefix = board.columns.find((c) => {
    const t = normalizeKanbanColumnTitle(c.title);
    return t.length > 0 && (t.startsWith(want) || want.startsWith(t));
  });
  if (prefix) return prefix;
  const loose = board.columns.find((c) => {
    const t = normalizeKanbanColumnTitle(c.title);
    return (
      t.length >= 4 &&
      want.length >= 4 &&
      (t.includes(want) || want.includes(t))
    );
  });
  return loose ?? queue;
}

function sortLinkedCardsInColumn(col: KanbanColumn): void {
  const linked: KanbanCard[] = [];
  const nonLinked: KanbanCard[] = [];
  for (const c of col.cards) {
    if (c.linkedOrderId) linked.push(c);
    else nonLinked.push(c);
  }
  const orderIndex = new Map<string, number>();
  linked.forEach((c, i) => orderIndex.set(c.id, i));
  linked.sort((a, b) => {
    const sa = a.kaitenCardSortOrder;
    const sb = b.kaitenCardSortOrder;
    const aBad = sa == null || !Number.isFinite(sa);
    const bBad = sb == null || !Number.isFinite(sb);
    if (aBad && bBad) {
      return (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0);
    }
    if (aBad) return 1;
    if (bBad) return -1;
    if (sa !== sb) return (sa as number) - (sb as number);
    return (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0);
  });
  col.cards = [...linked, ...nonLinked];
}

/**
 * Ставит linked-карточку в колонку и порядок как в Kaiten (только снимок канбана, не Order).
 */
export function applyKaitenPositionToKanbanState(
  state: KanbanAppState,
  orderId: string,
  opts: {
    columnTitle: string | null;
    sortOrder?: number | null;
  },
): boolean {
  const loc = findCardByLinkedOrderId(state, orderId);
  if (!loc) return false;
  const board = state.boards[loc.boardIndex];
  if (!board?.columns?.length) return false;
  const fromCol = board.columns[loc.columnIndex];
  if (!fromCol) return false;
  const card = fromCol.cards[loc.cardIndex];
  if (!card) return false;

  let changed = false;
  if (
    opts.sortOrder != null &&
    Number.isFinite(opts.sortOrder) &&
    card.kaitenCardSortOrder !== opts.sortOrder
  ) {
    card.kaitenCardSortOrder = opts.sortOrder;
    changed = true;
  }

  const toCol = resolveKanbanColumnByKaitenTitle(board, opts.columnTitle);
  if (toCol.id !== fromCol.id) {
    fromCol.cards = fromCol.cards.filter((c) => c.id !== card.id);
    toCol.cards.unshift(card);
    changed = true;
    sortLinkedCardsInColumn(fromCol);
    sortLinkedCardsInColumn(toCol);
  } else if (changed) {
    sortLinkedCardsInColumn(fromCol);
  }

  return changed;
}

export function sortOrderFromKaitenCard(
  kaitenCard: Record<string, unknown>,
): number | null {
  if (!("sort_order" in kaitenCard)) return null;
  const n = kaitenSortOrderFromCard(kaitenCard);
  return n == null || !Number.isFinite(n) ? null : n;
}
