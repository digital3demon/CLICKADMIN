import { describe, expect, it } from "vitest";
import { reconciliationCronTasksForNow } from "@/lib/reconciliation-schedule-msk";

describe("reconciliation-schedule-msk", () => {
  it("MONTHLY_2: первая половина в последний рабочий день ≤15 (апр. 2026)", () => {
    const now = new Date(Date.UTC(2026, 3, 15, 17, 8, 0, 0));
    const tasks = reconciliationCronTasksForNow(now, "MONTHLY_2");
    const half1 = tasks.find((t) => t.slot === "FIRST_HALF");
    expect(half1).toBeDefined();
    expect(half1?.periodToStr).toBe("2026-04-15");
  });

  it("MONTHLY_2: вторая половина в последний рабочий день месяца", () => {
    const now = new Date(Date.UTC(2026, 3, 30, 17, 5, 0, 0));
    const tasks = reconciliationCronTasksForNow(now, "MONTHLY_2");
    const h2 = tasks.find((t) => t.slot === "SECOND_HALF");
    expect(h2).toBeDefined();
    expect(h2?.periodToStr).toBe("2026-04-30");
  });

  it("MONTHLY_1: полный месяц только в последний рабочий день", () => {
    const now = new Date(Date.UTC(2026, 3, 30, 17, 5, 0, 0));
    const tasks = reconciliationCronTasksForNow(now, "MONTHLY_1");
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.slot).toBe("MONTHLY_FULL");
  });

  it("вне окна 20–21 МСК — пусто", () => {
    const now = new Date(Date.UTC(2026, 3, 15, 10, 0, 0, 0));
    expect(reconciliationCronTasksForNow(now, "MONTHLY_2")).toHaveLength(0);
  });
});
