import { describe, expect, it } from "vitest";
import {
  currentAccumulatingPeriod,
  highlightYmdForPeriodTo,
  isPeriodHighlighted,
  periodStartingOnYmd,
  standardPeriodContainingYmd,
} from "@/lib/reconciliation-calendar-period";
import { foReconciliationGroupKey } from "@/lib/clinic-inn-key";

describe("standardPeriodContainingYmd", () => {
  it("MONTHLY_2: 1–15 календарные, 15 в вс не сдвигает слот", () => {
    const p = standardPeriodContainingYmd("2026-02-15", "MONTHLY_2");
    expect(p).toEqual({
      slot: "FIRST_HALF",
      periodFromStr: "2026-02-01",
      periodToStr: "2026-02-15",
    });
  });

  it("MONTHLY_2: 16–конец февраля 2026", () => {
    const p = standardPeriodContainingYmd("2026-02-20", "MONTHLY_2");
    expect(p).toEqual({
      slot: "SECOND_HALF",
      periodFromStr: "2026-02-16",
      periodToStr: "2026-02-28",
    });
  });

  it("MONTHLY_2: месяц на 31", () => {
    const p = standardPeriodContainingYmd("2026-08-31", "MONTHLY_2");
    expect(p?.periodToStr).toBe("2026-08-31");
  });

  it("MONTHLY_1: весь месяц", () => {
    const p = standardPeriodContainingYmd("2026-04-10", "MONTHLY_1");
    expect(p).toEqual({
      slot: "MONTHLY_FULL",
      periodFromStr: "2026-04-01",
      periodToStr: "2026-04-30",
    });
  });
});

describe("currentAccumulatingPeriod + lock", () => {
  it("без lock на 16-е — слот 16–EOM, 1–15 не открывается снова", () => {
    const cur = currentAccumulatingPeriod("2026-08-16", "MONTHLY_2", []);
    expect(cur).toEqual({
      slot: "SECOND_HALF",
      periodFromStr: "2026-08-16",
      periodToStr: "2026-08-31",
    });
  });

  it("lock 1–12 → с 13-го копится до 15, не ждём 16-е", () => {
    const cur = currentAccumulatingPeriod("2026-12-13", "MONTHLY_2", [
      { periodFromStr: "2026-12-01", periodToStr: "2026-12-12" },
    ]);
    expect(cur).toEqual({
      slot: "FIRST_HALF",
      periodFromStr: "2026-12-13",
      periodToStr: "2026-12-15",
    });
  });

  it("lock 1–15 → 16-го не создаёт снова 1–15", () => {
    const cur = currentAccumulatingPeriod("2026-08-16", "MONTHLY_2", [
      { periodFromStr: "2026-08-01", periodToStr: "2026-08-15" },
    ]);
    expect(cur?.periodFromStr).toBe("2026-08-16");
    expect(cur?.slot).toBe("SECOND_HALF");
  });

  it("сегодня внутри сохранённого периода — следующая сверка после to", () => {
    const cur = currentAccumulatingPeriod("2026-12-10", "MONTHLY_2", [
      { periodFromStr: "2026-12-01", periodToStr: "2026-12-12" },
    ]);
    expect(cur).toEqual({
      slot: "FIRST_HALF",
      periodFromStr: "2026-12-13",
      periodToStr: "2026-12-15",
    });
  });
});

describe("periodStartingOnYmd", () => {
  it("старт 13-го в первой половине", () => {
    const p = periodStartingOnYmd("2026-12-13", "MONTHLY_2");
    expect(p?.periodFromStr).toBe("2026-12-13");
    expect(p?.periodToStr).toBe("2026-12-15");
  });
});

describe("highlight", () => {
  it("конец периода вс → пятница до него", () => {
    // 2026-08-15 — суббота; ближайший рабочий до 15 — пт 14
    expect(highlightYmdForPeriodTo("2026-08-15")).toBe("2026-08-14");
    expect(isPeriodHighlighted("2026-08-14", "2026-08-15")).toBe(true);
    expect(isPeriodHighlighted("2026-08-15", "2026-08-15")).toBe(false);
  });

  it("конец периода пн — сам понедельник", () => {
    // 2026-06-15 — понедельник
    expect(highlightYmdForPeriodTo("2026-06-15")).toBe("2026-06-15");
  });
});

describe("foReconciliationGroupKey", () => {
  it("один ИНН — один ключ при разных названиях", () => {
    const a = foReconciliationGroupKey({ id: "c1", inn: "7816 563096" });
    const b = foReconciliationGroupKey({ id: "c2", inn: "7816563096" });
    expect(a).toBe(b);
    expect(a).toBe("inn:7816563096");
  });

  it("без ИНН не склеивает", () => {
    const a = foReconciliationGroupKey({ id: "c1", inn: null });
    const b = foReconciliationGroupKey({ id: "c2", inn: "  " });
    expect(a).toBe("clinic:c1");
    expect(b).toBe("clinic:c2");
  });
});
