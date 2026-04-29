/**
 * Поля Doctor.isIpEntrepreneur и Doctor.orderPriceListKind — sqlite ALTER без IF NOT EXISTS.
 * Колонки могли появиться через db push / частичный прогон миграции — дубликаты игнорируются.
 *
 * Запуск вручную: node --env-file=.env scripts/ensure-doctor-extra-columns-sqlite.cjs
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
    if (/no such table/i.test(msg)) {
      console.log("Пропуск (нет таблицы):", label);
      return;
    }
    if (/duplicate column name/i.test(msg)) {
      console.log("Уже есть:", label);
      return;
    }
    console.error("Ошибка:", label, msg);
    throw e;
  }
}

async function main() {
  if (!isSqliteFileUrl()) {
    console.log("ensure-doctor-extra-columns-sqlite: skip (DATABASE_URL не file:… SQLite)");
    return;
  }

  await trySql(
    "Doctor.isIpEntrepreneur",
    `ALTER TABLE "Doctor" ADD COLUMN "isIpEntrepreneur" BOOLEAN NOT NULL DEFAULT false`,
  );
  await trySql(
    "Doctor.orderPriceListKind",
    `ALTER TABLE "Doctor" ADD COLUMN "orderPriceListKind" TEXT`,
  );
}

main()
  .catch(() => process.exit(1))
  .finally(() => prisma.$disconnect());
