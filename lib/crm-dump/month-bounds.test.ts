import { describe, expect, it } from "vitest";
import {
  defaultDumpMonthKey,
  parseMonthKey,
} from "@/lib/crm-dump/month-bounds";

describe("crm-dump month-bounds", () => {
  it("парсит YYYY-MM и границы месяца", () => {
    const b = parseMonthKey("2026-04");
    expect(b).not.toBeNull();
    expect(b!.monthKey).toBe("2026-04");
    expect(b!.fromInclusive.getFullYear()).toBe(2026);
    expect(b!.fromInclusive.getMonth()).toBe(3);
    expect(b!.fromInclusive.getDate()).toBe(1);
    expect(b!.toExclusive.getFullYear()).toBe(2026);
    expect(b!.toExclusive.getMonth()).toBe(4);
    expect(b!.toExclusive.getDate()).toBe(1);
  });

  it("отклоняет мусор", () => {
    expect(parseMonthKey("2026-13")).toBeNull();
    expect(parseMonthKey("04-2026")).toBeNull();
    expect(parseMonthKey("")).toBeNull();
  });

  it("defaultDumpMonthKey — предыдущий месяц", () => {
    const key = defaultDumpMonthKey(new Date(2026, 7, 8));
    expect(key).toBe("2026-07");
  });
});
