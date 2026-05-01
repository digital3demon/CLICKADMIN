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
});
