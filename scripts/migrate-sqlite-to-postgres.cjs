/**
 * ETL: перенос данных из SQLite в PostgreSQL.
 *
 * Запуск:
 *   node --env-file=.env scripts/migrate-sqlite-to-postgres.cjs --dry-run
 *   node --env-file=.env scripts/migrate-sqlite-to-postgres.cjs
 *   node --env-file=.env scripts/migrate-sqlite-to-postgres.cjs --force
 *
 * Переменные:
 *   DATABASE_URL       - PostgreSQL (целевой)
 *   LEGACY_SQLITE_URL  - SQLite-источник (file:...)
 */
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { PrismaClient } = require("@prisma/client");

const EXCLUDED_TABLES = new Set(["_prisma_migrations"]);
const SQLITE_INTERNAL_PREFIX = "sqlite_";

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    force: argv.includes("--force"),
  };
}

function nowMs() {
  return Date.now();
}

function logStep(step, details = {}) {
  const payload = {
    ts: new Date().toISOString(),
    step,
    ...details,
  };
  console.log(JSON.stringify(payload));
}

function qid(name) {
  return `"${String(name).replace(/"/g, "\"\"")}"`;
}

function resolveSqlitePath(url) {
  if (!url || !url.startsWith("file:")) {
    throw new Error("LEGACY_SQLITE_URL должен быть в формате file:...");
  }
  const rel = url.slice("file:".length).replace(/^\.?\//, "");
  if (path.isAbsolute(rel)) return rel;
  return path.join(process.cwd(), rel);
}

function sqliteAll(db, sql) {
  return db.prepare(sql).all();
}

function sqliteGet(db, sql) {
  return db.prepare(sql).get();
}

function getSourceTables(db) {
  const rows = sqliteAll(
    db,
    `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name ASC`,
  );
  return rows
    .map((r) => String(r.name))
    .filter((name) => !name.startsWith(SQLITE_INTERNAL_PREFIX))
    .filter((name) => !EXCLUDED_TABLES.has(name));
}

function getForeignDeps(db, table) {
  const rows = sqliteAll(db, `PRAGMA foreign_key_list(${qid(table)})`);
  return rows.map((r) => ({
    from: String(r.from),
    refTable: String(r.table),
  }));
}

function getPrimaryKeyColumns(db, table) {
  const rows = sqliteAll(db, `PRAGMA table_info(${qid(table)})`);
  return rows
    .filter((r) => Number(r.pk) > 0)
    .sort((a, b) => Number(a.pk) - Number(b.pk))
    .map((r) => String(r.name));
}

function buildTopoOrder(tables, depByTable) {
  const deps = new Map();
  for (const t of tables) {
    deps.set(
      t,
      new Set(
        (depByTable.get(t) || [])
          .map((d) => d.refTable)
          .filter((x) => x !== t && tables.includes(x)),
      ),
    );
  }
  const order = [];
  const queue = tables.filter((t) => deps.get(t).size === 0).sort();
  const seen = new Set();

  while (queue.length > 0) {
    const t = queue.shift();
    if (seen.has(t)) continue;
    seen.add(t);
    order.push(t);
    for (const other of tables) {
      if (!deps.get(other).has(t)) continue;
      deps.get(other).delete(t);
      if (deps.get(other).size === 0) queue.push(other);
    }
    queue.sort();
  }

  for (const t of tables) {
    if (!seen.has(t)) order.push(t);
  }
  return order;
}

function normalizeBoolean(v) {
  if (v == null) return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v).trim().toLowerCase();
  if (!s) return null;
  if (["1", "true", "t", "yes", "y"].includes(s)) return true;
  if (["0", "false", "f", "no", "n"].includes(s)) return false;
  return Boolean(v);
}

function toDateFromEpochLike(v) {
  if (v == null) return null;
  let n = v;
  if (typeof n === "string") {
    const t = n.trim();
    if (!t) return null;
    n = Number(t);
  }
  if (typeof n !== "number" || Number.isNaN(n)) return null;
  // Prisma SQLite часто хранит DateTime как epoch milliseconds.
  const ms = Math.abs(n) >= 1e12 ? n : n * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function isDateInReasonableRange(d) {
  const year = d.getUTCFullYear();
  return year >= 1900 && year <= 2100;
}

function toIsoDateLike(v) {
  if (v == null) return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    if (!isDateInReasonableRange(v)) return null;
    return v.toISOString();
  }
  if (typeof v === "number" || typeof v === "string") {
    const asEpoch = toDateFromEpochLike(v);
    if (asEpoch && isDateInReasonableRange(asEpoch)) return asEpoch.toISOString();
    const parsed = new Date(String(v));
    if (!Number.isNaN(parsed.getTime()) && isDateInReasonableRange(parsed)) {
      return parsed.toISOString();
    }
    return null;
  }
  return null;
}

