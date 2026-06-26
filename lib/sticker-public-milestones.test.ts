import { describe, expect, it } from "vitest";
import { crmKanbanLinkedCardId } from "@/lib/kanban-order-card-url";
import { milestonesFromLinkedOrderKanbanState } from "@/lib/kanban-tenant-state-snippet-for-order";
import {
  milestonesFromKanbanActivity,
  milestonesFromRevisionColumns,
} from "@/lib/sticker-public-milestones";

describe("milestonesFromKanbanActivity", () => {
  it("фиксирует согласование и уход из сборки", () => {
    const m = milestonesFromKanbanActivity([
      { at: "2026-06-22T12:00:00.000Z", text: "Перемещена в «Обработка»" },
      { at: "2026-06-20T10:00:00.000Z", text: "Перемещена в «Сборка»" },
      { at: "2026-06-18T09:00:00.000Z", text: "Перемещена в «Производство»" },
      { at: "2026-06-17T08:00:00.000Z", text: "Перемещена в «Согласование»" },
    ]);
    expect(m.agreedAt).toBe("2026-06-18T09:00:00.000Z");
    expect(m.producedAt).toBe("2026-06-22T12:00:00.000Z");
  });
});

describe("milestonesFromRevisionColumns", () => {
  it("берёт первый переход согласование→производство", () => {
    const m = milestonesFromRevisionColumns([
      { at: new Date("2026-06-10T08:00:00Z"), column: "Согласование" },
      { at: new Date("2026-06-13T10:28:00Z"), column: "Производство" },
      { at: new Date("2026-06-20T12:00:00Z"), column: "Сборка" },
      { at: new Date("2026-06-22T12:13:00Z"), column: "Обработка" },
    ]);
    expect(m.agreedAt).toBe("2026-06-13T10:28:00.000Z");
    expect(m.producedAt).toBe("2026-06-22T12:13:00.000Z");
  });
});

describe("milestonesFromLinkedOrderKanbanState", () => {
  it("читает журнал карточки на доске", () => {
    const orderId = "ord-milestone";
    const cardId = crmKanbanLinkedCardId(orderId);
    const raw = {
      boards: [
        {
          id: "b1",
          title: "Ортопедия",
          columns: [
            {
              id: "c1",
              title: "Колонка",
              cards: [
                {
                  id: cardId,
                  linkedOrderId: orderId,
                  activity: [
                    {
                      at: "2026-06-22T12:13:00.000Z",
                      text: "Перемещена в «Обработка»",
                    },
                    {
                      at: "2026-06-20T10:00:00.000Z",
                      text: "Перемещена в «Сборка»",
                    },
                    {
                      at: "2026-06-13T10:28:00.000Z",
                      text: "Перемещена в «Производство»",
                    },
                    {
                      at: "2026-06-10T08:00:00.000Z",
                      text: "Перемещена в «Согласование»",
                    },
                  ],
                },
              ],
            },
          ],
          users: [],
          archivedCards: [],
        },
      ],
    };
    const m = milestonesFromLinkedOrderKanbanState(raw, orderId);
    expect(m.agreedAt).toBe("2026-06-13T10:28:00.000Z");
    expect(m.producedAt).toBe("2026-06-22T12:13:00.000Z");
  });
});
