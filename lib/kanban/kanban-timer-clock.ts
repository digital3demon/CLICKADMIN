/** Один тик/с для всех таймеров канбана — подписка только у карточек с активным таймером. */
let clockNowMs = Date.now();
let clockIntervalId: number | null = null;
const listeners = new Set<() => void>();
let listenerCount = 0;

function tickClock(): void {
  clockNowMs = Date.now();
  for (const listener of listeners) listener();
}

function ensureClockRunning(): void {
  if (clockIntervalId != null || typeof window === "undefined") return;
  clockIntervalId = window.setInterval(tickClock, 1000);
}

function stopClockIfIdle(): void {
  if (listenerCount > 0 || clockIntervalId == null) return;
  window.clearInterval(clockIntervalId);
  clockIntervalId = null;
}

export function getKanbanTimerClockNow(): number {
  return clockNowMs;
}

export function subscribeKanbanTimerClock(onTick: () => void): () => void {
  listeners.add(onTick);
  listenerCount += 1;
  ensureClockRunning();
  return () => {
    listeners.delete(onTick);
    listenerCount -= 1;
    stopClockIfIdle();
  };
}
