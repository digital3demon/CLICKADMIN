import { describe, expect, it } from "vitest";
import { crmKanbanLinkedCardId } from "@/lib/kanban-order-card-url";
import { firstHandedToAdminsAtFromLinkedOrderKanbanState } from "@/lib/kanban-tenant-state-snippet-for-order";

describe("firstHandedToAdminsAtFromLinkedOrderKanbanState", () => {
  it("берёт самый ранний переход в колонку «сдана админам» по журналу (новые записи в начале массива)", () => {
    const orderId = "ord-кириллица-id";
    const cardId = crmKanbanLinkedCardId(orderId);
    const raw = {
      boards: [
        {
          id: "b1",
          title: "Ортопедия",
          columns: [
            {
              id: "c1",
              title: "Очередь",
              cards: [
                {
                  id: cardId,
                  linkedOrderId: orderId,
                  activity: [
                    {
                      at: "2026-05-13T12:00:00.000Z",
                      text: "Перемещена в «К исполнению»",
                      userId: "u1",
                    },
                    {
                      at: "2026-05-12T16:15:00.000Z",
                      text: "Перемещена в «Сдана админам» (Kaiten)",
                      userId: "u1",
                    },
                    {
                      at: "2026-05-11T08:00:00.000Z",
                      text: "Перемещена в «Сдана админам»",
                      userId: "u1",
                    },
                  ],
                },
              ],
            },
          ],
          users: [{ id: "u1", name: "Вика" }],
          archivedCards: [],
        },
      ],
    };

    expect(firstHandedToAdminsAtFromLinkedOrderKanbanState(raw, orderId)).toBe(
      "2026-05-11T08:00:00.000Z",
    );
  });

  it("возвращает null, если в тексте только другая колонка", () => {
    const orderId = "ord-2";
    const cardId = crmKanbanLinkedCardId(orderId);
    const raw = {
      boards: [
        {
          id: "b1",
          title: "Доска",
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
                      at: "2026-05-10T10:00:00.000Z",
                      text: "Перемещена в «К исполнению»",
                      userId: "u1",
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

    expect(firstHandedToAdminsAtFromLinkedOrderKanbanState(raw, orderId)).toBeNull();
  });
});
