/**
 * Полная зеркальная копия лаб-CRM → коммерческая папка (по умолчанию соседняя ../dental-crm-saas).
 * Сохраняет .env / .env.local / .env.standalone в целевой папке.
 *
 * Запуск из корня лаб-проекта:
 *   npm run sync:saas
 * Или путь явно:
 *   node scripts/sync-saas-from-lab.cjs "C:\path\to\dental-crm-saas"
 * Или env:
 *   set DENTAL_CRM_SAAS_DIR=C:\path\to\dental-crm-saas
 *
 * В зеркале нет файлов БД: *.db / *.db-journal не копируются (верхний уровень) и
 * вырезаются рекурсивно после копии. Сохранить копии БД: SAAS_SYNC_KEEP_DB=1
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");

const rootPkgPath = path.join(ROOT, "package.json");
if (!fs.existsSync(rootPkgPath)) {
  console.error("Нет package.json в", ROOT);
  process.exit(1);
}
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
if (rootPkg.name !== "dental-lab-crm") {
  console.error(
    "sync-saas-from-lab запускайте только из корня dental-lab-crm (источник — личная CRM).",
  );
  process.exit(1);
}

const argvDest = process.argv[2]?.trim();
const envDest = process.env.DENTAL_CRM_SAAS_DIR?.trim();
const DEST = path.resolve(
  argvDest ||
    envDest ||
    path.join(ROOT, "..", "dental-crm-saas"),
);

if (DEST === path.resolve(ROOT)) {
  console.error("Ошибка: путь назначения совпадает с лаб-корнем.");
  process.exit(1);
}

const SKIP = new Set([
  "node_modules",
  ".next",
  "dist",
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

function copyEntry(from, to, name) {
  if (process.platform === "win32" && fs.statSync(from).isDirectory()) {
    const r = spawnSync(
      "cmd.exe",
      [
        "/c",
        "robocopy",
        from,
        to,
        "/E",
        "/NFL",
        "/NDL",
        "/NJH",
        "/NJS",
        "/NP",
        "/R:1",
        "/W:1",
      ],
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

function readOptionalEnvBackup(dir) {
  const keys = [".env", ".env.local", ".env.standalone"];
  const out = {};
  for (const k of keys) {
    const p = path.join(dir, k);
    if (fs.existsSync(p)) {
      try {
        out[k] = fs.readFileSync(p, "utf8");
      } catch {
        /* skip */
      }
    }
  }
  return out;
}

function restoreEnvBackup(dir, backup) {
  for (const [k, content] of Object.entries(backup)) {
    if (content != null) {
      fs.writeFileSync(path.join(dir, k), content, "utf8");
      console.log("восстановлен", k);
    }
  }
}

function patchSaasPackageJson(destRoot) {
  const pkgPath = path.join(destRoot, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.error("Нет package.json в", destRoot);
    process.exit(1);
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.name = "dental-crm-saas";
  if (pkg.scripts) {
    delete pkg.scripts["sync:saas"];
    delete pkg.scripts["bootstrap:saas"];
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
}

function patchSaasNextConfig(destRoot) {
  const ncfgPath = path.join(destRoot, "next.config.ts");
  if (!fs.existsSync(ncfgPath)) return;
  let ncfg = fs.readFileSync(ncfgPath, "utf8");
  if (ncfg.includes('CRM_BUILD: "commercial"')) return;
  if (!ncfg.includes("const nextConfig: NextConfig = {")) {
    console.warn("next.config.ts: не найден шаблон const nextConfig — правка env вручную.");
    return;
  }
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

function writeReadme(destRoot) {
  const text = [
    "dental-crm-saas — зеркало лаб-CRM (dental-lab-crm).",
    "",
    "Без файлов БД (*.db): своя база на сервере / локально в этой папке.",
    "",
    "Ручной синк: в корне dental-lab-crm — npm run sync:saas",
    "(сохраняются .env, .env.local, .env.standalone здесь).",
    "",
    "Автоматически при правках: npm run sync:saas:watch (фоновый процесс).",
    "Или после каждого git commit: npm run sync:saas:install-hook (один раз).",
    "",
    "Дальше: npm install, npx prisma generate (и нужные generate для схем), npm run build.",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(destRoot, "README-SAAS.txt"), text, "utf8");
}

/** Убрать SQLite-файлы из зеркала (источник истины БД — лаба отдельно). */
function removeDatabaseFiles(destRoot) {
  if (process.env.SAAS_SYNC_KEEP_DB === "1") return;
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.db(-journal)?$/i.test(e.name)) {
        try {
          fs.unlinkSync(p);
          console.log("без БД в зеркале:", path.relative(destRoot, p));
        } catch {
          /* skip */
        }
      }
    }
  }
  walk(destRoot);
}

// --- main ---

console.log("Лаб (источник):", ROOT);
console.log("SaaS (назначение):", DEST);

const backup = fs.existsSync(DEST) ? readOptionalEnvBackup(DEST) : {};

if (fs.existsSync(DEST)) {
  fs.rmSync(DEST, { recursive: true, force: true });
}
fs.mkdirSync(DEST, { recursive: true });

for (const name of fs.readdirSync(ROOT)) {
  if (SKIP.has(name)) continue;
  if (SKIP_FILES.has(name)) continue;
  if (/\.db(-journal)?$/i.test(name)) continue;
  // не копируем вложенную старую saas-копию, если она когда-то лежала внутри лаба
  if (name === "dental-crm-saas") continue;

  const resolved = path.resolve(path.join(ROOT, name));
  if (resolved === DEST || resolved.startsWith(DEST + path.sep)) continue;

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

patchSaasPackageJson(DEST);
patchSaasNextConfig(DEST);
removeDatabaseFiles(DEST);
restoreEnvBackup(DEST, backup);

fs.rmSync(path.join(DEST, "scripts", "bootstrap-dental-crm-saas.cjs"), {
  force: true,
});
fs.rmSync(path.join(DEST, "scripts", "build-commercial.cjs"), { force: true });
fs.rmSync(path.join(DEST, "scripts", "sync-saas-from-lab.cjs"), { force: true });
writeReadme(DEST);

console.log("OK: синхронизация завершена ->", DEST);
