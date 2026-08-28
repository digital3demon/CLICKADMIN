import type { KanbanAppState, KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import { getKanbanStageDue } from "@/lib/kanban/kanban-stage-due";
import { cardMatchesFilters } from "@/lib/kanban/model";
import {
  loadKanbanCardHeadsCache,
  type KanbanCardHeadsCache,
} from "@/lib/kanban/kanban-card-heads-cache";

export type ListSortKey =
  | "title"
  | "created"
  | "column"
  | "due"
  | "assignee"
  | "participants";

export type ListSortDir = "asc" | "desc";

export type ListSort = { key: ListSortKey; dir: ListSortDir };

export const DEFAULT_LIST_SORT: ListSort = { key: "created", dir: "desc" };

export function isDefaultListSort(sort: ListSort): boolean {
  return sort.key === DEFAULT_LIST_SORT.key && sort.dir === DEFAULT_LIST_SORT.dir;
}

export type ListViewRow = {
  card: KanbanCard;
  columnTitle: string;
  columnId: string;
  columnIndex: number;
  /** Доска, где карточка хранится (для поиска по всем доскам). */
  homeBoardId: string;
};

/** Направление по умолчанию при первом выборе колонки сортировки. */
export function defaultDirForSortKey(key: ListSortKey): ListSortDir {
  switch (key) {
    case "created":
    case "assignee":
    case "participants":
      return "desc";
    default:
      return "asc";
  }
}

function dueTime(iso: string): number | null {
  const s = iso?.trim();
  if (!s) return null;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Сравнение без учёта направления: возвращает <0 если a раньше b в порядке asc по смыслу колонки. */
function comparePrimary(
  a: ListViewRow,
  b: ListViewRow,
  key: ListSortKey,
  board: KanbanBoard,
  allBoards: KanbanBoard[],
): number {
  const home = (row: ListViewRow) =>
    allBoards.find((x) => x.id === row.homeBoardId) ?? board;

  switch (key) {
    case "title": {
      const ca = (a.card.title || "").trim();
      const cb = (b.card.title || "").trim();
      return ca.localeCompare(cb, "ru", { sensitivity: "base" });
    }
    case "created": {
      const ta = new Date(a.card.createdAt).getTime();
      const tb = new Date(b.card.createdAt).getTime();
      return ta - tb;
    }
    case "column": {
      const ia = a.columnIndex;
      const ib = b.columnIndex;
      if (ia !== ib) return ia - ib;
      return a.columnTitle.localeCompare(b.columnTitle, "ru", {
        sensitivity: "base",
      });
    }
    case "due": {
      const da = dueTime(getKanbanStageDue(a.card));
      const db = dueTime(getKanbanStageDue(b.card));
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    }
    case "assignee": {
      const na = a.card.assignees?.length ?? 0;
      const nb = b.card.assignees?.length ?? 0;
      if (na !== nb) return na - nb;
      const ida = a.card.assignees?.[0];
      const idb = b.card.assignees?.[0];
      const ba = home(a);
      const bb = home(b);
      const nameA = (ida && ba.users.find((u) => u.id === ida)?.name) || "";
      const nameB = (idb && bb.users.find((u) => u.id === idb)?.name) || "";
      return nameA.localeCompare(nameB, "ru", { sensitivity: "base" });
    }
    case "participants": {
      const na = a.card.participants?.length ?? 0;
      const nb = b.card.participants?.length ?? 0;
      if (na !== nb) return na - nb;
      const ida = a.card.participants?.[0];
      const idb = b.card.participants?.[0];
      const ba = home(a);
      const bb = home(b);
      const nameA = (ida && ba.users.find((u) => u.id === ida)?.name) || "";
      const nameB = (idb && bb.users.find((u) => u.id === idb)?.name) || "";
      return nameA.localeCompare(nameB, "ru", { sensitivity: "base" });
    }
    default:
      return 0;
  }
}

function compareCreatedDesc(a: ListViewRow, b: ListViewRow): number {
  const ta = new Date(a.card.createdAt).getTime();
  const tb = new Date(b.card.createdAt).getTime();
  if (ta !== tb) return tb - ta;
  return a.card.id.localeCompare(b.card.id);
}

function compareRows(
  a: ListViewRow,
  b: ListViewRow,
  sort: ListSort,
  board: KanbanBoard,
  allBoards: KanbanBoard[],
): number {
  const primary = comparePrimary(a, b, sort.key, board, allBoards);
  const directed = sort.dir === "asc" ? primary : -primary;
  if (directed !== 0) return directed;
  if (sort.key === "column") {
    return compareCreatedDesc(a, b);
  }
  return a.card.id.localeCompare(b.card.id);
}

export function buildKanbanListViewRows(
  board: KanbanBoard,
  state: KanbanAppState,
  sort: ListSort,
  opts?: {
    cardHomeBoardId?: Map<string, string>;
    allBoards?: KanbanBoard[];
    memberHeads?: KanbanCardHeadsCache | null;
  },
): ListViewRow[] {
  const allBoards = opts?.allBoards ?? [board];
  const homeId = (c: KanbanCard) =>
    opts?.cardHomeBoardId?.get(c.id) ?? board.id;
  const memberHeads =
    opts && Object.prototype.hasOwnProperty.call(opts, "memberHeads")
      ? opts.memberHeads
      : loadKanbanCardHeadsCache();

  const out: ListViewRow[] = [];
  board.columns.forEach((col, columnIndex) => {
    col.cards.forEach((c) => {
      const hbId = homeId(c);
      const hb = allBoards.find((b) => b.id === hbId) ?? board;
      if (cardMatchesFilters(c, hb, state, { memberHeads })) {
        out.push({
          card: c,
          columnTitle: col.title,
          columnId: col.id,
          columnIndex,
          homeBoardId: hbId,
        });
      }
    });
  });
  out.sort((x, y) => compareRows(x, y, sort, board, allBoards));
  return out;
}

const STORAGE_PREFIX = "kanban-list-sort:";
const memorySort = new Map<string, ListSort>();

export function loadListSort(boardId: string): ListSort {
  return memorySort.get(STORAGE_PREFIX + boardId) ?? DEFAULT_LIST_SORT;
}

export function saveListSort(boardId: string, sort: ListSort): void {
  memorySort.set(STORAGE_PREFIX + boardId, sort);
}
