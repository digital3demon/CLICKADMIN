/**
 * Точка входа для production при next.config: output: "standalone".
 * После `next build` обязателен артефакт `.next/standalone/server.js` (проверяется в npm run build).
 *
 * Платформа задаёт PORT — не переопределяем. Альтернатива без этой обёртки:
 * `npm run start:next` (next start) — Next выдаст предупреждение при standalone, но часто работает.
 *
 * В Linux-контейнерах HOSTNAME часто = id контейнера; для bind слушаем 0.0.0.0 (см. ниже).
 */
const crypto = require("node:crypto");

if (process.platform !== "win32") {
  process.env.HOSTNAME = "0.0.0.0";
}

if (!process.env.INTERNAL_MAIL_SYNC_SECRET) {
  process.env.INTERNAL_MAIL_SYNC_SECRET = crypto.randomBytes(32).toString("hex");
}

if (!process.env.INTERNAL_KAITEN_CHAT_SYNC_SECRET) {
  process.env.INTERNAL_KAITEN_CHAT_SYNC_SECRET = crypto.randomBytes(32).toString("hex");
}

if (!process.env.INTERNAL_CRM_BACKUP_SECRET) {
  process.env.INTERNAL_CRM_BACKUP_SECRET = crypto.randomBytes(32).toString("hex");
}
global.__crmDailyBackupStarted = true;

function pruneOldCrmLogFiles() {
  if (
    (process.env.LOG_FILE_ENABLED ?? "true").trim().toLowerCase() === "false" ||
    (process.env.LOG_FILE_ENABLED ?? "true").trim().toLowerCase() === "0"
  ) {
    return;
  }
  const fs = require("node:fs");
  const path = require("node:path");
  const rawDir = (process.env.LOG_DIR || "data/logs").trim();
  const dir = path.isAbsolute(rawDir)
    ? rawDir
    : path.join(process.cwd(), rawDir);
  if (!fs.existsSync(dir)) return;
  const retentionRaw = Number(process.env.LOG_RETENTION_DAYS || 30);
  const retentionDays =
    Number.isFinite(retentionRaw) && retentionRaw >= 1
      ? Math.min(retentionRaw, 365)
      : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const pad = (n) => String(n).padStart(2, "0");
  const cutoffKey = `${cutoff.getFullYear()}-${pad(cutoff.getMonth() + 1)}-${pad(cutoff.getDate())}`;
  const re = /^crm-(\d{4}-\d{2}-\d{2})\.log$/;
  for (const name of fs.readdirSync(dir)) {
    const m = re.exec(name);
    if (!m?.[1] || m[1] >= cutoffKey) continue;
    try {
      fs.unlinkSync(path.join(dir, name));
    } catch {
      /* ignore */
    }
  }
}

pruneOldCrmLogFiles();

function startMailBackgroundSync() {
  if ((process.env.MAIL_BACKGROUND_SYNC ?? "true").trim().toLowerCase() === "false") {
    return;
  }
  const intervalMs = Math.max(
    45_000,
    Number(process.env.MAIL_BACKGROUND_SYNC_INTERVAL_MS || 60_000),
  );
  const limit = Math.max(
    1,
    Math.min(100, Number(process.env.MAIL_BACKGROUND_SYNC_LIMIT || 50)),
  );
  const concurrency = Math.max(
    1,
    Math.min(4, Number(process.env.MAIL_BACKGROUND_SYNC_CONCURRENCY || 1)),
  );
  const port = process.env.PORT || "3000";
  const url = `http://127.0.0.1:${port}/api/cron/mail-sync?limit=${limit}&concurrency=${concurrency}`;
  let inFlight = false;
  const run = () => {
    if (inFlight) {
      console.warn("[cron] mail-sync skipped: previous run still in flight");
      return;
    }
    inFlight = true;
    const timeoutMs = Math.max(15_000, Math.min(120_000, intervalMs - 5_000));
    fetch(url, {
      headers: {
        "x-internal-mail-sync-secret": process.env.INTERNAL_MAIL_SYNC_SECRET,
      },
      signal: AbortSignal.timeout(timeoutMs),
    })
      .then(async (res) => {
        if (!res.ok) {
          console.error(
            `[cron] mail-sync failed: ${res.status} ${res.statusText}`,
            await res.text().catch(() => ""),
          );
        }
      })
      .catch((err) => {
        console.error("[cron] mail-sync network error:", err?.message);
      })
      .finally(() => {
        inFlight = false;
      });
  };
  setTimeout(run, 20_000);
  setInterval(run, intervalMs);
}

