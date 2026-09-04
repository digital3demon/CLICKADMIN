/**
 * Этапный таймер: снятие при переносе вперёд, восстановление за 45 мин при откате,
 * заморозка при блоке (без удаления).
 */
import {
  kanbanCardTimerDisplayNowMs,
  kanbanCardTimerRemainingMs,
} from "@/lib/kanban/kanban-card-timer";
import type { KanbanCard } from "@/lib/kanban/types";

/** Окно, в котором откат на предыдущую колонку возвращает снятый таймер. */
export const KANBAN_TIMER_RESTORE_WINDOW_MS = 45 * 60 * 1000;

export type KanbanTimerColumnMoveResult = "parked" | "restored" | "park_expired" | "none";

function hasLiveTimer(card: Pick<KanbanCard, "timerStartedAt" | "timerDurationMs">): boolean {
  return (
    Boolean(card.timerStartedAt) &&
    card.timerDurationMs != null &&
    Number.isFinite(card.timerDurationMs) &&
    card.timerDurationMs > 0
  );
}

function hasParkedTimer(
  card: Pick<KanbanCard, "timerParkedAt" | "timerParkedRemainingMs">,
): boolean {
  return Boolean(card.timerParkedAt) && card.timerParkedRemainingMs != null;
}

export function liveKanbanTimerRemainingMs(
  card: Pick<KanbanCard, "timerStartedAt" | "timerDurationMs" | "timerFrozenAt">,
  nowMs: number,
): number | null {
  if (!hasLiveTimer(card)) return null;
  const displayNow = kanbanCardTimerDisplayNowMs(card.timerFrozenAt, nowMs);
  return kanbanCardTimerRemainingMs(card.timerStartedAt, card.timerDurationMs, displayNow);
}

export function clearKanbanTimerPark(
  card: Pick<KanbanCard, "timerParkedAt" | "timerParkedRemainingMs">,
): void {
  card.timerParkedAt = null;
  card.timerParkedRemainingMs = null;
}

/** Заморозка живого таймера (блок). Уже замороженный не трогаем. */
export function freezeKanbanTimerForBlock(
  card: Pick<KanbanCard, "timerStartedAt" | "timerDurationMs" | "timerFrozenAt">,
  nowMs: number = Date.now(),
): boolean {
  if (!hasLiveTimer(card)) return false;
  if (card.timerFrozenAt) return false;
  card.timerFrozenAt = new Date(nowMs).toISOString();
  return true;
}

/** Снять заморозку, сдвинув старт так, чтобы остаток не «убежал» за время паузы. */
export function resumeKanbanTimerPreservingRemaining(
  card: Pick<KanbanCard, "timerStartedAt" | "timerDurationMs" | "timerFrozenAt">,
  nowMs: number = Date.now(),
): boolean {
  if (!card.timerFrozenAt) return false;
  const frozenAt = Date.parse(card.timerFrozenAt);
  const startedAt = card.timerStartedAt ? Date.parse(card.timerStartedAt) : NaN;
  card.timerFrozenAt = null;
  if (!Number.isFinite(frozenAt) || !Number.isFinite(startedAt)) return true;
  const shift = Math.max(0, nowMs - frozenAt);
  card.timerStartedAt = new Date(startedAt + shift).toISOString();
  return true;
}

function parkLiveTimer(card: KanbanCard, nowMs: number): boolean {
  const remaining = liveKanbanTimerRemainingMs(card, nowMs);
  if (remaining == null) return false;
  card.timerParkedAt = new Date(nowMs).toISOString();
  card.timerParkedRemainingMs = remaining;
  card.timerStartedAt = null;
  card.timerFrozenAt = null;
  return true;
}

function restoreParkedTimer(card: KanbanCard, nowMs: number): KanbanTimerColumnMoveResult {
  if (!hasParkedTimer(card)) return "none";
  const parkedAt = Date.parse(String(card.timerParkedAt));
  if (!Number.isFinite(parkedAt) || nowMs - parkedAt > KANBAN_TIMER_RESTORE_WINDOW_MS) {
    clearKanbanTimerPark(card);
    return "park_expired";
  }
  const remaining = Math.max(0, Math.floor(Number(card.timerParkedRemainingMs)));
  const originalDuration =
    card.timerDurationMs != null && Number.isFinite(card.timerDurationMs) && card.timerDurationMs > 0
      ? card.timerDurationMs
      : remaining;
  if (remaining <= 0) {
    const duration = originalDuration > 0 ? originalDuration : 1;
    card.timerDurationMs = duration;
    card.timerStartedAt = new Date(nowMs - duration).toISOString();
  } else {
    card.timerDurationMs = remaining;
    card.timerStartedAt = new Date(nowMs).toISOString();
  }
  card.timerFrozenAt = null;
  clearKanbanTimerPark(card);
  return "restored";
}

export type KanbanTimerColumnMoveOpts = {
  fromColumnId?: string;
  toColumnId?: string;
  /** Если задано — отключать только на этой колонке, а не на любом шаге вперёд. */
  stopColumnId?: string | null;
};

/**
 * Вперёд (любая следующая колонка) — снять живой таймер и запомнить остаток.
 * Если задан stopColumnId — снимать только при входе на эту колонку.
 * Назад — не снимать; если есть снимок младше 45 мин, вернуть таймер с того остатка.
 */
export function applyKanbanTimerOnColumnMove(
  card: KanbanCard,
  fromColumnIndex: number,
  toColumnIndex: number,
  nowMs: number = Date.now(),
  opts?: KanbanTimerColumnMoveOpts,
): KanbanTimerColumnMoveResult {
  if (
    !Number.isFinite(fromColumnIndex) ||
    !Number.isFinite(toColumnIndex) ||
    fromColumnIndex < 0 ||
    toColumnIndex < 0 ||
    fromColumnIndex === toColumnIndex
  ) {
    return "none";
  }
  const stopId = String(opts?.stopColumnId || "").trim();
  const fromId = String(opts?.fromColumnId || "").trim();
  const toId = String(opts?.toColumnId || "").trim();
  if (stopId && fromId && toId) {
    if (toId === stopId && fromId !== stopId) {
      if (hasParkedTimer(card) && !hasLiveTimer(card)) return "none";
      return parkLiveTimer(card, nowMs) ? "parked" : "none";
    }
    if (fromId === stopId && toId !== stopId) {
      return restoreParkedTimer(card, nowMs);
    }
    return "none";
  }
  if (toColumnIndex > fromColumnIndex) {
    if (hasParkedTimer(card) && !hasLiveTimer(card)) return "none";
    return parkLiveTimer(card, nowMs) ? "parked" : "none";
  }
  return restoreParkedTimer(card, nowMs);
}
