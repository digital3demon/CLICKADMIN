import { describe, expect, it } from "vitest";
import type { KanbanAppState, KanbanCard } from "@/lib/kanban/types";
import {
  overlayLocalKanbanCardHeadOntoRemote,
  shouldKeepLocalKanbanMembers,
  shouldKeepLocalKanbanStageDue,
} from "./preserve-kanban-card-head";

describe("shouldKeepLocalKanbanMembers", () => {
  it("не отдаёт пустому inbound локальных людей, кириллица в id не важна", () => {
    expect(
      shouldKeepLocalKanbanMembers(
        { assignees: ["u-юлич"], participants: [] },
        { assignees: [], participants: [] },
      ),
    ).toBe(true);
    expect(
      shouldKeepLocalKanbanMembers(
        { assignees: ["u1"], participants: [] },
        { assignees: ["u2"], participants: [] },
      ),
    ).toBe(false);
    expect(
      shouldKeepLocalKanbanMembers(
        { assignees: [], participants: [] },
        { assignees: [], participants: [] },
      ),
    ).toBe(false);
  });
});

describe("shouldKeepLocalKanbanStageDue", () => {
  it("хранит локальный срок при пустом inbound", () => {
    expect(shouldKeepLocalKanbanStageDue("2026-08-26", "")).toBe(true);
    expect(shouldKeepLocalKanbanStageDue("2026-08-26", null)).toBe(true);
    expect(shouldKeepLocalKanbanStageDue("2026-08-26", "2026-09-01")).toBe(false);
    expect(shouldKeepLocalKanbanStageDue("", "")).toBe(false);
  });
});

describe("overlayLocalKanbanCardHeadOntoRemote", () => {
  it("возвращает срок и участников с локальной сессии на пустой remote", () => {
    const card = (extra: Partial<KanbanCard>): KanbanCard =>
      ({
        id: "c1",
        title: "наряд от 10.02.2026",
        assignees: [],
        participants: [],
        stageDueDate: "",
        dueDate: "",
        ...extra,
      }) as KanbanCard;
    const local = {
      boards: [
        {
          id: "b",
          columns: [
            {
              id: "col",
              cards: [
                card({
                  assignees: ["u1"],
                  participants: ["u2"],
                  stageDueDate: "2026-08-26",
                }),
              ],
            },
          ],
        },
      ],
    } as KanbanAppState;
    const remote = {
      boards: [
        {
          id: "b",
          columns: [{ id: "col", cards: [card({})] }],
        },
      ],
    } as KanbanAppState;
    overlayLocalKanbanCardHeadOntoRemote(local, remote);
    const out = remote.boards[0]!.columns[0]!.cards[0]!;
    expect(out.assignees).toEqual(["u1"]);
    expect(out.participants).toEqual(["u2"]);
    expect(out.stageDueDate).toBe("2026-08-26");
  });

  it("находит карточку по наряду, если id после merge другой", () => {
    const local = {
      boards: [
        {
          id: "b",
          columns: [
            {
              id: "col",
              cards: [
                {
                  id: "old-id",
                  linkedOrderId: "ord-юля",
                  title: "наряд",
                  assignees: [],
                  participants: ["u-саша"],
                  stageDueDate: "",
                  dueDate: "",
                },
              ],
            },
          ],
        },
      ],
    } as KanbanAppState;
    const remote = {
      boards: [
        {
          id: "b",
          columns: [
            {
              id: "col",
              cards: [
                {
                  id: "kaiten-order-ord-юля",
                  linkedOrderId: "ord-юля",
                  title: "наряд",
                  assignees: [],
                  participants: [],
                  stageDueDate: "",
                  dueDate: "",
                },
              ],
            },
          ],
        },
      ],
    } as KanbanAppState;
    overlayLocalKanbanCardHeadOntoRemote(local, remote);
    expect(remote.boards[0]!.columns[0]!.cards[0]!.participants).toEqual([
      "u-саша",
    ]);
  });
});
