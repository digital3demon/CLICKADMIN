/**
 * Перед `migrate deploy`: снимает P3009 для миграции 20260708150000_order_admin_shipped_at.
 * Типичная причина — SQLite-версия SQL (DATETIME, adminShippedOtpr = 1) на PostgreSQL.
 *
 * Отключить: PRISMA_SKIP_STUCK_MIGRATION_FIX=1
 * Только PostgreSQL — иначе exit 0.
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const MIGRATION = "20260708150000_order_admin_shipped_at";

const hereDir = __dirname;
const bundleRoot =
  path.basename(hereDir) === "scripts"
    ? path.join(hereDir, "..")
    : hereDir;

const isWin = process.platform === "win32";

function resolvePrismaVersion() {
  const vf = path.join(bundleRoot, ".prisma-cli-version");
  try {
    const v = fs.readFileSync(vf, "utf8").trim();
    if (v) return v;
  } catch {
    /* fall through */
  }
  try {
    const lock = require(path.join(bundleRoot, "package-lock.json"));
    const v = lock.packages?.["node_modules/prisma"]?.version;
    if (v && String(v).trim()) return String(v).trim();
  } catch {
    /* fall through */
  }
  return "6.19.3";
}

const prismaSpec = `prisma@${resolvePrismaVersion()}`;

function isPostgresUrl() {
  const u = String(process.env.DATABASE_URL || "").trim().toLowerCase();
  return u.startsWith("postgresql://") || u.startsWith("postgres://");
}

function isSqliteUrl() {
  const u = String(process.env.DATABASE_URL || "").trim().toLowerCase();
  return u.startsWith("file:");
}

function runMigrateResolve(flag, name) {
  return spawnSync(
    "npx",
    [
      "-y",
      prismaSpec,
      "migrate",
      "resolve",
      flag,
      name,
      "--schema=prisma/schema.prisma",
    ],
    {
      cwd: bundleRoot,
      stdio: "inherit",
      env: process.env,
      shell: isWin,
    },
  );
}

function asBool(v) {
  return v === true || v === 1 || v === "t" || v === "true" || v === "1";
}

(async () => {
  if (String(process.env.PRISMA_SKIP_STUCK_MIGRATION_FIX || "").trim() === "1") {
    console.log(
      "[prisma-resolve-stuck-admin-shipped-at] PRISMA_SKIP_STUCK_MIGRATION_FIX=1 — пропуск.",
    );
    process.exit(0);
  }
  if (isSqliteUrl() || !isPostgresUrl()) {
    process.exit(0);
  }

  let PrismaClient;
  try {
    ({ PrismaClient } = require("@prisma/client"));
  } catch (e) {
    console.warn(
      "[prisma-resolve-stuck-admin-shipped-at] нет @prisma/client — пропуск:",
      e instanceof Error ? e.message : e,
    );
    process.exit(0);
  }

  const prisma = new PrismaClient();
  let stuck = false;
  let hasCol = false;
  try {
    const safeName = MIGRATION.replace(/'/g, "''");
    const rows = await prisma.$queryRawUnsafe(
      `SELECT
        EXISTS (
          SELECT 1 FROM "_prisma_migrations" m
          WHERE m.migration_name = '${safeName}'
            AND m.finished_at IS NULL
            AND m.rolled_back_at IS NULL
        ) AS stuck,
        EXISTS (
          SELECT 1 FROM information_schema.columns c
          WHERE c.table_schema = current_schema()
            AND c.table_name = 'Order'
            AND c.column_name = 'adminShippedAt'
        ) AS has_col`,
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    if (row && typeof row === "object") {
      stuck = asBool(row.stuck);
      hasCol = asBool(row.has_col);
    }
  } catch (e) {
    console.warn(
      "[prisma-resolve-stuck-admin-shipped-at] запрос к БД не выполнен — пропуск:",
      e instanceof Error ? e.message : e,
    );
    await prisma.$disconnect().catch(() => {});
    process.exit(0);
  }

  if (!stuck) {
    await prisma.$disconnect().catch(() => {});
    process.exit(0);
  }

  console.warn(
    `[prisma-resolve-stuck-admin-shipped-at] незавершённая миграция ${MIGRATION} (hasCol=${hasCol}) — migrate resolve.`,
  );
  const flag = hasCol ? "--applied" : "--rolled-back";
  const r = runMigrateResolve(flag, MIGRATION);
  const code = r.status === null ? 1 : r.status;
  if (code !== 0) {
    console.error(
      `[prisma-resolve-stuck-admin-shipped-at] migrate resolve ${flag} завершился с кодом ${code}`,
    );
    await prisma.$disconnect().catch(() => {});
    process.exit(code);
  }
  console.warn(`[prisma-resolve-stuck-admin-shipped-at] migrate resolve ${flag}: OK`);

  if (hasCol) {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "Order"
         SET "adminShippedAt" = "updatedAt"
         WHERE "adminShippedOtpr" = true AND "adminShippedAt" IS NULL`,
      );
      console.warn(
        "[prisma-resolve-stuck-admin-shipped-at] backfill adminShippedAt: OK",
      );
    } catch (e) {
      console.warn(
        "[prisma-resolve-stuck-admin-shipped-at] backfill adminShippedAt пропущен:",
        e instanceof Error ? e.message : e,
      );
    }
  }

  await prisma.$disconnect().catch(() => {});
  process.exit(0);
})().catch((e) => {
  console.error("[prisma-resolve-stuck-admin-shipped-at]", e);
  process.exit(1);
});
