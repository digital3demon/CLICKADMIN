/**
 * Копирует лаб-CRM в `dental-crm-saas` (отдельная SaaS-папка).
 * Копирует только верхний уровень (app, lib, components, …), рекурсивно внутри каждой.
 * `node scripts/bootstrap-dental-crm-saas.cjs` из корня лаб-проекта.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const DEST = path.join(ROOT, "dental-crm-saas");

const SKIP = new Set([
  "node_modules",
  ".next",
  "dist",
  "dental-crm-saas",
  "examples",
  ".git",
  ".cursor",
  "tsconfig.tsbuildinfo",
]);

const SKIP_FILES = new Set([
  ".env",
  ".env.local",
  ".env.standalone",
]);

if (fs.existsSync(DEST)) {
  if (fs.readdirSync(DEST).length > 0) {
    console.error(
      "Папка dental-crm-saas уже существует и не пуста. Удалите или переименуйте и повторите.",
    );
    process.exit(1);
  }
} else {
  fs.mkdirSync(DEST, { recursive: true });
}

/**
 * `fs.cpSync` на крупных деревьях (app/) иногда падает нативно на Windows — robocopy для каталогов.
 * Код 0–7 — успех у robocopy.
 */
function copyEntry(from, to, name) {
  if (process.platform === "win32" && fs.statSync(from).isDirectory()) {
    const r = spawnSync(
      "cmd.exe",
      ["/c", "robocopy", from, to, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP", "/R:1", "/W:1"],
      { windowsHide: true, stdio: "inherit" },
    );
    const c = r.status;
    if (c != null && c >= 8) {
      throw new Error(`robocopy ${name} exit ${c}`);
    }
    return;
  }
  const st = fs.statSync(from);
  if (st.isDirectory()) {
    fs.cpSync(from, to, { recursive: true });
  } else {
    fs.copyFileSync(from, to);
  }
}

for (const name of fs.readdirSync(ROOT)) {
  if (SKIP.has(name)) continue;
  if (SKIP_FILES.has(name)) continue;
  const from = path.join(ROOT, name);
  const to = path.join(DEST, name);
  try {
    copyEntry(from, to, name);
    console.log("+", name);
  } catch (e) {
    console.error("Ошибка копирования:", name, e && e.message);
    process.exit(1);
  }
}

const pkgPath = path.join(DEST, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.name = "dental-crm-saas";
if (pkg.scripts) {
  delete pkg.scripts["build:commercial"];
  if (pkg.scripts.build === "npm run build:lab") {
    pkg.scripts.build = "prisma generate && next build";
  }
  if (pkg.scripts["build:lab"]) {
    delete pkg.scripts["build:lab"];
  }
}
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");

const ncfgPath = path.join(DEST, "next.config.ts");
let ncfg = fs.readFileSync(ncfgPath, "utf8");
if (!ncfg.includes("CRM_BUILD: \"commercial\"")) {
  ncfg = ncfg.replace(
    "const nextConfig: NextConfig = {",
    `const nextConfig: NextConfig = {
  env: {
    CRM_BUILD: "commercial",
    NEXT_PUBLIC_CRM_BUILD: "commercial",
  },
`,
  );
  fs.writeFileSync(ncfgPath, ncfg, "utf8");
}

fs.rmSync(path.join(DEST, "scripts", "build-commercial.cjs"), { force: true });
fs.rmSync(path.join(DEST, "scripts", "bootstrap-dental-crm-saas.cjs"), {
  force: true,
});

const saasReadme = [
  "# dental-crm-saas",
  "",
  "Отдельная коммерческая (SaaS) сборка. Лаборатория — в корне репозитория (родительская папка).",
  "",
  "- cd dental-crm-saas",
  "- npm install",
  "- npx prisma generate",
  "- скопируйте .env.example в .env и настройте (отдельная БД/секреты).",
  "- npm run build — в next.config уже CRM_BUILD=commercial",
  "- обновить дерево: удалить dental-crm-saas и снова node scripts/bootstrap-dental-crm-saas.cjs из лаб-корня",
  "",
].join("\n");
fs.writeFileSync(path.join(DEST, "README-SAAS.txt"), saasReadme, "utf8");

console.log("OK: dental-crm-saas ->", DEST);
