import "server-only";

import type { PrismaClient } from "@prisma/client";
import { DEMO_PG_SCHEMA } from "@/lib/prisma-demo";

const checked = new WeakMap<PrismaClient, true>();

/**
 * Doctor/Clinic.analyticsTreatAsExisting — SQLite без migrate и демо-Postgres
 * после старого db push.
 */
export async function ensureAnalyticsTreatAsExistingColumn(
  prisma: PrismaClient,
): Promise<void> {
  if (checked.has(prisma)) return;

  let sqlite = false;
  try {
    await prisma.$queryRawUnsafe("SELECT sqlite_version()");
    sqlite = true;
  } catch {
    sqlite = false;
  }

  if (sqlite) {
    await addSqliteCol(prisma, "Doctor");
    await addSqliteCol(prisma, "Clinic");
  } else {
    await addPostgresCol(prisma, "Doctor");
    await addPostgresCol(prisma, "Clinic");
  }

  checked.set(prisma, true);
}

async function addSqliteCol(prisma: PrismaClient, table: string): Promise<void> {
  const cols = (await prisma.$queryRawUnsafe(
    `PRAGMA table_info("${table}")`,
  )) as Array<{ name?: string }>;
  const has =
    Array.isArray(cols) &&
    cols.some((c) => c?.name === "analyticsTreatAsExisting");
  if (has) return;
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${table}" ADD COLUMN "analyticsTreatAsExisting" INTEGER NOT NULL DEFAULT 0`,
    );
  } catch (e) {
    const msg = String(e).toLowerCase();
    if (!msg.includes("duplicate column")) throw e;
  }
}

async function addPostgresCol(
  prisma: PrismaClient,
  table: string,
): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = ${table}
      AND table_schema IN (current_schema(), ${DEMO_PG_SCHEMA})
  `;
  if (rows.some((r) => r.column_name === "analyticsTreatAsExisting")) return;
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "analyticsTreatAsExisting" BOOLEAN NOT NULL DEFAULT false`,
    );
  } catch (e) {
    const msg = String(e).toLowerCase();
    if (!msg.includes("already exists") && !msg.includes("duplicate")) throw e;
  }
}
