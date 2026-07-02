import pino from "pino";
import { DailyCrmLogStream } from "@/lib/server/daily-log-stream";

const isDev = process.env.NODE_ENV === "development";
const usePretty =
  isDev &&
  process.stdout.isTTY &&
  process.env.LOG_PRETTY !== "0";

function logFileEnabled(): boolean {
  const raw = (process.env.LOG_FILE_ENABLED ?? "true").trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "no";
}

const redactPaths = {
  paths: [
    "req.headers.authorization",
    "req.headers.cookie",
    "*.password",
    "password",
    "*.token",
    "token",
    "KAITEN_API_TOKEN",
  ],
  remove: true,
};

function buildStreams(): pino.StreamEntry[] {
  const streams: pino.StreamEntry[] = [];

  if (logFileEnabled()) {
    streams.push({
      level: (process.env.LOG_LEVEL ?? (isDev ? "debug" : "info")) as pino.Level,
      stream: new DailyCrmLogStream(),
    });
  }

  if (usePretty) {
    streams.push({
      level: (process.env.LOG_LEVEL ?? "debug") as pino.Level,
      stream: pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          singleLine: true,
          translateTime: "SYS:standard",
        },
      }),
    });
  } else {
    streams.push({
      level: (process.env.LOG_LEVEL ?? (isDev ? "debug" : "info")) as pino.Level,
      stream: process.stdout,
    });
  }

  return streams;
}

/**
 * Централизованный JSON-логгер: stdout (+ pretty в dev) и суточные JSONL-файлы.
 * Чувствительные поля маскируются; не логируйте тело запросов с паролями.
 */
export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
    redact: redactPaths,
  },
  pino.multistream(buildStreams()),
);

/** Критические бизнес-события (создание/изменение сущностей). */
export const auditLogger = logger.child({ channel: "audit" });

/** Подозрительная активность, отказы, rate limit. */
export const securityLogger = logger.child({ channel: "security" });

/** Kaiten REST, синк карточек и комментариев. */
export const kaitenLogger = logger.child({ channel: "kaiten" });

/** Cron и фоновые задачи сервера. */
export const cronLogger = logger.child({ channel: "cron" });

/** Почта: IMAP, sync jobs, правила. */
export const mailLogger = logger.child({ channel: "mail" });

/** HTTP API (длительность, статус). */
export const apiLogger = logger.child({ channel: "api" });

export function isKaitenFetchDebugEnabled(): boolean {
  const raw = (process.env.LOG_KAITEN_DEBUG ?? "0").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
