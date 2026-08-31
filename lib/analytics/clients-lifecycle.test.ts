import { describe, expect, it } from "vitest";
import {
  CLIENT_DISAPPEARED_DAYS,
  CLIENT_RETURN_GAP_DAYS,
  findReturnInPeriod,
  idleDaysSince,
  isDisappeared,
  isNewInPeriod,
  lastOrderAt,
} from "@/lib/analytics/clients-lifecycle";

const from = new Date("2026-08-01T00:00:00.000Z");
const to = new Date("2026-08-31T23:59:59.999Z");

describe("isNewInPeriod", () => {
  it("новый врач: createdAt в окне, кириллица в ФИО не влияет", () => {
    expect(
      isNewInPeriod({
        createdAt: new Date("2026-08-10T12:00:00.000Z"),
        from,
        to,
        treatAsExisting: false,
        deletedAt: null,
      }),
    ).toBe(true);
  });

  it("не новый: кнопка «не новый доктор» / клиника «Стоматология «Улыбка»»", () => {
    expect(
      isNewInPeriod({
        createdAt: new Date("2026-08-10T12:00:00.000Z"),
        from,
        to,
        treatAsExisting: true,
        deletedAt: null,
      }),
    ).toBe(false);
  });

  it("вне периода и удалённые не новые", () => {
    expect(
      isNewInPeriod({
        createdAt: new Date("2026-07-31T12:00:00.000Z"),
        from,
        to,
        treatAsExisting: false,
        deletedAt: null,
      }),
    ).toBe(false);
    expect(
      isNewInPeriod({
        createdAt: new Date("2026-08-10T12:00:00.000Z"),
        from,
        to,
        treatAsExisting: false,
        deletedAt: new Date("2026-08-11T00:00:00.000Z"),
      }),
    ).toBe(false);
  });
});

describe("findReturnInPeriod", () => {
  it("вернулся после паузы ≥ 3 месяцев: Петров → клиника «Белые зубы»", () => {
    const prev = new Date("2026-04-20T10:00:00.000Z");
    const back = new Date("2026-08-12T09:00:00.000Z");
    const hit = findReturnInPeriod([prev, back], from, to);
    expect(hit).not.toBeNull();
    expect(hit!.returnedAt).toEqual(back);
    expect(hit!.previousAt).toEqual(prev);
    expect(hit!.gapDays).toBeGreaterThanOrEqual(CLIENT_RETURN_GAP_DAYS);
  });

  it("первый заказ в жизни — не возврат", () => {
    expect(
      findReturnInPeriod([new Date("2026-08-05T10:00:00.000Z")], from, to),
    ).toBeNull();
  });

  it("пауза меньше 90 дней — не возврат", () => {
    expect(
      findReturnInPeriod(
        [
          new Date("2026-06-20T10:00:00.000Z"),
          new Date("2026-08-10T10:00:00.000Z"),
        ],
        from,
        to,
      ),
    ).toBeNull();
  });
});

describe("isDisappeared", () => {
  const asOf = new Date("2026-08-31T12:00:00.000Z");

  it("пропал: нет заказов более 45 дней (клиника «Север» / доктор Иванов)", () => {
    expect(
      isDisappeared({
        lastOrderAt: new Date("2026-07-10T12:00:00.000Z"),
        asOf,
        days: CLIENT_DISAPPEARED_DAYS,
      }),
    ).toBe(true);
  });

  it("ровно 45 дней — ещё не пропал", () => {
    expect(
      isDisappeared({
        lastOrderAt: new Date(asOf.getTime() - CLIENT_DISAPPEARED_DAYS * 86400000),
        asOf,
      }),
    ).toBe(false);
  });

  it("никогда не было заказов — не пропал", () => {
    expect(isDisappeared({ lastOrderAt: null, asOf })).toBe(false);
  });
});

describe("lastOrderAt / idleDaysSince", () => {
  it("берёт поздний заказ и считает простой в днях", () => {
    const last = lastOrderAt([
      new Date("2026-06-01T00:00:00.000Z"),
      new Date("2026-07-15T00:00:00.000Z"),
    ]);
    expect(last?.toISOString()).toBe("2026-07-15T00:00:00.000Z");
    expect(idleDaysSince(last!, new Date("2026-08-31T00:00:00.000Z"))).toBe(47);
  });
});
