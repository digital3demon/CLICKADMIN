import { describe, expect, it } from "vitest";
import {
  KANBAN_BOARD_MY_CARDS_ID,
  createCard,
  defaultAppState,
  mergeKanbanStatePreservingLocalBoards,
  kanbanStateForPersistence,
} from "@/lib/kanban/model";
import {
  applyKanbanBoardUiState,
  extractKanbanBoardUiState,
  hasNonDefaultKanbanBoardUi,
  clearKanbanBoardUiLocalForTests,
  loadKanbanBoardUiLocal,
  normalizeKanbanBoardUiState,
  saveKanbanBoardUiLocal,
  stripPersonalKanbanUiForTenant,
} from "@/lib/kanban/user-board-ui-state";

describe("normalizeKanbanBoardUiState", () => {
  it("возвращает null для пустого ввода", () => {
    expect(normalizeKanbanBoardUiState(null)).toBeNull();
    expect(normalizeKanbanBoardUiState(undefined)).toBeNull();
    expect(normalizeKanbanBoardUiState("x")).toBeNull();
  });

  it("нормализует битый payload", () => {
    const ui = normalizeKanbanBoardUiState({
      filters: { assigneeUserId: "u1" },
      viewMode: "calendar",
      filterTemplates: [{ id: "t1", name: "Мой", filters: { due: "overdue" } }],
    });
    expect(ui?.filters.assigneeUserId).toBe("u1");
    expect(ui?.filters.cardTypeId).toBe("");
    expect(ui?.viewMode).toBe("calendar");
    expect(ui?.filterTemplates).toHaveLength(1);
    expect(ui?.filterTemplates[0]?.filters.due).toBe("overdue");
    expect(ui?.filters.peopleJoin).toBe("and");
  });

  it("сохраняет связку «или» у ответственного и участника", () => {
    const ui = normalizeKanbanBoardUiState({
      filters: {
        assigneeUserId: "u-юля",
        participantUserId: "u-саша",
        peopleJoin: "or",
      },
    });
    expect(ui?.filters.peopleJoin).toBe("or");
    expect(ui?.filters.assigneeUserId).toBe("u-юля");
    expect(ui?.filters.participantUserId).toBe("u-саша");
  });
});

describe("stripPersonalKanbanUiForTenant / persistence", () => {
  it("убирает фильтры и шаблоны из tenant payload", () => {
    const state = defaultAppState();
    state.filters.assigneeUserId = "roman";
    state.filterTemplates = [
      {
        id: "t1",
        name: "Roman",
        filters: { ...state.filters },
      },
    ];
    state.search = "013";
    state.viewMode = "list";
    state.activeBoardId = KANBAN_BOARD_MY_CARDS_ID;

    const persisted = kanbanStateForPersistence(state);
    expect(persisted.search).toBe("");
    expect(persisted.filters.assigneeUserId).toBe("");
    expect(persisted.filterTemplates).toEqual([]);
    expect(persisted.viewMode).toBe("board");
    expect(persisted.activeBoardId).not.toBe(KANBAN_BOARD_MY_CARDS_ID);
    expect(state.filters.assigneeUserId).toBe("roman");
  });

  it("stripPersonalKanbanUiForTenant не трогает карточки", () => {
    const state = defaultAppState();
    const board = state.boards[0]!;
    board.columns[0]!.cards.push(createCard({ id: "c1", title: "Card" }));
    state.filters.due = "today";
    const stripped = stripPersonalKanbanUiForTenant(state);
    expect(stripped.filters.due).toBe("");
    expect(stripped.boards[0]!.columns[0]!.cards.some((c) => c.id === "c1")).toBe(
      true,
    );
  });
});

describe("merge preserves personal UI", () => {
  it("не затирает локальные фильтры и activeBoardId remote-ом", () => {
    const local = defaultAppState();
    local.filters.assigneeUserId = "me";
    local.activeBoardId = KANBAN_BOARD_MY_CARDS_ID;
    local.viewMode = "calendar";
    local.search = "local-q";

    const remote = defaultAppState();
    remote.filters.assigneeUserId = "roman";
    remote.viewMode = "list";
    remote.search = "remote-q";

    const merged = mergeKanbanStatePreservingLocalBoards(local, remote);
    expect(merged.filters.assigneeUserId).toBe("me");
    expect(merged.activeBoardId).toBe(KANBAN_BOARD_MY_CARDS_ID);
    expect(merged.viewMode).toBe("calendar");
    expect(merged.search).toBe("local-q");
  });
});

describe("apply / extract", () => {
  it("applyKanbanBoardUiState накладывает UI на state", () => {
    const state = defaultAppState();
    const ui = extractKanbanBoardUiState(state);
    ui.filters.assigneeUserId = "u9";
    ui.viewMode = "list";
    ui.activeBoardId = KANBAN_BOARD_MY_CARDS_ID;
    const next = applyKanbanBoardUiState(state, ui);
    expect(next.filters.assigneeUserId).toBe("u9");
    expect(next.viewMode).toBe("list");
    expect(next.activeBoardId).toBe(KANBAN_BOARD_MY_CARDS_ID);
    expect(hasNonDefaultKanbanBoardUi(ui)).toBe(true);
  });

  it("localStorage UI переживает F5 (кириллица в search)", () => {
    const ui = extractKanbanBoardUiState(defaultAppState());
    ui.search = "Крупышева";
    ui.activeBoardId = KANBAN_BOARD_MY_CARDS_ID;
    saveKanbanBoardUiLocal(ui);
    const loaded = loadKanbanBoardUiLocal();
    expect(loaded?.search).toBe("Крупышева");
    expect(loaded?.activeBoardId).toBe(KANBAN_BOARD_MY_CARDS_ID);
    clearKanbanBoardUiLocalForTests();
  });
});
