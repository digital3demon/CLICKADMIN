import { describe, expect, it } from "vitest";
import { isKanbanCardTimerExpired } from "@/lib/kanban/kanban-card-timer";
import {
  applyKanbanTimerOnColumnMove,
  freezeKanbanTimerForBlock,
  KANBAN_TIMER_RESTORE_WINDOW_MS,
  resumeKanbanTimerPreservingRemaining,
} from "@/lib/kanban/kanban-stage-timer";
import { createCard } from "@/lib/kanban/model";

const T0 = Date.parse("2026-08-31T12:00:00.000Z");

function cardWithTimer(remainingMs: number, durationMs = remainingMs) {
  return createCard({
    id: "к-остренкова",
    title: "2608-078 Остренкова",
    timerStartedAt: new Date(T0 - (durationMs - remainingMs)).toISOString(),
    timerDurationMs: durationMs,
    timerStartedByUserId: "u-всеволод",
  });
}

describe("applyKanbanTimerOnColumnMove", () => {
  it("вперёд на любую следующую — снимает таймер и помнит остаток (кириллица в названии)", () => {
    const card = cardWithTimer(10 * 60_000, 30 * 60_000);
    expect(applyKanbanTimerOnColumnMove(card, 0, 2, T0)).toBe("parked");
    expect(card.timerStartedAt).toBeNull();
    expect(card.timerParkedAt).toBe(new Date(T0).toISOString());
    expect(card.timerParkedRemainingMs).toBe(10 * 60_000);
    expect(card.timerStartedByUserId).toBe("u-всеволод");
    expect(card.title).toBe("2608-078 Остренкова");
  });

  it("на предыдущую колонку живой таймер не снимает", () => {
    const card = cardWithTimer(8 * 60_000);
    expect(applyKanbanTimerOnColumnMove(card, 2, 1, T0)).toBe("none");
    expect(card.timerStartedAt).toBeTruthy();
    expect(card.timerParkedAt).toBeNull();
  });

  it("откат за 45 мин возвращает остаток на момент снятия", () => {
    const card = cardWithTimer(10 * 60_000, 30 * 60_000);
    applyKanbanTimerOnColumnMove(card, 1, 2, T0);
    const backAt = T0 + 20 * 60_000;
    expect(applyKanbanTimerOnColumnMove(card, 2, 1, backAt)).toBe("restored");
    expect(card.timerDurationMs).toBe(10 * 60_000);
    expect(card.timerStartedAt).toBe(new Date(backAt).toISOString());
    expect(card.timerParkedAt).toBeNull();
  });

  it("после 45 мин снимок пропадает, таймер не возвращается", () => {
    const card = cardWithTimer(10 * 60_000);
    applyKanbanTimerOnColumnMove(card, 0, 1, T0);
    const late = T0 + KANBAN_TIMER_RESTORE_WINDOW_MS + 1;
    expect(applyKanbanTimerOnColumnMove(card, 1, 0, late)).toBe("park_expired");
    expect(card.timerStartedAt).toBeNull();
    expect(card.timerParkedAt).toBeNull();
  });

  it("повторный перенос вперёд не перезаписывает уже снятый снимок", () => {
    const card = cardWithTimer(12 * 60_000);
    applyKanbanTimerOnColumnMove(card, 0, 1, T0);
    expect(applyKanbanTimerOnColumnMove(card, 1, 2, T0 + 60_000)).toBe("none");
    expect(card.timerParkedRemainingMs).toBe(12 * 60_000);
    expect(card.timerParkedAt).toBe(new Date(T0).toISOString());
  });
});

describe("freeze / resume при блоке", () => {
  it("блок замораживает, не удаляет; снятие блока сохраняет остаток", () => {
    const card = cardWithTimer(15 * 60_000, 20 * 60_000);
    expect(freezeKanbanTimerForBlock(card, T0)).toBe(true);
    expect(card.timerStartedAt).toBeTruthy();
    expect(card.timerFrozenAt).toBe(new Date(T0).toISOString());
    const later = T0 + 5 * 60_000;
    expect(resumeKanbanTimerPreservingRemaining(card, later)).toBe(true);
    expect(card.timerFrozenAt).toBeNull();
    const elapsed = later - Date.parse(card.timerStartedAt!);
    expect(elapsed).toBe(5 * 60_000);
  });
});

describe("isKanbanCardTimerExpired", () => {
  it("красный ободок — остаток 0", () => {
    const card = cardWithTimer(0, 5 * 60_000);
    expect(isKanbanCardTimerExpired(card, T0)).toBe(true);
    const live = cardWithTimer(1_000, 5 * 60_000);
    expect(isKanbanCardTimerExpired(live, T0)).toBe(false);
  });
});
