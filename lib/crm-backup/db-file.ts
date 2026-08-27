/**
 * Живой файл/дамп DATABASE_URL. SQLite: путь от prisma/ + WAL/SHM.
 * Postgres: pg_dump / psql. Часовой пояс слота бекапа задаётся снаружи (МСК).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { CrmBackupEngine } from "@/lib/crm-backup/types";
import { getCrmDumpLocalDir } from "@/lib/crm-dump/local-dir";

function pgSqlTempPath(prefix: string): string {
  return path.join(getCrmDumpLocalDir(), `${prefix}-${Date.now()}.sql`);
}

export function resolveLiveDatabaseUrl(): string {
  return String(process.env.DATABASE_URL || "").trim();
}

export function detectBackupEngine(url: string = resolveLiveDatabaseUrl()): CrmBackupEngine | null {
  if (url.startsWith("file:")) return "sqlite";
  if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
    return "postgres";
  }
  return null;
}

export function resolveSqliteFilePath(url: string = resolveLiveDatabaseUrl()): string | null {
  if (!url.startsWith("file:")) return null;
  const rel = url.slice("file:".length).replace(/^\.?\//, "");
  const prismaDir = path.join(process.cwd(), "prisma");
  const src = path.isAbsolute(rel) ? rel : path.join(prismaDir, rel);
  return src;
}

function resolvePgTool(name: "pg_dump" | "psql"): string {
  const envKey = name === "pg_dump" ? "PG_DUMP_PATH" : "PSQL_PATH";
  const fromEnv = String(process.env[envKey] || "").trim();
  if (fromEnv) return fromEnv;
  if (process.platform !== "win32") return name;
  for (let v = 18; v >= 10; v -= 1) {
    const candidate = `C:\\Program Files\\PostgreSQL\\${v}\\bin\\${name}.exe`;
    if (fs.existsSync(candidate)) return candidate;
  }
  return name;
}

function normalizePgUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.searchParams.delete("schema");
    return u.toString();
  } catch {
    return rawUrl;
  }
}

export type SqliteFileParts = {
  main: Buffer;
  wal?: Buffer;
  shm?: Buffer;
};

function readIfExists(filePath: string): Buffer | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  return fs.readFileSync(filePath);
}

/** Копия файла + WAL/SHM (Prisma обычно в WAL). Без checkpoint. */
export function readLiveSqliteParts(): SqliteFileParts {
  const src = resolveSqliteFilePath();
  if (!src || !fs.existsSync(src)) {
    throw new Error("Файл SQLite не найден");
  }
  return {
    main: fs.readFileSync(src),
    wal: readIfExists(`${src}-wal`),
    shm: readIfExists(`${src}-shm`),
  };
}

export function dumpLivePostgresSql(): Buffer {
  const url = normalizePgUrl(resolveLiveDatabaseUrl());
  const pgDump = resolvePgTool("pg_dump");
  const tmp = pgSqlTempPath("_pg-dump");
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  const cmd = spawnSync(
    pgDump,
    ["--dbname", url, "--no-owner", "--no-privileges", "--file", tmp],
    { encoding: "utf8", env: process.env },
  );
  if (cmd.status !== 0) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    throw new Error(
      cmd.stderr?.trim() ||
        "Не удалось сделать pg_dump. Проверьте PATH или PG_DUMP_PATH.",
    );
  }
  const bytes = fs.readFileSync(tmp);
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* ignore */
  }
  return bytes;
}

function writeAtomic(dest: string, bytes: Buffer): void {
  const tmp = `${dest}.restore-tmp`;
  fs.writeFileSync(tmp, bytes);
  fs.copyFileSync(tmp, dest);
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* ignore */
  }
}

function unlinkIfExists(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    /* ignore */
  }
}

export function writeLiveSqliteParts(parts: SqliteFileParts): void {
  const dest = resolveSqliteFilePath();
  if (!dest) throw new Error("DATABASE_URL не SQLite");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  writeAtomic(dest, parts.main);
  if (parts.wal) writeAtomic(`${dest}-wal`, parts.wal);
  else unlinkIfExists(`${dest}-wal`);
  if (parts.shm) writeAtomic(`${dest}-shm`, parts.shm);
  else unlinkIfExists(`${dest}-shm`);
}

export function restoreLivePostgresSql(sql: Buffer): void {
  const url = normalizePgUrl(resolveLiveDatabaseUrl());
  const psql = resolvePgTool("psql");
  const tmp = pgSqlTempPath("_pg-restore");
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, sql);
  const cmd = spawnSync(psql, ["--dbname", url, "--file", tmp], {
    encoding: "utf8",
    env: process.env,
  });
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* ignore */
  }
  if (cmd.status !== 0) {
    throw new Error(
      cmd.stderr?.trim() ||
        "Не удалось восстановить PostgreSQL. Проверьте PATH или PSQL_PATH.",
    );
  }
}

export function isSqliteFileBuffer(bytes: Buffer): boolean {
  return bytes.subarray(0, 15).toString("utf8") === "SQLite format 3";
}
