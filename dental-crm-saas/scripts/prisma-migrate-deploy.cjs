/**
 * `prisma migrate deploy` для SQLite: при занятой dev.db advisory-lock схемы часто даёт
 * «database is locked». См. PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK в документации Prisma.
 * Отключить только для этого запуска: не задавайте переменную или оставьте по умолчанию.
 * Принудительно включить advisory lock: `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=0 node ...`
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const cwd = path.join(__dirname, "..");

if (process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK !== "0") {
  process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = "1";
}

const isWin = process.platform === "win32";
const r = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  cwd,
  stdio: "inherit",
  env: process.env,
  shell: isWin,
});

if (r.status !== 0) {
  process.exit(r.status === null ? 1 : r.status);
}

const gen = spawnSync("npx", ["prisma", "generate"], {
  cwd,
  stdio: "inherit",
  env: process.env,
  shell: isWin,
});

process.exit(gen.status === null ? 1 : gen.status);
