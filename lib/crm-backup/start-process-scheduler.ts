import { randomBytes } from "node:crypto";
import { msUntilNextMskMidnight } from "@/lib/crm-backup/next-midnight-msk";
import { isCrmBackupDisabled } from "@/lib/crm-backup/types";

const FLAG = "__crmDailyBackupStarted";

function ensureInternalSecret(): string {
  const existing = String(process.env.INTERNAL_CRM_BACKUP_SECRET || "").trim();
  if (existing) return existing;
  const generated = randomBytes(32).toString("hex");
  process.env.INTERNAL_CRM_BACKUP_SECRET = generated;
  return generated;
}

/** Один таймер на процесс: wrapper server.js или Next instrumentation. */
export function startCrmDailyBackupInProcess(): void {
  const g = globalThis as typeof globalThis & { [FLAG]?: boolean };
  if (g[FLAG]) return;
  g[FLAG] = true;

  if (isCrmBackupDisabled()) return;

  const secret = ensureInternalSecret();
  const port = process.env.PORT || "3000";
  const url = `http://127.0.0.1:${port}/api/cron/crm-backup`;

  const run = () => {
    fetch(url, {
      headers: { "x-internal-crm-backup-secret": secret },
      signal: AbortSignal.timeout(10 * 60 * 1000),
    })
      .then(async (res) => {
        if (!res.ok) {
          console.error(
            `[cron] crm-backup failed: ${res.status} ${res.statusText}`,
            await res.text().catch(() => ""),
          );
        } else {
          console.log("[cron] crm-backup ok", await res.text().catch(() => ""));
        }
      })
      .catch((err: { message?: string }) => {
        console.error("[cron] crm-backup network error:", err?.message);
      })
      .finally(() => {
        setTimeout(run, msUntilNextMskMidnight());
      });
  };

  const wait = msUntilNextMskMidnight();
  console.log(
    `[cron] crm-backup scheduled in ${Math.round(wait / 1000)}s (00:00 Europe/Moscow)`,
  );
  setTimeout(run, wait);
}
