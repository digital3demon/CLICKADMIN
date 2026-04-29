/**
 * Копия SQLite БД из DATABASE_URL (по умолчанию prisma/dev.db).
 * Использование: node --env-file=.env scripts/db-backup.cjs
 */
const fs = require("fs");
const path = require("path");

const envUrl = process.env.DATABASE_URL || "file:./dev.db";
const match = envUrl.match(/^file:(.+)$/);
if (!match) {
  console.error("DATABASE_URL должен быть file:... (SQLite)");
  process.exit(1);
}
const rel = match[1].replace(/^\.?\//, "");
const prismaDir = path.join(__dirname, "..", "prisma");
const src = path.isAbsolute(rel) ? rel : path.join(prismaDir, rel);

if (!fs.existsSync(src)) {
  console.error("Файл БД не найден:", src);
  process.exit(1);
}

const backups = path.join(prismaDir, "backups");
fs.mkdirSync(backups, { recursive: true });

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .slice(0, 19);
const dest = path.join(backups, `dev-${stamp}.db`);

fs.copyFileSync(src, dest);
const stat = fs.statSync(dest);
console.log("Бэкап создан:", dest);
console.log("Размер:", stat.size, "байт");
