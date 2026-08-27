import "server-only";

import type { PrismaClient } from "@prisma/client";
import { DEMO_PG_SCHEMA } from "@/lib/prisma-demo";

const checked = new WeakMap<PrismaClient, true>();

type ColSpec = { name: string; sqlite: string; postgres: string };

const ITEM_COLS: ColSpec[] = [
  {
    name: "saleUnitPriceRub",
    sqlite: `REAL`,
    postgres: `DOUBLE PRECISION`,
  },
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
  return new Set(
    (Array.isArray(cols) ? cols : [])
      .map((c) => c?.name)
      .filter(Boolean) as string[],
  );
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

/**
 * Колонки InventoryItem после старого демо db push / SQLite без migrate.
 */
export async function ensureInventoryItemColumns(
  prisma: PrismaClient,
): Promise<void> {
  if (checked.has(prisma)) return;

  const sqlite = await isSqlite(prisma);
  const dialect = sqlite ? "sqlite" : "postgres";
  const names = sqlite
    ? await sqliteColumnNames(prisma, "InventoryItem")
    : await postgresColumnNames(prisma, "InventoryItem");

  if (names.size === 0) {
    /** Таблицы ещё нет — пусть db push / migrate создаст целиком. */
    checked.set(prisma, true);
    return;
  }

  for (const spec of ITEM_COLS) {
    if (names.has(spec.name)) continue;
    const typeSql = dialect === "sqlite" ? spec.sqlite : spec.postgres;
    const sql =
      dialect === "postgres"
        ? `ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "${spec.name}" ${typeSql}`
        : `ALTER TABLE "InventoryItem" ADD COLUMN "${spec.name}" ${typeSql}`;
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      const msg = String(e).toLowerCase();
      if (!msg.includes("duplicate column") && !msg.includes("already exists")) {
        throw e;
      }
    }
  }

  checked.set(prisma, true);
}
