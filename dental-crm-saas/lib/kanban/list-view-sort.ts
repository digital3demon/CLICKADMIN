import type { KanbanAppState, KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import { cardMatchesFilters } from "@/lib/kanban/model";

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
      const da = dueTime(a.card.dueDate);
      const db = dueTime(b.card.dueDate);
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
  return a.card.id.localeCompare(b.card.id);
}

export function buildKanbanListViewRows(
  board: KanbanBoard,
  state: KanbanAppState,
  sort: ListSort,
  opts?: { cardHomeBoardId?: Map<string, string>; allBoards?: KanbanBoard[] },
): ListViewRow[] {
  const allBoards = opts?.allBoards ?? [board];
  const homeId = (c: KanbanCard) =>
    opts?.cardHomeBoardId?.get(c.id) ?? board.id;

  const out: ListViewRow[] = [];
  board.columns.forEach((col, columnIndex) => {
    col.cards.forEach((c) => {
      const hbId = homeId(c);
      const hb = allBoards.find((b) => b.id === hbId) ?? board;
      if (cardMatchesFilters(c, hb, state)) {
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

export function loadListSort(boardId: string): ListSort {
  if (typeof window === "undefined") return DEFAULT_LIST_SORT;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + boardId);
    if (!raw) return DEFAULT_LIST_SORT;
    const j = JSON.parse(raw) as unknown;
    if (!j || typeof j !== "object") return DEFAULT_LIST_SORT;
    const key = (j as { key?: string }).key;
    const dir = (j as { dir?: string }).dir;
    const keys: ListSortKey[] = [
      "title",
      "created",
      "column",
      "due",
      "assignee",
      "participants",
    ];
    const dirs: ListSortDir[] = ["asc", "desc"];
    if (keys.includes(key as ListSortKey) && dirs.includes(dir as ListSortDir)) {
      return { key: key as ListSortKey, dir: dir as ListSortDir };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_LIST_SORT;
}

export function saveListSort(boardId: string, sort: ListSort): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + boardId, JSON.stringify(sort));
  } catch {
    /* ignore */
  }
}
