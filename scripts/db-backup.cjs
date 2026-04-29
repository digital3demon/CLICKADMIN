/**
 * Бэкап DATABASE_URL:
 * - SQLite: копия .db файла
 * - PostgreSQL: дамп через pg_dump в .sql
 *
 * Использование: node --env-file=.env scripts/db-backup.cjs
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const prismaDir = path.join(__dirname, "..", "prisma");
const backups = path.join(prismaDir, "backups");
fs.mkdirSync(backups, { recursive: true });

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .slice(0, 19);
const envUrl = process.env.DATABASE_URL || "";

function resolvePgDumpExecutable() {
  const fromEnv = String(process.env.PG_DUMP_PATH || "").trim();
  if (fromEnv) return fromEnv;
  if (process.platform !== "win32") return "pg_dump";
  for (let v = 18; v >= 10; v -= 1) {
    const candidate = `C:\\Program Files\\PostgreSQL\\${v}\\bin\\pg_dump.exe`;
    if (fs.existsSync(candidate)) return candidate;
  }
  return "pg_dump";
}

function normalizePgDumpDbUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    u.searchParams.delete("schema");
    return u.toString();
  } catch {
    return rawUrl;
  }
}

if (envUrl.startsWith("file:")) {
  const rel = envUrl.slice("file:".length).replace(/^\.?\//, "");
  const src = path.isAbsolute(rel) ? rel : path.join(prismaDir, rel);
  if (!fs.existsSync(src)) {
    console.error("Файл SQLite БД не найден:", src);
    process.exit(1);
  }
  const dest = path.join(backups, `sqlite-${stamp}.db`);
  fs.copyFileSync(src, dest);
  const stat = fs.statSync(dest);
  console.log("SQLite бэкап создан:", dest);
  console.log("Размер:", stat.size, "байт");
  process.exit(0);
}

if (envUrl.startsWith("postgresql://") || envUrl.startsWith("postgres://")) {
  const dest = path.join(backups, `postgres-${stamp}.sql`);
  const pgDump = resolvePgDumpExecutable();
  const dbUrlForDump = normalizePgDumpDbUrl(envUrl);
  const cmd = spawnSync(
    pgDump,
    ["--dbname", dbUrlForDump, "--no-owner", "--no-privileges", "--file", dest],
    {
      stdio: "inherit",
      shell: false,
      env: process.env,
    },
  );
  if (cmd.status !== 0) {
    console.error(
      "Не удалось сделать дамп PostgreSQL (проверьте, что pg_dump доступен в PATH).",
    );
    process.exit(cmd.status || 1);
  }
  const stat = fs.statSync(dest);
  console.log("PostgreSQL бэкап создан:", dest);
  console.log("Размер:", stat.size, "байт");
  process.exit(0);
}

console.error(
  "DATABASE_URL должен быть file:... (SQLite) или postgresql://... (PostgreSQL)",
);
process.exit(1);
