/**
 * Точка входа для production при next.config: output: "standalone".
 * После `next build` обязателен артефакт `.next/standalone/server.js` (проверяется в npm run build).
 *
 * Платформа задаёт PORT — не переопределяем. Альтернатива без этой обёртки:
 * `npm run start:next` (next start) — Next выдаст предупреждение при standalone, но часто работает.
 *
 * В Linux-контейнерах HOSTNAME часто = id контейнера; для bind слушаем 0.0.0.0 (см. ниже).
 */
if (process.platform !== "win32") {
  process.env.HOSTNAME = "0.0.0.0";
}

require("./.next/standalone/server.js");
