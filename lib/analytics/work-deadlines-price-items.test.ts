import { describe, expect, it } from "vitest";
import { defaultDeadlinesSchedule } from "@/lib/analytics/deadlines-schedule";
import { aggregateWorkDeadlinesByPriceItem } from "@/lib/analytics/work-deadlines-price-items";

const schedule = defaultDeadlinesSchedule();
const itemA = {
  id: "item-a",
  code: "A-01",
  name: "Коронка",
  leadWorkingDays: 3,
};
const itemB = {
  id: "item-b",
  code: "B-02",
  name: "Вкладка",
  leadWorkingDays: 5,
};

describe("aggregateWorkDeadlinesByPriceItem", () => {
  it("группирует несколько строк одной позиции в одну запись", () => {
    const createdAt = new Date("2026-02-10T08:00:00.000Z");
    const handedAt = new Date("2026-02-12T15:00:00.000Z");
    const from = new Date("2026-02-01T00:00:00.000Z");
    const to = new Date("2026-02-28T23:59:59.999Z");

    const rows = aggregateWorkDeadlinesByPriceItem(
      [
        {
          id: "order-1",
          createdAt,
          handedAt,
          constructions: [
            {
              priceListItemId: itemA.id,
              priceListItem: itemA,
            },
            {
              priceListItemId: itemA.id,
              priceListItem: itemA,
            },
            {
              priceListItemId: itemA.id,
              priceListItem: itemA,
            },
          ],
        },
      ],
      from,
      to,
      schedule,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.code).toBe("A-01");
    expect(rows[0]?.orderCount).toBe(1);
    expect(rows[0]?.lineCount).toBe(3);
    expect(rows[0]?.averageDurationMinutes).toBeGreaterThan(0);
  });

  it("разделяет разные позиции в одном наряде", () => {
    const createdAt = new Date("2026-02-10T08:00:00.000Z");
    const handedAt = new Date("2026-02-12T15:00:00.000Z");
    const from = new Date("2026-02-01T00:00:00.000Z");
    const to = new Date("2026-02-28T23:59:59.999Z");

    const rows = aggregateWorkDeadlinesByPriceItem(
      [
        {
          id: "order-2",
          createdAt,
          handedAt,
          constructions: [
            {
              priceListItemId: itemA.id,
              priceListItem: itemA,
            },
            {
              priceListItemId: itemB.id,
              priceListItem: itemB,
            },
          ],
        },
      ],
      from,
      to,
      schedule,
    );

    expect(rows).toHaveLength(2);
    const codes = rows.map((r) => r.code).sort();
    expect(codes).toEqual(["A-01", "B-02"]);
    for (const row of rows) {
      expect(row.orderCount).toBe(1);
      expect(row.lineCount).toBe(1);
    }
  });
});
