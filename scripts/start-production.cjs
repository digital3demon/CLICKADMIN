/**
 * Старт на PaaS (Timeweb App Platform и т.п.): migrate/deploy-хуки, затем server.js.
 * Сборку делайте через `npm run build:platform` — без migrate/IMAP на этапе build.
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const migrateScript = path.join(root, "scripts", "prisma-migrate-deploy.cjs");

function isTruthyFlag(v) {
  const s = String(v || "").trim().toLowerCase();
  return s === "1" || s === "true";
}

if (
  process.env.NODE_ENV === "production" &&
  (isTruthyFlag(process.env.NEXT_PUBLIC_CRM_SINGLE_USER) ||
    isTruthyFlag(process.env.CRM_SINGLE_USER))
) {
  console.error(
    "[start-production] CRM_SINGLE_USER / NEXT_PUBLIC_CRM_SINGLE_USER нельзя на production-сервере",
  );
  process.exit(1);
}

if (String(process.env.DATABASE_URL || "").trim()) {
  if (!fs.existsSync(migrateScript)) {
    console.error("[start-production] Нет scripts/prisma-migrate-deploy.cjs");
    process.exit(1);
  }
  console.log("[start-production] prisma migrate deploy + post-deploy hooks…");
  const migrate = spawnSync(process.execPath, [migrateScript], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (migrate.status !== 0) {
    process.exit(migrate.status === null ? 1 : migrate.status);
  }
} else {
  console.warn(
    "[start-production] DATABASE_URL не задан — пропуск migrate (только для отладки).",
  );
}

require(path.join(root, "server.js"));
