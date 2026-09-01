import { describe, expect, it } from "vitest";
import {
  buildKanbanListViewRows,
  DEFAULT_LIST_SORT,
  isDefaultListSort,
  sortKanbanColumnCards,
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

describe("buildKanbanListViewRows · фильтр участника", () => {
  it("без «МОИ» находит карточку по кэшу шапки, даже если participants пустой", () => {
    const board = boardWithCards();
    const hit = board.columns[0]!.cards[0]!;
    hit.title = "2608-371 Кучинский О. Юля";
    hit.linkedOrderId = "ord-кучинский";
    hit.participants = [];
    const state = structuredClone(defaultAppState()) as KanbanAppState;
    state.filters.participantUserId = "u-юля";
    const empty = buildKanbanListViewRows(board, state, DEFAULT_LIST_SORT, {
      memberHeads: null,
    });
    expect(empty.map((r) => r.card.id)).not.toContain("old-a");
    const rows = buildKanbanListViewRows(board, state, DEFAULT_LIST_SORT, {
      memberHeads: {
        "oid:ord-кучинский": {
          assignees: [],
          participants: ["u-юля"],
          fingerprint: null,
          stageDue: "",
        },
      },
    });
    expect(rows.map((r) => r.card.id)).toContain("old-a");
  });
});

describe("sortKanbanColumnCards", () => {
  it("кириллица до и после: название А → Я внутри колонки", () => {
    const board = boardWithCards();
    const яблоко = card("c-яблоко", "2026-07-01T10:00:00.000Z");
    яблоко.title = "до Яблоко после";
    const абрикос = card("c-абрикос", "2026-07-02T10:00:00.000Z");
    абрикос.title = "до Абрикос после";
    const sorted = sortKanbanColumnCards([яблоко, абрикос], { key: "title", dir: "asc" }, {
      columnTitle: "К исполнению",
      columnId: "col-a",
      columnIndex: 0,
      board,
      allBoards: [board],
      homeBoardId: () => board.id,
    });
    expect(sorted.map((c) => c.id)).toEqual(["c-абрикос", "c-яблоко"]);
  });

  it("создана: новые сверху, кириллица в id не ломает порядок", () => {
    const board = boardWithCards();
    const oldC = card("старая", "2026-07-01T10:00:00.000Z");
    const newC = card("новая", "2026-07-10T10:00:00.000Z");
    const sorted = sortKanbanColumnCards([oldC, newC], DEFAULT_LIST_SORT, {
      columnTitle: "К исполнению",
      columnId: "col-a",
      columnIndex: 0,
      board,
      allBoards: [board],
      homeBoardId: () => board.id,
    });
    expect(sorted.map((c) => c.id)).toEqual(["новая", "старая"]);
  });
});
