"use client";

import { useEffect, useRef } from "react";

export type VisibleIntervalPollTask = {
  id: string;
  intervalMs: number;
  enabled?: boolean;
  run: () => void | Promise<void>;
};

const TICK_MS = 1000;

/** Один visibility-aware тикер вместо нескольких setInterval на вкладке канбана. */
export function useVisibleIntervalPolls(tasks: VisibleIntervalPollTask[]): void {
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  useEffect(() => {
    const lastRun = new Map<string, number>();
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      for (const task of tasksRef.current) {
        if (task.enabled === false) continue;
        const prev = lastRun.get(task.id) ?? 0;
        if (now - prev < task.intervalMs) continue;
        lastRun.set(task.id, now);
        void task.run();
      }
    };
    tick();
    const intervalId = window.setInterval(tick, TICK_MS);
    const onVisibleOrFocus = () => tick();
    document.addEventListener("visibilitychange", onVisibleOrFocus);
    window.addEventListener("focus", onVisibleOrFocus);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibleOrFocus);
      window.removeEventListener("focus", onVisibleOrFocus);
    };
  }, []);
}
