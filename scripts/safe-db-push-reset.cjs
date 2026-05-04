const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function loadEnvFallback() {
  if (process.env.DATABASE_URL) return;
  const p = path.join(process.cwd(), ".env");
  if (!fs.existsSync(p)) return;
  const text = fs.readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFallback();

const dbUrl = String(process.env.DATABASE_URL || "").trim();
if (!dbUrl.startsWith("file:")) {
  throw new Error(
    "db:push:reset разрешён только для SQLite DATABASE_URL=file:...; PostgreSQL сбрасывайте вручную после бэкапа.",
  );
}
if (
  process.env.NODE_ENV === "production" &&
  process.env.CRM_ALLOW_DESTRUCTIVE_DB_RESET !== "1"
) {
  throw new Error(
    "NODE_ENV=production: destructive reset заблокирован. Для тестовой SQLite-БД задайте CRM_ALLOW_DESTRUCTIVE_DB_RESET=1.",
  );
}

execSync("npx prisma db push --force-reset --accept-data-loss", {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
  shell: true,
});
