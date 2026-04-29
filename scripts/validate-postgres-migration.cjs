/**
 * Валидация миграции SQLite -> PostgreSQL:
 * - сравнение количества строк по таблицам
 * - базовые проверки сиротских ссылок
 *
 * Запуск:
 *   node --env-file=.env scripts/validate-postgres-migration.cjs
 */
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { PrismaClient } = require("@prisma/client");

const EXCLUDED_TABLES = new Set(["_prisma_migrations"]);

function qid(name) {
  return `"${String(name).replace(/"/g, "\"\"")}"`;
}

function log(step, details = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), step, ...details }));
}

function resolveSqlitePath(url) {
  if (!url || !url.startsWith("file:")) {
    throw new Error("LEGACY_SQLITE_URL должен быть в формате file:...");
  }
  const rel = url.slice("file:".length).replace(/^\.?\//, "");
  if (path.isAbsolute(rel)) return rel;
  return path.join(process.cwd(), rel);
}

function sourceTables(db) {
  const rows = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
    .all();
  return rows
    .map((r) => String(r.name))
    .filter((t) => !t.startsWith("sqlite_"))
    .filter((t) => !EXCLUDED_TABLES.has(t));
}

async function main() {
  const pgUrl = String(process.env.DATABASE_URL || "").trim();
  const sqliteUrl = String(process.env.LEGACY_SQLITE_URL || "").trim();
  if (!pgUrl.startsWith("postgresql://") && !pgUrl.startsWith("postgres://")) {
    throw new Error("DATABASE_URL должен указывать на PostgreSQL");
  }
  const sqlitePath = resolveSqlitePath(sqliteUrl);
  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite источник не найден: ${sqlitePath}`);
  }

  const sqlite = new DatabaseSync(sqlitePath, { readonly: true });
  const prisma = new PrismaClient();
  const problems = [];

  try {
    const tables = sourceTables(sqlite);
    log("tables_loaded", { tables: tables.length });

    for (const t of tables) {
      const src = Number(
        sqlite.prepare(`SELECT COUNT(*) AS cnt FROM ${qid(t)}`).get().cnt || 0,
      );
      let dst = 0;
      try {
        const rows = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::bigint AS cnt FROM ${qid(t)}`,
        );
        dst = Number(rows[0].cnt || 0);
      } catch (e) {
        problems.push(`Нет таблицы в PostgreSQL или ошибка чтения: ${t}`);
        continue;
      }
      if (src !== dst) {
        problems.push(`Count mismatch ${t}: sqlite=${src}, postgres=${dst}`);
      }
    }

    const orphanChecks = [
      {
        name: "orders_without_doctor",
        sql: `SELECT COUNT(*)::bigint AS cnt FROM "Order" o LEFT JOIN "Doctor" d ON d.id = o."doctorId" WHERE d.id IS NULL`,
      },
      {
        name: "orders_without_tenant",
        sql: `SELECT COUNT(*)::bigint AS cnt FROM "Order" o LEFT JOIN "Tenant" t ON t.id = o."tenantId" WHERE t.id IS NULL`,
      },
      {
        name: "doctor_links_without_doctor",
        sql: `SELECT COUNT(*)::bigint AS cnt FROM "DoctorOnClinic" x LEFT JOIN "Doctor" d ON d.id = x."doctorId" WHERE d.id IS NULL`,
      },
      {
        name: "doctor_links_without_clinic",
        sql: `SELECT COUNT(*)::bigint AS cnt FROM "DoctorOnClinic" x LEFT JOIN "Clinic" c ON c.id = x."clinicId" WHERE c.id IS NULL`,
      },
      {
        name: "order_lines_without_order",
        sql: `SELECT COUNT(*)::bigint AS cnt FROM "OrderConstruction" l LEFT JOIN "Order" o ON o.id = l."orderId" WHERE o.id IS NULL`,
      },
    ];

    for (const c of orphanChecks) {
      try {
        const rows = await prisma.$queryRawUnsafe(c.sql);
        const cnt = Number(rows[0].cnt || 0);
        if (cnt > 0) {
          problems.push(`Orphan check failed ${c.name}: ${cnt}`);
        }
      } catch (e) {
        problems.push(`Orphan check error ${c.name}`);
      }
    }

    if (problems.length > 0) {
      log("validation_failed", { problems });
      process.exit(1);
    }
    log("validation_ok");
  } finally {
    try {
      sqlite.close();
    } catch {
      // noop
    }
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      step: "failed",
      error: e instanceof Error ? e.message : String(e),
    }),
  );
  process.exit(1);
});
