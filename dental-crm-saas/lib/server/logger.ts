import pino from "pino";

const isDev = process.env.NODE_ENV === "development";
const usePretty =
  isDev &&
  process.stdout.isTTY &&
  process.env.LOG_PRETTY !== "0";

/**
 * Централизованный JSON-логгер (stdout). В dev при TTY — pino-pretty.
 * Чувствительные поля маскируются; не логируйте тело запросов с паролями.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  redact: {
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
  },
  ...(usePretty
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, singleLine: true, translateTime: "SYS:standard" },
        },
      }
    : {}),
});

/** Критические бизнес-события (создание/изменение сущностей). */
export const auditLogger = logger.child({ channel: "audit" });

/** Подозрительная активность, отказы, rate limit. */
export const securityLogger = logger.child({ channel: "security" });
