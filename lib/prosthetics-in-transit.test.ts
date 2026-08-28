import { describe, expect, it } from "vitest";
import {
  collapseProstheticsListTwins,
  isProstheticsAwaitingAccept,
  prostheticsOpenListTwinKey,
} from "./prosthetics-in-transit";

describe("isProstheticsAwaitingAccept", () => {
  it("история «Ожидает» не зависит от галочки наряда", () => {
    expect(
      isProstheticsAwaitingAccept({ resolvedAt: null, rejectedAt: null }),
    ).toBe(true);
    expect(
      isProstheticsAwaitingAccept({
        resolvedAt: "2026-08-28T12:00:00.000Z",
        rejectedAt: null,
      }),
    ).toBe(false);
  });
});

describe("prostheticsOpenListTwinKey", () => {
  it("inbox с ??? и legacy без префикса — один ключ на наряд", () => {
    const a = prostheticsOpenListTwinKey(
      "ord-1",
      "??? 02085 1шт\n01125 3шт",
    );
    const b = prostheticsOpenListTwinKey("ord-1", "02085 1шт 01125 3шт");
    expect(a).toBe(b);
  });
});

describe("collapseProstheticsListTwins", () => {
  const at = new Date("2026-08-25T11:51:00.100Z");
  const inbox = {
    id: "inbox-1",
    text: "??? 02085 1шт\n01125 3шт\n01462 1шт\n01461 4шт",
    source: "DEMO_KANBAN" as const,
    createdAt: at,
    orderId: "ord-261",
  };
  const legacy = {
    id: "leg-1",
    text: "02085 1шт\n01125 3шт\n01462 1шт\n01461 4шт",
    source: "DEMO_KANBAN" as const,
    createdAt: new Date("2026-08-25T11:51:00.000Z"),
    orderId: "ord-261",
  };

  it("дубль inbox+legacy одной кнопки схлопывается (как в истории — одна запись)", () => {
    const rows = collapseProstheticsListTwins([inbox, legacy]);
    expect(rows).toHaveLength(1);
  });

  it("тот же текст на другом наряде остаётся отдельной карточкой", () => {
    const rows = collapseProstheticsListTwins([
      inbox,
      { ...legacy, id: "leg-2", orderId: "ord-294" },
    ]);
    expect(rows).toHaveLength(2);
  });

  it("тот же текст спустя несколько секунд — новая заявка", () => {
    const rows = collapseProstheticsListTwins([
      inbox,
      {
        ...legacy,
        id: "leg-later",
        createdAt: new Date("2026-08-25T11:51:08.000Z"),
      },
    ]);
    expect(rows).toHaveLength(2);
  });
});
