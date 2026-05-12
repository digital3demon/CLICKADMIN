import { describe, expect, it } from "vitest";
import {
  kanbanCardTimerElapsedRatio,
  kanbanCardTimerRemainingMs,
} from "./kanban-card-timer";

describe("kanbanCardTimerElapsedRatio", () => {
  it("is 0 before start", () => {
    const start = new Date("2026-05-09T12:00:00.000Z").toISOString();
    expect(
      kanbanCardTimerElapsedRatio(start, 60_000, Date.parse(start) - 1000),
    ).toBe(0);
  });

  it("is ~0.5 halfway", () => {
    const start = new Date("2026-05-09T12:00:00.000Z").toISOString();
    const r = kanbanCardTimerElapsedRatio(start, 60_000, Date.parse(start) + 30_000);
    expect(r).toBeGreaterThan(0.49);
    expect(r).toBeLessThan(0.51);
  });

  it("caps at 1 after duration", () => {
    const start = new Date("2026-05-09T12:00:00.000Z").toISOString();
    expect(
      kanbanCardTimerElapsedRatio(start, 60_000, Date.parse(start) + 120_000),
    ).toBe(1);
  });
});

describe("kanbanCardTimerRemainingMs", () => {
  it("returns 0 when expired", () => {
    const start = new Date("2026-05-09T12:00:00.000Z").toISOString();
    expect(kanbanCardTimerRemainingMs(start, 60_000, Date.parse(start) + 120_000)).toBe(
      0,
    );
  });
});
