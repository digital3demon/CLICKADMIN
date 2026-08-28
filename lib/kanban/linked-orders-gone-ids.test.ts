import { describe, expect, it } from "vitest";
import { kanbanLinkedOrderGoneIds } from "@/lib/kanban/linked-orders-gone-ids";

describe("kanbanLinkedOrderGoneIds", () => {
  it("не снимает живой наряд, даже если его не было в выборке опроса (кириллица в id)", () => {
    expect(
      kanbanLinkedOrderGoneIds({
        requestedIds: ["ord-степанов", "ord-реми"],
        existing: [
          { id: "ord-степанов", archivedAt: null, status: "IN_PROGRESS" },
          { id: "ord-реми", archivedAt: null, status: "NEW" },
        ],
      }),
    ).toEqual([]);
  });

  it("снимает только архив, отмену и отсутствующий id", () => {
    expect(
      kanbanLinkedOrderGoneIds({
        requestedIds: ["жив", "архив", "отмена", "нет-в-бд"],
        existing: [
          { id: "жив", archivedAt: null, status: "IN_PROGRESS" },
          { id: "архив", archivedAt: "2026-08-01T00:00:00.000Z", status: "DONE" },
          { id: "отмена", archivedAt: null, status: "CANCELLED" },
        ],
      }),
    ).toEqual(["архив", "отмена", "нет-в-бд"]);
  });
});
