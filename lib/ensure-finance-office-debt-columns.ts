import "server-only";

import type { PrismaClient } from "@prisma/client";
import { DEMO_PG_SCHEMA } from "@/lib/prisma-demo";

const checked = new WeakMap<PrismaClient, true>();

type ColSpec = { name: string; sqlite: string; postgres: string };

const CLINIC_COLS: ColSpec[] = [
  {
    name: "useEmailForInvoices",
    sqlite: `INTEGER NOT NULL DEFAULT 0`,
    postgres: `BOOLEAN NOT NULL DEFAULT false`,
  },
  { name: "invoiceEmail", sqlite: `TEXT`, postgres: `TEXT` },
];

const TENANT_COLS: ColSpec[] = [
  {
    name: "financeOfficeDebtWorkingDays",
    sqlite: `INTEGER NOT NULL DEFAULT 10`,
    postgres: `INTEGER NOT NULL DEFAULT 10`,
  },
  { name: "financeOfficeDebtEmailSubject", sqlite: `TEXT`, postgres: `TEXT` },
  { name: "financeOfficeDebtEmailTemplate", sqlite: `TEXT`, postgres: `TEXT` },
  {
    name: "financeOfficeDocumentEmailSubject",
    sqlite: `TEXT`,
    postgres: `TEXT`,
  },
  {
    name: "financeOfficeDocumentEmailTemplate",
    sqlite: `TEXT`,
    postgres: `TEXT`,
  },
  { name: "financeOfficeDebtEmailAccountId", sqlite: `TEXT`, postgres: `TEXT` },
];

async function isSqlite(prisma: PrismaClient): Promise<boolean> {
  try {
    await prisma.$queryRawUnsafe("SELECT sqlite_version()");
    return true;
  } catch {
    return false;
  }
}

async function sqliteColumnNames(
  prisma: PrismaClient,
  table: string,
): Promise<Set<string>> {
  const cols = (await prisma.$queryRawUnsafe(
    `PRAGMA table_info("${table}")`,
  )) as Array<{ name?: string }>;
  return new Set((Array.isArray(cols) ? cols : []).map((c) => c?.name).filter(Boolean) as string[]);
}

async function postgresColumnNames(
  prisma: PrismaClient,
  table: string,
): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = ${table}
      AND table_schema IN (current_schema(), ${DEMO_PG_SCHEMA})
  `;
  return new Set(rows.map((r) => r.column_name));
}

async function addMissing(
  prisma: PrismaClient,
  table: string,
  names: Set<string>,
  specs: ColSpec[],
  dialect: "sqlite" | "postgres",
): Promise<void> {
  for (const spec of specs) {
    if (names.has(spec.name)) continue;
    const typeSql = dialect === "sqlite" ? spec.sqlite : spec.postgres;
    const sql =
      dialect === "postgres"
        ? `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${spec.name}" ${typeSql}`
        : `ALTER TABLE "${table}" ADD COLUMN "${spec.name}" ${typeSql}`;
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      const msg = String(e).toLowerCase();
      if (!msg.includes("duplicate column") && !msg.includes("already exists")) {
        throw e;
      }
    }
  }
}

/**
 * Колонки долгов ФинОтдела, если SQLite без migrate или демо-Postgres
 * после старого `db push` (схема «готова» по User, Tenant без новых полей).
 */
export async function ensureFinanceOfficeDebtColumns(
  prisma: PrismaClient,
): Promise<void> {
  if (checked.has(prisma)) return;

  const sqlite = await isSqlite(prisma);
  const dialect = sqlite ? "sqlite" : "postgres";
  const clinicNames = sqlite
    ? await sqliteColumnNames(prisma, "Clinic")
    : await postgresColumnNames(prisma, "Clinic");
  const tenantNames = sqlite
    ? await sqliteColumnNames(prisma, "Tenant")
    : await postgresColumnNames(prisma, "Tenant");

  await addMissing(prisma, "Clinic", clinicNames, CLINIC_COLS, dialect);
  await addMissing(prisma, "Tenant", tenantNames, TENANT_COLS, dialect);

  checked.set(prisma, true);
}
