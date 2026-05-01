import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";
import {
  KANBAN_BOARD_ORTHODONTICS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
} from "@/lib/kanban/model";

const MIRROR_BOARD_IDS = new Set([
  KANBAN_BOARD_ORTHOPEDICS_ID,
  KANBAN_BOARD_ORTHODONTICS_ID,
]);

const MAX_DATAURL_IN_SYNC = 48_000;

/** Урезаем data URL в файлах/чате, чтобы JSON в БД не раздувался. */
export function stripCardForServerSync(card: KanbanCard): KanbanCard {
  const files = (card.files || []).map((f) => {
    const d = f.dataUrl || "";
    if (d.startsWith("data:") && d.length > MAX_DATAURL_IN_SYNC) {
      return { ...f, dataUrl: "" };
    }
    return f;
  });
  return { ...card, files };
}

function isStandaloneCard(c: KanbanCard): boolean {
  return !c.linkedOrderId?.trim();
}

export type StandaloneRow = {
  id: string;
  boardId: string;
  columnId: string;
  sortIndex: number;
  payload: KanbanCard;
};

/** Сериализация зеркальных досок для PUT /api/kanban/standalone-cards */
export function extractStandaloneRowsForSync(state: KanbanAppState): StandaloneRow[] {
  const out: StandaloneRow[] = [];
  for (const board of state.boards) {
    if (!MIRROR_BOARD_IDS.has(board.id)) continue;
    for (const col of board.columns) {
      let ord = 0;
      for (const card of col.cards) {
        if (!isStandaloneCard(card)) continue;
        out.push({
          id: card.id,
          boardId: board.id,
          columnId: col.id,
          sortIndex: ord,
          payload: stripCardForServerSync(structuredClone(card)),
        });
        ord += 1;
      }
    }
  }
  return out;
}

/**
 * Подмешивание серверного снимка: в каждой колонке оставляем наряды, подменяем блок только без наряда.
 */
export function applyStandaloneRowsFromServer(
  state: KanbanAppState,
  rows: readonly StandaloneRow[],
): KanbanAppState {
  const next = structuredClone(state);
  const grouped = new Map<string, StandaloneRow[]>();
  for (const r of rows) {
    const k = `${r.boardId}\0${r.columnId}`;
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(r);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => a.sortIndex - b.sortIndex);
  }

  for (const board of next.boards) {
    if (!MIRROR_BOARD_IDS.has(board.id)) continue;
    for (const col of board.columns) {
      const key = `${board.id}\0${col.id}`;
      const linked = col.cards.filter((c) => !isStandaloneCard(c));
      const rowsHere = grouped.get(key) ?? [];
      const standalone = rowsHere.map((x) => x.payload);
      col.cards = [...linked, ...standalone];
    }
  }
  return next;
}
