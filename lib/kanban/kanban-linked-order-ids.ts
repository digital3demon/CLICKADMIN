import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";

/** Наряды с карточкой в колонках доски (не архив и не СТОП). */
export function linkedOrderIdsOnKanbanBoard(
  state: KanbanAppState | null | undefined,
): string[] {
  if (!state) return [];
  const ids = new Set<string>();
  for (const board of state.boards ?? []) {
    for (const col of board.columns ?? []) {
      for (const card of col.cards ?? []) {
        const oid = String(card.linkedOrderId || "").trim();
        if (oid) ids.add(oid);
      }
    }
  }
  return [...ids];
}

export type KanbanKaitenRefreshTarget = {
  cardId: string;
  kaitenCardId: number | null;
  linkedOrderId: string | null;
};

/** Number(null) === 0 — не считать это id карточки Kaiten. */
export function positiveKaitenCardId(raw: unknown): number | null {
  if (raw == null || raw === false || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function pushRefreshTarget(
  out: KanbanKaitenRefreshTarget[],
  seen: Set<string>,
  card: KanbanCard | null | undefined,
): void {
  if (!card) return;
  const cardId = String(card.id || "").trim();
  if (!cardId || seen.has(cardId)) return;
  seen.add(cardId);
  const linkedOrderId = String(card.linkedOrderId || "").trim() || null;
  out.push({
    cardId,
    kaitenCardId: positiveKaitenCardId(card.kaitenCardId),
    linkedOrderId,
  });
}

/**
 * Все карточки колонок и СТОП (не архив) — для обновления с Kaiten.
 * Сначала активная доска, чтобы экран обновился раньше.
 */
export function collectKanbanKaitenRefreshTargets(
  state: KanbanAppState | null | undefined,
  preferBoardId?: string | null,
): KanbanKaitenRefreshTarget[] {
  if (!state) return [];
  const prefer = String(preferBoardId || state.activeBoardId || "").trim();
  const boards = [...(state.boards ?? [])];
  if (prefer) {
    boards.sort((a, b) => {
      const ap = a.id === prefer ? 0 : 1;
      const bp = b.id === prefer ? 0 : 1;
      return ap - bp;
    });
  }
  const out: KanbanKaitenRefreshTarget[] = [];
  const seen = new Set<string>();
  for (const board of boards) {
    for (const col of board.columns ?? []) {
      for (const card of col.cards ?? []) {
        pushRefreshTarget(out, seen, card);
      }
    }
    for (const row of board.stoppedCards ?? []) {
      pushRefreshTarget(out, seen, row.card);
    }
  }
  return out;
}

/**
 * Следующая страница id (лексикографически, как Prisma orderBy id asc).
 * Без огромного `IN (...)` на всю доску — иначе SQLite/драйвер зависает на «подсчёте».
 */
export function nextLinkedOrderIdPage(
  ids: readonly string[],
  afterOrderId: string | null | undefined,
  limit: number,
): { page: string[]; finished: boolean } {
  const take = Math.max(1, Math.floor(limit));
  const sorted = [...ids].filter((id) => String(id).trim()).sort();
  const after = String(afterOrderId ?? "").trim();
  let start = 0;
  if (after) {
    start = sorted.findIndex((id) => id > after);
    if (start < 0) return { page: [], finished: true };
  }
  const page = sorted.slice(start, start + take);
  return {
    page,
    finished: page.length === 0 || start + page.length >= sorted.length,
  };
}
