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
    30_000,
    Number(process.env.KAITEN_CHAT_BACKGROUND_SYNC_INTERVAL_MS || 30_000),
  );
  const limit = Math.max(
    1,
    Math.min(60, Number(process.env.KAITEN_CHAT_BACKGROUND_SYNC_LIMIT || 20)),
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

startMailBackgroundSync();
startKaitenChatBackgroundSync();

require("./.next/standalone/server.js");
