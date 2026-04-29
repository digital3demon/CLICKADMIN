import "server-only";

import type { PrismaClient } from "@prisma/client";

const checked = new WeakMap<PrismaClient, true>();

/**
 * Добавляет колонку Clinic.sourceDoctorId и уникальный индекс, если их ещё нет в SQLite.
 * Нужен для локальных/переиспользованных БД, где schema уже обновлена, а миграция не применена.
 */
export async function ensureClinicSourceDoctorColumn(
  prisma: PrismaClient,
): Promise<void> {
  if (checked.has(prisma)) return;

  const cols = (await prisma.$queryRawUnsafe(
    `PRAGMA table_info("Clinic")`,
  )) as Array<{ name?: string }>;
  const hasCol = Array.isArray(cols) && cols.some((c) => c?.name === "sourceDoctorId");

  if (!hasCol) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Clinic" ADD COLUMN "sourceDoctorId" TEXT`,
      );
    } catch (e) {
      const msg = String(e).toLowerCase();
      if (!msg.includes("duplicate column")) throw e;
    }
  }

  try {
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "Clinic_sourceDoctorId_key" ON "Clinic"("sourceDoctorId")`,
    );
  } catch (e) {
    const msg = String(e).toLowerCase();
    if (!msg.includes("already exists")) throw e;
  }

  checked.set(prisma, true);
}
