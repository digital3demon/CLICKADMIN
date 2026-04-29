/**
 * Точка входа для панели NetAngels (и аналогов): APP_PATH → этот файл, PATH → корень выкладки.
 * Подгружает .env рядом с приложением, если переменные ещё не заданы окружением (панель имеет приоритет).
 * Далее — стандартный Next.js standalone `server.js`.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = __dirname;

function loadDotEnvIfPresent() {
  const p = path.join(root, ".env");
  if (!fs.existsSync(p)) return;
  const text = fs.readFileSync(p, "utf8");
  for (let line of text.split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnvIfPresent();

/**
 * NetAngels: nginx ходит на APP_IP:APP_PORT из панели; Next standalone читает PORT и CRM_BIND_HOST.
 * Без этого Node мог слушать 3000 из .env, а прокси — на другом порту → 502.
 */
const appPort = process.env.APP_PORT?.trim();
if (appPort) {
  process.env.PORT = appPort;
}
const appIp = process.env.APP_IP?.trim();
if (appIp) {
  process.env.CRM_BIND_HOST = appIp;
}

process.chdir(root);
require(path.join(root, "server.js"));
