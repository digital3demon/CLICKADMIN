"use client";

import { useEffect, useState } from "react";
import {
  getKanbanTimerClockNow,
  subscribeKanbanTimerClock,
} from "@/lib/kanban/kanban-timer-clock";

/** `active=false` — без подписки на тик (карточка не перерисовывается каждую секунду). */
export function useKanbanTimerNow(active: boolean): number {
  const [now, setNow] = useState(() => getKanbanTimerClockNow());
  useEffect(() => {
    if (!active) return;
    setNow(getKanbanTimerClockNow());
    return subscribeKanbanTimerClock(() => setNow(getKanbanTimerClockNow()));
  }, [active]);
  return active ? now : getKanbanTimerClockNow();
}
