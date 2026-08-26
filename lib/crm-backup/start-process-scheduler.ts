import {
  isWithinCrmBackupCatchUpWindow,
  msUntilNextMskMidnight,
} from "@/lib/crm-backup/next-midnight-msk";
import { isCrmBackupDisabled } from "@/lib/crm-backup/types";
import { formatYmdInMsk } from "@/lib/msk-calendar";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-constants";

const FLAG = "__crmDailyBackupStarted";

async function fireScheduledBackup(reason: string): Promise<void> {
  try {
    const { runScheduledCrmBackup } = await import(
      "@/lib/crm-backup/run-auto-backup"
    );
    const result = await runScheduledCrmBackup();
    console.log("[cron] crm-backup", reason, result);
  } catch (e) {
    console.error("[cron] crm-backup", reason, e);
  }
}

async function maybeCatchUpAfterRestart(): Promise<void> {
  if (!isWithinCrmBackupCatchUpWindow()) return;
  await new Promise((r) => setTimeout(r, 8_000));
  try {
    const { loadCurrentCrmBackupMeta } = await import("@/lib/crm-backup/store");
    const last = await loadCurrentCrmBackupMeta(DEFAULT_TENANT_ID);
    const today = formatYmdInMsk(new Date());
    if (
      last &&
      last.source === "auto" &&
      formatYmdInMsk(new Date(last.createdAt)) === today
    ) {
      console.log("[cron] crm-backup catch-up skipped: auto already today");
      return;
    }
  } catch (e) {
    console.error("[cron] crm-backup catch-up meta", e);
  }
  await fireScheduledBackup("catch-up-after-restart");
}

/** Один таймер на процесс: Next instrumentation. Пишет zip in-process, без HTTP/middleware. */
export function startCrmDailyBackupInProcess(): void {
  const g = globalThis as typeof globalThis & { [FLAG]?: boolean };
  if (g[FLAG]) return;
  g[FLAG] = true;

  if (isCrmBackupDisabled()) return;

  const scheduleNext = () => {
    const wait = msUntilNextMskMidnight();
    console.log(
      `[cron] crm-backup scheduled in ${Math.round(wait / 1000)}s (00:00 Europe/Moscow)`,
    );
    setTimeout(() => {
      void fireScheduledBackup("scheduled-midnight").finally(scheduleNext);
    }, wait);
  };

  scheduleNext();
  void maybeCatchUpAfterRestart();
}
