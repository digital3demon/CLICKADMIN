/**
 * Добавляет tenantId и индексы из миграции 20260621100000, если их ещё нет (SQLite).
 * Нужен после `prisma migrate deploy`, т.к. при drift/db push колонки уже есть и ALTER в SQL падает.
 *
 * Запуск вручную: node --env-file=.env scripts/ensure-tenant-columns-sqlite.cjs
 */
const { PrismaClient } = require("@prisma/client");

const DEFAULT_TENANT_ID = "cltenantdefault0000000000";

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
    if (/no such table/i.test(msg)) {
      console.log("Пропуск (нет таблицы):", label);
      return;
    }
    if (/duplicate column name/i.test(msg)) {
      console.log("Уже есть:", label);
      return;
    }
    if (/already exists/i.test(msg) && /index/i.test(msg)) {
      console.log("Индекс уже есть:", label);
      return;
    }
    console.error("Ошибка:", label, msg);
    throw e;
  }
}

async function main() {
  if (!isSqliteFileUrl()) {
    console.log("ensure-tenant-columns-sqlite: skip (DATABASE_URL не file:… SQLite)");
    return;
  }

  const d = DEFAULT_TENANT_ID.replace(/'/g, "''");

  await trySql(
    "User.tenantId",
    `ALTER TABLE "User" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '${d}'`,
  );
  await trySql(
    "User_tenantId_email_key",
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_tenantId_email_key" ON "User"("tenantId", "email")`,
  );
  await trySql(
    "User_tenantId_idx",
    `CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId")`,
  );

  await trySql(
    "Clinic.tenantId",
    `ALTER TABLE "Clinic" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '${d}'`,
  );
  await trySql(
    "Clinic_tenantId_idx",
    `CREATE INDEX IF NOT EXISTS "Clinic_tenantId_idx" ON "Clinic"("tenantId")`,
  );

  await trySql(
    "Doctor.tenantId",
    `ALTER TABLE "Doctor" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '${d}'`,
  );
  await trySql(
    "Doctor_tenantId_idx",
    `CREATE INDEX IF NOT EXISTS "Doctor_tenantId_idx" ON "Doctor"("tenantId")`,
  );

  await trySql(
    "Courier.tenantId",
    `ALTER TABLE "Courier" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '${d}'`,
  );
  await trySql(
    "Courier_tenantId_isActive_sortOrder_idx",
    `CREATE INDEX IF NOT EXISTS "Courier_tenantId_isActive_sortOrder_idx" ON "Courier"("tenantId", "isActive", "sortOrder")`,
  );

  await trySql(
    "KaitenCardType.tenantId",
    `ALTER TABLE "KaitenCardType" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '${d}'`,
  );
  await trySql(
    "KaitenCardType_tenantId_isActive_sortOrder_idx",
    `CREATE INDEX IF NOT EXISTS "KaitenCardType_tenantId_isActive_sortOrder_idx" ON "KaitenCardType"("tenantId", "isActive", "sortOrder")`,
  );

  await trySql(
    "Order.tenantId",
    `ALTER TABLE "Order" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '${d}'`,
  );
  await trySql(
    "Order_tenantId_orderNumber_key",
    `CREATE UNIQUE INDEX IF NOT EXISTS "Order_tenantId_orderNumber_key" ON "Order"("tenantId", "orderNumber")`,
  );
  await trySql(
    "Order_tenantId_idx",
    `CREATE INDEX IF NOT EXISTS "Order_tenantId_idx" ON "Order"("tenantId")`,
  );
}

main()
  .catch(() => process.exit(1))
  .finally(() => prisma.$disconnect());
