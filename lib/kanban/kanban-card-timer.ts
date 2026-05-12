/** Доля прошедшего времени от старта таймера [0, 1]. */
export function kanbanCardTimerElapsedRatio(
  timerStartedAt: string | null | undefined,
  timerDurationMs: number | null | undefined,
  nowMs: number,
): number {
  if (
    !timerStartedAt ||
    timerDurationMs == null ||
    !Number.isFinite(timerDurationMs) ||
    timerDurationMs <= 0
  ) {
    return 0;
  }
  const start = Date.parse(timerStartedAt);
  if (!Number.isFinite(start)) return 0;
  const elapsed = nowMs - start;
  if (elapsed <= 0) return 0;
  return Math.min(1, elapsed / timerDurationMs);
}

/** Оставшееся время в мс (0 если истёк или нет таймера). */
export function kanbanCardTimerRemainingMs(
  timerStartedAt: string | null | undefined,
  timerDurationMs: number | null | undefined,
  nowMs: number,
): number {
  if (
    !timerStartedAt ||
    timerDurationMs == null ||
    !Number.isFinite(timerDurationMs) ||
    timerDurationMs <= 0
  ) {
    return 0;
  }
  const start = Date.parse(timerStartedAt);
  if (!Number.isFinite(start)) return 0;
  const end = start + timerDurationMs;
  const left = end - nowMs;
  return left > 0 ? left : 0;
}

export function formatKanbanTimerCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return "00:00";
  const totalSec = Math.floor(remainingMs / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) {
    return `${d}д ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** CSS linear-gradient для полосы (зелёный → жёлтый → красный). */
export const KANBAN_TIMER_TRACK_GRADIENT =
  "linear-gradient(90deg, rgb(34 197 94), rgb(234 179 8), rgb(239 68 68))";
