import { describe, expect, it } from "vitest";
import {
  applyStandaloneRowsFromServer,
  extractStandaloneRowsForSync,
} from "@/lib/kanban/standalone-board-sync";
import {
  defaultAppState,
  KANBAN_BOARD_ORTHOPEDICS_ID,
} from "@/lib/kanban/model";
import type { KanbanAppState } from "@/lib/kanban/types";

const standaloneStub = {
  id: "local1",
  title: "Новая",
  description: "",
  cardTypeId: "",
  assignees: [] as string[],
  participants: [] as string[],
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
  createdByUserId: "u1",
  lastMovedAt: null as string | null,
  trackLane: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("standalone-board-sync", () => {
  it("extract и apply сохраняют наряды и подставляют локальные карточки", () => {
    const base = structuredClone(defaultAppState()) as KanbanAppState;
    const ortho = base.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!;
    const col0 = ortho.columns[0]!;
    const linked = {
      ...standaloneStub,
      id: "k1",
      title: "Наряд",
      linkedOrderId: "ord1",
    };
    col0.cards = [linked, { ...standaloneStub }];
    const rows = extractStandaloneRowsForSync(base);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("local1");

    const stripped = structuredClone(base);
    const so = stripped.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!;
    so.columns[0]!.cards = so.columns[0]!.cards.filter((c) => Boolean(c.linkedOrderId));

    const next = applyStandaloneRowsFromServer(stripped, rows);
    const c0 = next.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!.columns[0]!.cards;
    expect(c0.some((c) => c.id === "k1" && c.linkedOrderId === "ord1")).toBe(true);
    expect(c0.some((c) => c.id === "local1")).toBe(true);
  });

  it("не затирает таймер локальной карточки устаревшим снимком с сервера", () => {
    const base = structuredClone(defaultAppState()) as KanbanAppState;
    const ortho = base.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!;
    const col0 = ortho.columns[0]!;
    const t0 = "2026-01-01T00:00:00.000Z";
    const t1 = "2026-06-01T12:00:00.000Z";
    col0.cards = [
      {
        ...standaloneStub,
        id: "t1",
        updatedAt: t1,
        timerStartedAt: t0,
        timerDurationMs: 3_600_000,
      },
    ];

    const staleRows = [
      {
        id: "t1",
        boardId: KANBAN_BOARD_ORTHOPEDICS_ID,
        columnId: col0.id,
        sortIndex: 0,
        payload: {
          ...standaloneStub,
          id: "t1",
          title: "С сервера",
          updatedAt: t0,
          timerStartedAt: null,
          timerDurationMs: null,
        },
      },
    ];
    const next = applyStandaloneRowsFromServer(base, staleRows);
    const card = next.boards
      .find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!
      .columns[0]!.cards.find((c) => c.id === "t1")!;
    expect(card.timerDurationMs).toBe(3_600_000);
    expect(card.timerStartedAt).toBe(t0);
  });
});
