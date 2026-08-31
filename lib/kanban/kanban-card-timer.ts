/** Для отображения: при заморозке считаем время «на момент freeze», иначе текущее. */
export function kanbanCardTimerDisplayNowMs(
  timerFrozenAt: string | null | undefined,
  nowMs: number,
): number {
  if (!timerFrozenAt) return nowMs;
  const t = Date.parse(timerFrozenAt);
  if (!Number.isFinite(t)) return nowMs;
  return t;
}

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

/** Таймер запущен и остаток 0 (в т.ч. на момент freeze). */
export function isKanbanCardTimerExpired(
  card: {
    timerStartedAt?: string | null;
    timerDurationMs?: number | null;
    timerFrozenAt?: string | null;
  },
  nowMs: number,
): boolean {
  if (!card.timerStartedAt || card.timerDurationMs == null || card.timerDurationMs <= 0) {
    return false;
  }
  const displayNow = kanbanCardTimerDisplayNowMs(card.timerFrozenAt, nowMs);
  return kanbanCardTimerRemainingMs(card.timerStartedAt, card.timerDurationMs, displayNow) === 0;
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

/** Сплошной цвет полосы: первые 1/3 интервала — зелёный, до 2/3 — жёлтый, далее — красный. */
export function kanbanCardTimerTrackFillColor(elapsedRatio: number): string {
  const r = Math.min(1, Math.max(0, elapsedRatio));
  if (r < 1 / 3) return "rgb(34 197 94)";
  if (r < 2 / 3) return "rgb(234 179 8)";
  return "rgb(239 68 68)";
}
