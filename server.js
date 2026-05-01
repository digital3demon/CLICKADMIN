/**
 * Точка входа для PaaS (панель «Express», Docker и т.п.): платформа задаёт PORT.
 * Next.js standalone уже читает process.env.PORT — его не переопределяем.
 *
 * В Linux-контейнерах системный HOSTNAME часто равен id контейнера; Next использует
 * его для bind — тогда healthcheck/nginx снаружи может не попасть на процесс.
 * На Windows при локальном npm run start HOSTNAME обычно имя ПК — не трогаем.
 */
if (process.platform !== "win32") {
  process.env.HOSTNAME = "0.0.0.0";
}

require("./.next/standalone/server.js");