function convertValue(v, pgDataType) {
  if (v == null) return null;
  if (typeof v === "bigint") return Number(v);

  if (pgDataType === "boolean") {
    return normalizeBoolean(v);
  }
  if (pgDataType === "json" || pgDataType === "jsonb") {
    if (typeof v === "string") {
      const t = v.trim();
      if (!t) return null;
      try {
        return JSON.stringify(JSON.parse(t));
      } catch {
        return JSON.stringify(t);
      }
    }
    try {
      return JSON.stringify(v);
    } catch {
      return JSON.stringify(String(v));
    }
  }
  if (pgDataType === "bytea") {
    if (Buffer.isBuffer(v)) return v;
    if (v instanceof Uint8Array) return Buffer.from(v);
    if (typeof v === "string") return Buffer.from(v);
    return Buffer.from(String(v));
  }
  if (
    pgDataType === "date" ||
    pgDataType.includes("timestamp") ||
    pgDataType.includes("time")
  ) {
    return toIsoDateLike(v);
  }
  return v;
}

function placeholderWithCast(meta, index) {
  const base = `$${index}`;
  if (!meta) return base;

  const dataType = String(meta.dataType || "").toLowerCase();
  if (dataType === "user-defined" && meta.udtName) {
    return `${base}::${qid(meta.udtName)}`;
  }
  if (dataType === "timestamp without time zone") return `${base}::timestamp`;
  if (dataType === "timestamp with time zone") return `${base}::timestamptz`;
  if (dataType === "date") return `${base}::date`;
  if (dataType === "time without time zone") return `${base}::time`;
  if (dataType === "time with time zone") return `${base}::timetz`;
  if (dataType === "jsonb") return `${base}::jsonb`;
  if (dataType === "json") return `${base}::json`;
  return base;
}

function toSqliteBooleanLike(v) {
  if (v == null) return 0;
  return normalizeBoolean(v) ? 1 : 0;
}

async function applyDeferredUpdate(prisma, update, pgTypeByTableCol, pgTypeMetaByTableCol) {
  const pkCols = update.pkCols;
  if (!pkCols.length) return false;

  const setType = pgTypeByTableCol.get(`${update.table}.${update.col}`) || "text";
  const setVal = convertValue(update.value, setType);
  const setMeta = pgTypeMetaByTableCol.get(`${update.table}.${update.col}`);
  const setExpr = `${qid(update.col)} = ${placeholderWithCast(setMeta, 1)}`;
  const whereClause = pkCols
    .map((pk, idx) => `${qid(pk)} = $${idx + 2}`)
    .join(" AND ");
  const whereValues = pkCols.map((pk) =>
    convertValue(
      update.whereObj[pk],
      pgTypeByTableCol.get(`${update.table}.${pk}`) || "text",
    ),
  );
  const sql = `UPDATE ${qid(update.table)} SET ${setExpr} WHERE ${whereClause}`;
  await prisma.$executeRawUnsafe(sql, setVal, ...whereValues);
  return true;
}