function startKaitenChatBackgroundSync() {
  if (
    (process.env.KAITEN_CHAT_BACKGROUND_SYNC ?? "true").trim().toLowerCase() ===
    "false"
  ) {
    return;
  }
  const intervalMs = Math.max(
    20_000,
    Number(process.env.KAITEN_CHAT_BACKGROUND_SYNC_INTERVAL_MS || 20_000),
  );
  const limit = Math.max(
    1,
    Math.min(120, Number(process.env.KAITEN_CHAT_BACKGROUND_SYNC_LIMIT || 60)),
  );
  const port = process.env.PORT || "3000";
  const url = `http://127.0.0.1:${port}/api/cron/kaiten-chat-sync?limit=${limit}`;
  let inFlight = false;
  const run = () => {
    if (inFlight) {
      console.warn("[cron] kaiten-chat-sync skipped: previous run still in flight");
      return;
    }
    inFlight = true;
    const timeoutMs = Math.max(15_000, Math.min(180_000, intervalMs - 5_000));
    fetch(url, {
      headers: {
        "x-internal-kaiten-chat-sync-secret":
          process.env.INTERNAL_KAITEN_CHAT_SYNC_SECRET,
      },
      signal: AbortSignal.timeout(timeoutMs),
    })
      .then(async (res) => {
        if (!res.ok) {
          console.error(
            `[cron] kaiten-chat-sync failed: ${res.status} ${res.statusText}`,
            await res.text().catch(() => ""),
          );
        }
      })
      .catch((err) => {
        console.error("[cron] kaiten-chat-sync network error:", err?.message);
      })
      .finally(() => {
        inFlight = false;
      });
  };
  setTimeout(run, 10_000);
  setInterval(run, intervalMs);
}

function msUntilNextMskMidnight() {
  const now = Date.now();
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
  const todayStart = Date.parse(`${ymd}T00:00:00+03:00`);
  if (Number.isFinite(todayStart) && now < todayStart) {
    return Math.max(1000, todayStart - now);
  }
  const parts = ymd.split("-").map((x) => Number(x));
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  const next = new Date(Date.UTC(y, m - 1, d));
  next.setUTCDate(next.getUTCDate() + 1);
  const ny = next.getUTCFullYear();
  const nm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(next.getUTCDate()).padStart(2, "0");
  const nextStart = Date.parse(`${ny}-${nm}-${nd}T00:00:00+03:00`);
  return Math.max(1000, (Number.isFinite(nextStart) ? nextStart : now + 60_000) - now);
}

function startCrmDailyBackup() {
  const off = String(process.env.CRM_BACKUP_DISABLE || "")
    .trim()
    .toLowerCase();
  if (off === "1" || off === "true" || off === "yes") {
    return;
  }
  const port = process.env.PORT || "3000";
  const url = `http://127.0.0.1:${port}/api/cron/crm-backup`;
  const run = () => {
    fetch(url, {
      headers: {
        "x-internal-crm-backup-secret": process.env.INTERNAL_CRM_BACKUP_SECRET,
      },
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
      .catch((err) => {
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

startMailBackgroundSync();
startKaitenChatBackgroundSync();
startCrmDailyBackup();

require("./.next/standalone/server.js");
