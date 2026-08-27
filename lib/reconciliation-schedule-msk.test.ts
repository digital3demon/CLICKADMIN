import { describe, expect, it } from "vitest";
import { reconciliationCronTasksForNow } from "@/lib/reconciliation-schedule-msk";

describe("reconciliation-schedule-msk", () => {
  it("cron не ставит задачи — снимки не нужны", () => {
    const now = new Date(Date.UTC(2026, 3, 15, 17, 8, 0, 0));
    expect(reconciliationCronTasksForNow(now, "MONTHLY_2")).toHaveLength(0);
    expect(reconciliationCronTasksForNow(now, "MONTHLY_1")).toHaveLength(0);
  });
});