async function main() {
  const t0 = nowMs();
  const { dryRun, force } = parseArgs(process.argv.slice(2));
  const pgUrl = String(process.env.DATABASE_URL || "").trim();
  const sqliteUrl = String(process.env.LEGACY_SQLITE_URL || "").trim();

  if (!pgUrl.startsWith("postgresql://") && !pgUrl.startsWith("postgres://")) {
    throw new Error("DATABASE_URL должен указывать на PostgreSQL");
  }
  if (!sqliteUrl) {
    throw new Error("Нужен LEGACY_SQLITE_URL (file:...)");
  }

  const sqlitePath = resolveSqlitePath(sqliteUrl);
  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite источник не найден: ${sqlitePath}`);
  }

  logStep("start", { dryRun, force, sqlitePath });
  const sqliteDb = new DatabaseSync(sqlitePath, { readonly: true });
  const prisma = new PrismaClient();

  try {
    const sourceTables = getSourceTables(sqliteDb);
    logStep("source_tables_loaded", { tables: sourceTables.length });

    const depByTable = new Map(
      sourceTables.map((t) => [t, getForeignDeps(sqliteDb, t)]),
    );
    const tableOrder = buildTopoOrder(sourceTables, depByTable);
    logStep("table_order_built", { tables: tableOrder.length });

    const pgColumnsRows = await prisma.$queryRawUnsafe(`
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `);
    const pgTypeByTableCol = new Map();
    const pgTypeMetaByTableCol = new Map();
    for (const r of pgColumnsRows) {
      const key = `${String(r.table_name)}.${String(r.column_name)}`;
      const dataType = String(r.data_type);
      const udtName = String(r.udt_name || "");
      pgTypeByTableCol.set(
        key,
        dataType,
      );
      pgTypeMetaByTableCol.set(key, { dataType, udtName });
    }

    // Проверка: целевая БД должна быть пустая (кроме _prisma_migrations).
    const preCounts = {};
    for (const t of tableOrder) {
      const cntRows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::bigint AS cnt FROM ${qid(t)}`,
      );
      const cnt = Number(cntRows[0].cnt || 0);
      preCounts[t] = cnt;
    }
    const nonEmpty = Object.entries(preCounts).filter(([, c]) => c > 0);
    if (!dryRun && nonEmpty.length > 0 && !force) {
      throw new Error(
        `Целевая PostgreSQL БД не пустая: ${nonEmpty
          .slice(0, 8)
          .map(([t, c]) => `${t}:${c}`)
          .join(", ")}. Используйте --force, если это ожидаемо.`,
      );
    }

    const totals = {
      tables: 0,
      rows: 0,
      inserted: 0,
      updatedSelfRefs: 0,
      updatedDeferredFks: 0,
    };
    const deferredFkUpdates = [];
    const loadedTables = new Set();
    for (const table of tableOrder) {
      const stepStart = nowMs();
      const srcRows = sqliteAll(sqliteDb, `SELECT * FROM ${qid(table)}`);
      const pkCols = getPrimaryKeyColumns(sqliteDb, table);
      const fkByCol = new Map((depByTable.get(table) || []).map((d) => [d.from, d.refTable]));
      const pendingSelfRefUpdates = [];

      totals.tables += 1;
      totals.rows += srcRows.length;

      if (!dryRun && srcRows.length > 0) {
        for (const srcRow of srcRows) {
          const row = { ...srcRow };
          const rowValues = [];
          const cols = Object.keys(row);
          for (const col of cols) {
            const pgType = pgTypeByTableCol.get(`${table}.${col}`) || "text";
            let v = row[col];
            const refTable = fkByCol.get(col);
            if (refTable && v != null && v !== "") {
              const whereObj = {};
              for (const pk of pkCols) whereObj[pk] = srcRow[pk];
              // Циклические/поздние FK обновляем вторым проходом, когда все таблицы уже вставлены.
              if (refTable === table || !loadedTables.has(refTable)) {
                if (refTable === table) {
                  pendingSelfRefUpdates.push({ whereObj, col, value: v });
                } else {
                  deferredFkUpdates.push({
                    table,
                    col,
                    value: v,
                    whereObj,
                    pkCols,
                    refTable,
                  });
                }
                v = null;
              }
            }
            rowValues.push(convertValue(v, pgType));
          }
          const placeholders = cols
            .map((col, i) => {
              const meta = pgTypeMetaByTableCol.get(`${table}.${col}`);
              return placeholderWithCast(meta, i + 1);
            })
            .join(", ");
          const sql = `INSERT INTO ${qid(table)} (${cols.map(qid).join(", ")}) VALUES (${placeholders})`;
          await prisma.$executeRawUnsafe(sql, ...rowValues);
          totals.inserted += 1;
        }

        for (const upd of pendingSelfRefUpdates) {
          const ok = await applyDeferredUpdate(
            prisma,
            { ...upd, table, pkCols },
            pgTypeByTableCol,
            pgTypeMetaByTableCol,
          );
          if (ok) totals.updatedSelfRefs += 1;
        }
      }

      loadedTables.add(table);

      logStep("table_done", {
        table,
        rows: srcRows.length,
        selfRefUpdates: pendingSelfRefUpdates.length,
        dryRun,
        elapsedMs: nowMs() - stepStart,
      });
    }

    if (!dryRun && deferredFkUpdates.length > 0) {
      for (const upd of deferredFkUpdates) {
        const ok = await applyDeferredUpdate(
          prisma,
          upd,
          pgTypeByTableCol,
          pgTypeMetaByTableCol,
        );
        if (ok) totals.updatedDeferredFks += 1;
      }
      logStep("deferred_fk_updates_done", {
        updates: deferredFkUpdates.length,
        applied: totals.updatedDeferredFks,
      });
    }

    // Синхронизируем sqlite-like booleans не требуется (вставка уже учитывает тип).
    logStep("done", {
      ...totals,
      dryRun,
      elapsedMs: nowMs() - t0,
    });
  } finally {
    try {
      sqliteDb.close();
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
