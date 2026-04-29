/**
 * Доводит SQLite под RBAC по модулям: таблица RoleModuleAccess + индексы.
 * Нужен для старых БД, где схема обновилась, а миграции/таблица отсутствуют.
 *
 * Запуск вручную:
 *   node --env-file=.env scripts/ensure-role-module-access-sqlite.cjs
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function isSqliteFileUrl() {
  const u = String(process.env.DATABASE_URL ?? "").trim();
  return /^file:/i.test(u);
}

async function trySql(label, sql) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log("OK:", label);
  } catch (e) {
    const msg = String(e?.message ?? e);
    if (/already exists/i.test(msg) && /table|index/i.test(msg)) {
      console.log("Уже есть:", label);
      return;
    }
    console.error("Ошибка:", label, msg);
    throw e;
  }
}

async function main() {
  if (!isSqliteFileUrl()) {
    console.log("ensure-role-module-access-sqlite: skip (DATABASE_URL не file:… SQLite)");
    return;
  }

  await trySql(
    "table RoleModuleAccess",
    `CREATE TABLE IF NOT EXISTS "RoleModuleAccess" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tenantId" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "module" TEXT NOT NULL,
      "allowed" BOOLEAN NOT NULL,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "RoleModuleAccess_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )`,
  );

  await trySql(
    "RoleModuleAccess_tenantId_role_module_key",
    `CREATE UNIQUE INDEX IF NOT EXISTS "RoleModuleAccess_tenantId_role_module_key"
      ON "RoleModuleAccess"("tenantId", "role", "module")`,
  );
  await trySql(
    "RoleModuleAccess_tenantId_role_idx",
    `CREATE INDEX IF NOT EXISTS "RoleModuleAccess_tenantId_role_idx"
      ON "RoleModuleAccess"("tenantId", "role")`,
  );
}

main()
  .catch(() => process.exit(1))
  .finally(() => prisma.$disconnect());

