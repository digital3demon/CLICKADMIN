import { describe, expect, it } from "vitest";
import {
  kanbanCardTimerDisplayNowMs,
  kanbanCardTimerTrackFillColor,
} from "@/lib/kanban/kanban-card-timer";

describe("kanbanCardTimerTrackFillColor", () => {
  it("зелёный до 1/3, жёлтый до 2/3, красный после", () => {
    expect(kanbanCardTimerTrackFillColor(0)).toMatch(/34 197 94/);
    expect(kanbanCardTimerTrackFillColor(0.32)).toMatch(/34 197 94/);
    expect(kanbanCardTimerTrackFillColor(1 / 3)).toMatch(/234 179 8/);
    expect(kanbanCardTimerTrackFillColor(0.5)).toMatch(/234 179 8/);
    expect(kanbanCardTimerTrackFillColor(2 / 3)).toMatch(/239 68 68/);
    expect(kanbanCardTimerTrackFillColor(1)).toMatch(/239 68 68/);
  });
});

describe("kanbanCardTimerDisplayNowMs", () => {
  it("при заморозке возвращает момент freeze", () => {
    const frozen = "2026-01-01T12:00:00.000Z";
    expect(kanbanCardTimerDisplayNowMs(frozen, Date.now())).toBe(Date.parse(frozen));
  });

  it("без freeze — текущее время", () => {
    const now = 1_700_000_000_000;
    expect(kanbanCardTimerDisplayNowMs(null, now)).toBe(now);
    expect(kanbanCardTimerDisplayNowMs(undefined, now)).toBe(now);
  });
});
