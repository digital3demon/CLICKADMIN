import { describe, expect, it } from "vitest";
import {
  buildKanbanListViewRows,
  DEFAULT_LIST_SORT,
  isDefaultListSort,
} from "@/lib/kanban/list-view-sort";
import { defaultAppState } from "@/lib/kanban/model";
import type { KanbanAppState, KanbanBoard, KanbanCard } from "@/lib/kanban/types";

function card(id: string, createdAt: string): KanbanCard {
  return {
    id,
    title: id,
    description: "",
    cardTypeId: "",
    assignees: [],
    participants: [],
    dueDate: "",
    urgent: false,
    checklist: [],
    files: [],
    comments: [],
    activity: [],
    blocked: false,
    blockReason: "",
    blockedByUserId: "",
    blockedAt: "",
    createdByUserId: "",
    lastMovedAt: null,
    trackLane: "",
    createdAt,
    updatedAt: createdAt,
  };
}

function boardWithCards(): KanbanBoard {
  const base = structuredClone(defaultAppState().boards[0]!);
  base.columns = [
    {
      id: "col-a",
      title: "Колонка A",
      cards: [
        card("old-a", "2026-07-01T10:00:00.000Z"),
        card("new-a", "2026-07-10T10:00:00.000Z"),
      ],
    },
    {
      id: "col-b",
      title: "Колонка B",
      cards: [card("only-b", "2026-07-05T10:00:00.000Z")],
    },
  ];
  return base;
}

describe("isDefaultListSort", () => {
  it("распознаёт стандартную сортировку", () => {
    expect(isDefaultListSort(DEFAULT_LIST_SORT)).toBe(true);
    expect(isDefaultListSort({ key: "column", dir: "asc" })).toBe(false);
  });
});

describe("buildKanbanListViewRows column sort", () => {
  it("сортирует по колонкам слева направо, внутри колонки — новые сверху", () => {
    const board = boardWithCards();
    const state = structuredClone(defaultAppState()) as KanbanAppState;
    const rows = buildKanbanListViewRows(board, state, { key: "column", dir: "asc" });
    expect(rows.map((r) => r.card.id)).toEqual(["new-a", "old-a", "only-b"]);
  });
});

describe("buildKanbanListViewRows default sort", () => {
  it("по умолчанию показывает самые новые карточки сверху", () => {
    const board = boardWithCards();
    const state = structuredClone(defaultAppState()) as KanbanAppState;
    const rows = buildKanbanListViewRows(board, state, DEFAULT_LIST_SORT);
    expect(rows.map((r) => r.card.id)).toEqual(["new-a", "only-b", "old-a"]);
  });
});
