import { describe, expect, it } from "vitest";
import {
  activityLooksLikeCreate,
  kanbanOrderActivityStateKey,
  mergeKanbanOrderActivity,
  parseStoredKanbanOrderActivity,
  resolveKanbanOrderActivityToPersist,
  seedKanbanCreatedActivity,
} from "@/lib/kanban/kanban-order-activity";

describe("kanban-order-activity", () => {
  it("ключ и кириллица в тексте", () => {
    expect(kanbanOrderActivityStateKey(" ord-степанов ")).toBe(
      "kanbanActivityV1:ord-степанов",
    );
    const rows = parseStoredKanbanOrderActivity({
      activity: [
        {
          id: "a1",
          type: "update",
          text: "Перемещена в «Производство»",
          userId: "u-я",
          actorLabel: "Арина",
          at: "2026-08-28T16:00:00.000Z",
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.text).toBe("Перемещена в «Производство»");
    expect(rows[0]?.actorLabel).toBe("Арина");
  });

  it("пустой incoming не затирает журнал", () => {
    const existing = [
      {
        id: "a1",
        type: "create",
        text: "Карточка создана",
        userId: "",
        at: "2026-07-29T10:00:00.000Z",
      },
    ];
    expect(resolveKanbanOrderActivityToPersist([], existing)).toBe("keep-existing");
  });

  it("сливает перенос и не дублирует создание", () => {
    const merged = mergeKanbanOrderActivity(
      [
        {
          id: "m1",
          type: "update",
          text: "Перемещена в «Сборка»",
          userId: "u-юля",
          at: "2026-08-28T12:00:00.000Z",
        },
      ],
      [
        {
          id: "c1",
          type: "create",
          text: "Карточка создана",
          userId: "",
          at: "2026-07-29T10:00:00.000Z",
        },
      ],
    );
    expect(merged.map((r) => r.id)).toEqual(["m1", "c1"]);
    expect(activityLooksLikeCreate(merged[1]!)).toBe(true);
  });

  it("seed создания, если журнал пуст (кириллица в oid)", () => {
    const rows = seedKanbanCreatedActivity({
      id: "карта-степанов",
      linkedOrderId: "ord-степанов",
      createdAt: "2026-07-29T10:00:00.000Z",
      createdByUserId: "",
      activity: [],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.text).toBe("Карточка создана");
    expect(rows[0]?.at).toBe("2026-07-29T10:00:00.000Z");
  });
});
