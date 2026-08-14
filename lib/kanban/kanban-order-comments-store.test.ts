import { describe, expect, it } from "vitest";
import {
  kanbanOrderCommentsStateKey,
  mergeKanbanOrderComments,
  parseStoredKanbanOrderComments,
} from "@/lib/kanban/kanban-order-comments";
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
