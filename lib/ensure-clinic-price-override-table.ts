import "server-only";

import type { PrismaClient } from "@prisma/client";

const checked = new WeakMap<PrismaClient, true>();

/**
 * Создаёт таблицу ClinicPriceOverride в SQLite, если миграция не была применена.
 * Это позволяет использовать вкладку «Прайс» даже на старой локальной БД.
 */
export async function ensureClinicPriceOverrideTable(
  prisma: PrismaClient,
): Promise<void> {
  if (checked.has(prisma)) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ClinicPriceOverride" (
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
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ClinicPriceOverride_priceListItemId_idx"
      ON "ClinicPriceOverride"("priceListItemId")
  `);

  checked.set(prisma, true);
}
