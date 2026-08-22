import { normalizeKanbanColumnTitle } from "@/lib/kaiten-column-title";
import type { KanbanAppState } from "@/lib/kanban/types";

const STORAGE_KEY = "kanbanPendingColumnMovesV1";
const TTL_MS = 120_000;

export type PendingKanbanColumnMove = {
  cardId: string;
  orderId?: string;
  toColumnId?: string;
  toColumnTitle?: string;
  at: number;
};

function readStore(): PendingKanbanColumnMove[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is PendingKanbanColumnMove => {
      return Boolean(x && typeof x === "object" && typeof (x as PendingKanbanColumnMove).cardId === "string");
    });
  } catch {
    return [];
  }
}

function writeStore(rows: PendingKanbanColumnMove[]): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* quota / private mode */
  }
}

export function rememberPendingKanbanColumnMove(
  move: Omit<PendingKanbanColumnMove, "at">,
): void {
  const now = Date.now();
  const next = readStore().filter((r) => now - r.at < TTL_MS && r.cardId !== move.cardId);
  next.push({ ...move, at: now });
  writeStore(next);
}

export function listPendingKanbanColumnMoves(now = Date.now()): PendingKanbanColumnMove[] {
  const live = readStore().filter((r) => now - r.at < TTL_MS);
  if (live.length !== readStore().length) writeStore(live);
  return live;
}

export function clearPendingKanbanColumnMove(cardId: string): void {
  writeStore(readStore().filter((r) => r.cardId !== cardId));
}

/** Карточка остаётся в новой колонке после refresh, пока tenant-state/Kaiten догоняют. */
export function applyPendingKanbanColumnMoves(
  state: KanbanAppState,
  moves: PendingKanbanColumnMove[],
): KanbanAppState {
  if (moves.length === 0) return state;
  const next = structuredClone(state);
  for (const move of moves) {
    for (const board of next.boards) {
      let fromCol = null as (typeof board.columns)[number] | null;
      let fromIdx = -1;
      for (const col of board.columns) {
        const idx = col.cards.findIndex(
          (c) =>
            c.id === move.cardId ||
            (move.orderId != null && c.linkedOrderId === move.orderId),
        );
        if (idx >= 0) {
          fromCol = col;
          fromIdx = idx;
          break;
        }
      }
      if (!fromCol || fromIdx < 0) continue;
      const wantTitle = move.toColumnTitle
        ? normalizeKanbanColumnTitle(move.toColumnTitle)
        : "";
      const toCol = board.columns.find((c) => {
        if (move.toColumnId && c.id === move.toColumnId) return true;
        if (wantTitle && normalizeKanbanColumnTitle(c.title) === wantTitle) {
          return true;
        }
        return false;
      });
      if (!toCol || toCol.id === fromCol.id) continue;
      const [card] = fromCol.cards.splice(fromIdx, 1);
      if (!card) continue;
      toCol.cards.unshift(card);
    }
  }
  return next;
}
