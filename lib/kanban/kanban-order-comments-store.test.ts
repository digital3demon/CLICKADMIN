import { describe, expect, it } from "vitest";
import {
  collectLinkedOrderCommentsFromState,
  kanbanOrderCommentsStateKey,
  mergeIncomingKaitenIntoKanbanComments,
  mergeKanbanOrderComments,
  parseStoredKanbanOrderComments,
  resolveKanbanOrderCommentsToPersist,
} from "@/lib/kanban/kanban-order-comments";
import { defaultAppState, KANBAN_BOARD_ORTHOPEDICS_ID } from "@/lib/kanban/model";
import type { KanbanAppState } from "@/lib/kanban/types";
import type { CardComment } from "@/lib/kanban/types";

function cm(partial: Partial<CardComment> & { id: string; text: string }): CardComment {
  return {
    userId: "u1",
    createdAt: "2026-08-14T10:00:00.000Z",
    ...partial,
  };
}

describe("kanbanOrderCommentsStateKey", () => {
  it("namespaces by order id", () => {
    expect(kanbanOrderCommentsStateKey(" ord-1 ")).toBe("kanbanCommentsV1:ord-1");
  });
});

describe("parseStoredKanbanOrderComments", () => {
  it("reads compact list and ignores junk", () => {
    const rows = parseStoredKanbanOrderComments({
      comments: [
        cm({ id: "cm-1", text: "привет" }),
        null,
        { id: "cm-2", text: "ещё", userId: "u2", createdAt: "2026-08-14T11:00:00.000Z" },
      ],
    });
    expect(rows.map((r) => r.id)).toEqual(["cm-1", "cm-2"]);
    expect(rows[0]?.text).toBe("привет");
  });

  it("returns empty for bad payload", () => {
    expect(parseStoredKanbanOrderComments(null)).toEqual([]);
    expect(parseStoredKanbanOrderComments({ comments: "nope" })).toEqual([]);
  });
});

describe("resolveKanbanOrderCommentsToPersist", () => {
  it("пустой incoming не затирает store с кириллицей", () => {
    const existing = [cm({ id: "cm-1", text: "корректировка занесена Шубина" })];
    expect(resolveKanbanOrderCommentsToPersist([], existing)).toBe("keep-existing");
    const merged = resolveKanbanOrderCommentsToPersist(
      [cm({ id: "cm-2", text: "протетика пришла" })],
      existing,
    );
    expect(merged).not.toBe("keep-existing");
    if (merged === "keep-existing") return;
    expect(merged.map((c) => c.text)).toEqual(
      expect.arrayContaining(["корректировка занесена Шубина", "протетика пришла"]),
    );
  });
});

describe("collectLinkedOrderCommentsFromState", () => {
  it("собирает чат до slim, кириллица вокруг номера", () => {
    const state = structuredClone(defaultAppState()) as KanbanAppState;
    const board = state.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)!;
    board.columns[0]!.cards = [
      {
        id: "c1",
        title: "2607-115 Шубина Т.В.",
        description: "",
        cardTypeId: "",
        assignees: [],
        participants: [],
        dueDate: "",
        urgent: false,
        checklist: [],
        files: [],
        comments: [
          cm({ id: "cm-sh", text: "!!! Надо глянуть че тут выставляли ранее" }),
        ],
        activity: [],
        blocked: false,
        blockReason: "",
        blockedByUserId: "",
        blockedAt: "",
        createdByUserId: "",
        lastMovedAt: null,
        trackLane: "",
        createdAt: "2026-08-25T14:00:00.000Z",
        updatedAt: "2026-08-25T14:00:00.000Z",
        linkedOrderId: "ord-shubina",
      },
    ];
    const byOrder = collectLinkedOrderCommentsFromState(state);
    expect(byOrder.get("ord-shubina")?.map((c) => c.text)).toEqual([
      "!!! Надо глянуть че тут выставляли ранее",
    ]);
    expect(collectLinkedOrderCommentsFromState({
      ...state,
      boards: state.boards.map((b) => ({
        ...b,
        columns: b.columns.map((c) => ({
          ...c,
          cards: c.cards.map((card) => ({ ...card, comments: [] })),
        })),
      })),
    }).size).toBe(0);
  });
});

describe("mergeKanbanOrderComments", () => {
  it("fills slimmed card from store", () => {
    const merged = mergeKanbanOrderComments(
      [],
      [cm({ id: "cm-1", text: "из CRM" })],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.text).toBe("из CRM");
  });

  it("keeps synced row when both present", () => {
    const merged = mergeKanbanOrderComments(
      [cm({ id: "cm-1", text: "черновик", syncStatus: "pending" })],
      [cm({ id: "cm-1", text: "черновик", syncStatus: "synced" })],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.syncStatus).toBe("synced");
  });
});

describe("mergeIncomingKaitenIntoKanbanComments", () => {
  it("fills empty store from Kaiten when card comments were slimmed", () => {
    const r = mergeIncomingKaitenIntoKanbanComments([], [], [
      { id: 11, text: "@digitaldemon тест", created: "2026-08-08T14:10:00.000Z" },
      { id: 22, text: "@zedpomaps @ModelistD", created: "2026-08-04T12:48:00.000Z" },
      { id: 33, text: "Прикрепил(а) image.png (55.27 KB)", created: "2026-07-28T09:23:00.000Z" },
    ]);
    expect(r.changed).toBe(true);
    expect(r.next).toHaveLength(3);
    expect(r.next.map((x) => x.externalCommentId).sort()).toEqual(["11", "22", "33"]);
  });

  it("partial Kaiten list does not drop store history", () => {
    const store = [
      cm({
        id: "kt-1",
        text: "старый",
        externalCommentId: "1",
        source: "KAITEN",
        syncStatus: "synced",
      }),
      cm({
        id: "kt-2",
        text: "ещё",
        externalCommentId: "2",
        source: "KAITEN",
        syncStatus: "synced",
      }),
    ];
    const r = mergeIncomingKaitenIntoKanbanComments([], store, [
      { id: 3, text: "новый", created: "2026-08-20T09:00:00.000Z" },
    ]);
    expect(r.next.map((x) => x.externalCommentId).sort()).toEqual(["1", "2", "3"]);
  });

  it("second ingest with a shorter list keeps previous rows", () => {
    const first = mergeIncomingKaitenIntoKanbanComments([], [], [
      { id: 1, text: "один", created: "2026-08-01T00:00:00.000Z" },
      { id: 2, text: "два", created: "2026-08-02T00:00:00.000Z" },
    ]);
    const second = mergeIncomingKaitenIntoKanbanComments([], first.next, [
      { id: 2, text: "два", created: "2026-08-02T00:00:00.000Z" },
    ]);
    expect(second.next).toHaveLength(2);
    expect(second.next.map((x) => x.externalCommentId).sort()).toEqual(["1", "2"]);
  });
});
