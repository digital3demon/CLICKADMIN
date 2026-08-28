import { msUntilNextMskMidnight } from "@/lib/crm-backup/next-midnight-msk";

const FLAG = "__kanbanDeadlineReminderStarted";
/** 08:00 Europe/Moscow. */
const MSK_REMIND_HOUR = 8;

function msUntilNextMskRemindHour(nowMs = Date.now()): number {
  const toMidnight = msUntilNextMskMidnight(nowMs);
  const nextMidnight = nowMs + toMidnight;
  const todayRemind = nextMidnight - 24 * 60 * 60 * 1000 + MSK_REMIND_HOUR * 60 * 60 * 1000;
  if (nowMs < todayRemind) return Math.max(5_000, todayRemind - nowMs);
  return Math.max(5_000, nextMidnight + MSK_REMIND_HOUR * 60 * 60 * 1000 - nowMs);
}

async function fireReminders(reason: string): Promise<void> {
  try {
    const { runKanbanDeadlineReminders } = await import(
      "@/lib/kanban-deadline-reminder.server"
    );
    const result = await runKanbanDeadlineReminders();
    console.log("[cron] kanban-deadline-reminders", reason, result);
  } catch (e) {
    console.error("[cron] kanban-deadline-reminders", reason, e);
  }
}

/** Один таймер на процесс (standalone без Vercel cron). */
export function startKanbanDeadlineReminderInProcess(): void {
  const g = globalThis as typeof globalThis & { [FLAG]?: boolean };
  if (g[FLAG]) return;
  g[FLAG] = true;

  const scheduleNext = () => {
    const wait = msUntilNextMskRemindHour();
    console.log(
      `[cron] kanban-deadline-reminders in ${Math.round(wait / 1000)}s (08:00 Europe/Moscow)`,
    );
    setTimeout(() => {
      void fireReminders("scheduled-msk-08").finally(scheduleNext);
    }, wait);
  };

  scheduleNext();
  const mskHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Moscow",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
  if (mskHour >= MSK_REMIND_HOUR) {
    setTimeout(() => {
      void fireReminders("catch-up-after-start");
    }, 12_000);
  }
}
