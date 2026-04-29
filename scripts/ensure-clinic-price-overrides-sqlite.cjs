/**
 * Доводит SQLite под актуальную схему вкладки «Клиенты → Прайс».
 * Нужен, когда БД старая/дрейфовая и migrate deploy не создал часть объектов.
 *
 * Добавляет:
 * - Clinic.sourceDoctorId + уникальный индекс
 * - таблицу ClinicPriceOverride + индекс по priceListItemId
 *
 * Запуск вручную:
 *   node --env-file=.env scripts/ensure-clinic-price-overrides-sqlite.cjs
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
    if (/duplicate column name/i.test(msg)) {
      console.log("Уже есть:", label);
      return;
    }
    if (/already exists/i.test(msg) && /index|table/i.test(msg)) {
      console.log("Уже есть:", label);
      return;
    }
    console.error("Ошибка:", label, msg);
    throw e;
  }
}

async function main() {
  if (!isSqliteFileUrl()) {
    console.log("ensure-clinic-price-overrides-sqlite: skip (DATABASE_URL не file:… SQLite)");
    return;
  }

  await trySql(
    "Clinic.sourceDoctorId",
    `ALTER TABLE "Clinic" ADD COLUMN "sourceDoctorId" TEXT`,
  );
  await trySql(
    "Clinic_sourceDoctorId_key",
    `CREATE UNIQUE INDEX IF NOT EXISTS "Clinic_sourceDoctorId_key" ON "Clinic"("sourceDoctorId")`,
  );

  await trySql(
    "table ClinicPriceOverride",
    `CREATE TABLE IF NOT EXISTS "ClinicPriceOverride" (
      "clinicId" TEXT NOT NULL,
      "priceListItemId" TEXT NOT NULL,
      "priceRub" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ClinicPriceOverride_clinicId_fkey"
        FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ClinicPriceOverride_priceListItemId_fkey"
        FOREIGN KEY ("priceListItemId") REFERENCES "PriceListItem" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ClinicPriceOverride_pkey"
        PRIMARY KEY ("clinicId", "priceListItemId")
    )`,
  );
  await trySql(
    "ClinicPriceOverride_priceListItemId_idx",
    `CREATE INDEX IF NOT EXISTS "ClinicPriceOverride_priceListItemId_idx"
      ON "ClinicPriceOverride"("priceListItemId")`,
  );
}

main()
  .catch(() => process.exit(1))
  .finally(() => prisma.$disconnect());

