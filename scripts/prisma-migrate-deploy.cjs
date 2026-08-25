/**
 * `prisma migrate deploy` для текущего datasource.
 * Сначала `prisma generate` (кроме SQLite без WASM — см. ensurePrismaGenerateBeforeStuckScript),
 * затем авто-resolve зависшей миграции, затем deploy.
 * Сначала локальный `node_modules/prisma` (движки уже после npm ci).
 * Fallback: `npx prisma@<версия>` — не голый `npx prisma`, иначе уедет Prisma 7+ (P1012).
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

/** Корень выкладки (рядом с server.js): скрипт в корне или в scripts/. */
const hereDir = __dirname;
const bundleRoot =
  path.basename(hereDir) === "scripts"
    ? path.join(hereDir, "..")
    : hereDir;

function unquoteEnvValue(value) {
  const trimmed = String(value || "").trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"');
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadBundleEnv() {
  const envPath = path.join(bundleRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim().replace(/^export\s+/, "");
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || (process.env[key] != null && process.env[key] !== "")) continue;
    process.env[key] = unquoteEnvValue(trimmed.slice(eq + 1));
  }
}

loadBundleEnv();

function pathToEnsure(name) {
  const inScripts = path.join(bundleRoot, "scripts", name);
  if (fs.existsSync(inScripts)) return inScripts;
  const nextToRoot = path.join(bundleRoot, name);
  if (fs.existsSync(nextToRoot)) return nextToRoot;
  return path.join(hereDir, name);
}

const dbUrl = String(process.env.DATABASE_URL || "").trim().toLowerCase();
const isSqlite = dbUrl.startsWith("file:");
if (isSqlite && process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK !== "0") {
  process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = "1";
}

function resolvePrismaVersion() {
  const vf = path.join(bundleRoot, ".prisma-cli-version");
  try {
    const v = fs.readFileSync(vf, "utf8").trim();
    if (v) return v;
  } catch {
    /* fall through */
  }
  try {
    const lock = require(path.join(bundleRoot, "package-lock.json"));
    const v = lock.packages?.["node_modules/prisma"]?.version;
    if (v && String(v).trim()) return String(v).trim();
  } catch {
    /* fall through */
  }
  return "6.19.3";
}

const prismaVer = resolvePrismaVersion();
const prismaSpec = `prisma@${prismaVer}`;
const isWin = process.platform === "win32";

function resolveLocalPrismaCliJs() {
  const fromEnv = String(process.env.PRISMA_CLI_JS || "").trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const js = path.join(bundleRoot, "node_modules", "prisma", "build", "index.js");
  if (fs.existsSync(js)) return js;
  return null;
}

function runPrisma(args, options = {}) {
  const localJs = resolveLocalPrismaCliJs();
  if (localJs) {
    return spawnSync(process.execPath, [localJs, ...args], {
      cwd: bundleRoot,
      env: process.env,
      shell: false,
      ...options,
    });
  }
  return spawnSync("npx", ["-y", prismaSpec, ...args], {
    cwd: bundleRoot,
    env: process.env,
    shell: isWin,
    ...options,
  });
}

/** У Next.js standalone в node_modules часто не хватает файлов runtime Prisma → generate падает на WASM. */
function prismaSqliteWasmRuntimePresent() {
  const wasm = path.join(
    bundleRoot,
    "node_modules/@prisma/client/runtime/query_engine_bg.sqlite.wasm-base64.js",
  );
  return fs.existsSync(wasm);
}

function npmInstallPrismaPackages() {
  const pkgPath = path.join(bundleRoot, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.error(
      "Нет package.json в каталоге выкладки — выполните на сервере вручную:\n" +
        `  npm install prisma@${prismaVer} @prisma/client@${prismaVer}\n` +
        "затем снова: node scripts/prisma-migrate-deploy.cjs",
    );
    return false;
  }
  console.log(
    `Дополняем Prisma (${prismaVer}) в node_modules через npm install — это нормально для standalone-сборки.`,
  );
  const ins = spawnSync(
    "npm",
    [
      "install",
      `prisma@${prismaVer}`,
      `@prisma/client@${prismaVer}`,
      "--no-audit",
      "--no-fund",
    ],
    {
      cwd: bundleRoot,
      stdio: "inherit",
      env: process.env,
      shell: isWin,
    },
  );
  return ins.status === 0;
}

/** Нужен до `prisma-resolve-stuck-*` (импорт @prisma/client) и до migrate на CI с PostgreSQL. */
function runPrismaGenerate() {
  return runPrisma(["generate", "--schema=prisma/schema.prisma"], { stdio: "inherit" });
}

/**
 * SQLite без полного WASM в standalone: generate до migrate падает — его делают после migrate + npm install.
 * Для PostgreSQL generate обязателен до resolve-stuck (PrismaClient).
 */
function ensurePrismaGenerateBeforeStuckScript() {
  if (isSqlite && !prismaSqliteWasmRuntimePresent()) {
    console.log(
      "[migrate] pre-migrate: пропуск prisma generate (SQLite без WASM runtime — как раньше, после migrate).",
    );
    return;
  }
  let gen = runPrismaGenerate();
  if (gen.status !== 0 && isSqlite) {
    console.warn(
      "[migrate] pre-migrate: prisma generate — повтор после npm install prisma.",
    );
    if (npmInstallPrismaPackages()) gen = runPrismaGenerate();
  }
  if (gen.status !== 0) {
    console.error(
      "[migrate] pre-migrate: prisma generate не удался — нужен сгенерированный @prisma/client.",
    );
    process.exit(gen.status === null ? 1 : gen.status);
  }
  console.log("[migrate] pre-migrate: prisma generate OK");
}

/** Node с абсолютным --env-file и shell:false — иначе путь с пробелом (кириллица) ломается при shell:true. */
function spawnNodeScript(scriptPath, extraEnv = {}, scriptArgs = []) {
  const args = [];
  const ef = path.join(bundleRoot, ".env");
  if (fs.existsSync(ef)) {
    args.push("--env-file", ef);
  }
  args.push(scriptPath, ...scriptArgs);
  return spawnSync(process.execPath, args, {
    cwd: bundleRoot,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    shell: false,
  });
}

ensurePrismaGenerateBeforeStuckScript();

for (const stuckScript of [
  "prisma-resolve-stuck-kaiten-blocked-at-migration.cjs",
  "prisma-resolve-stuck-email-reply-template-migration.cjs",
  "prisma-resolve-stuck-admin-shipped-at-migration.cjs",
  "prisma-resolve-stuck-invoice-issued-at-migration.cjs",
]) {
  const fixPath = pathToEnsure(stuckScript);
  if (!fs.existsSync(fixPath)) {
    console.warn(`[migrate] нет ${stuckScript} — пропуск авто-исправления P3009.`);
    continue;
  }
  const fixStuck = spawnNodeScript(fixPath);
  if (fixStuck.status !== 0) {
    process.exit(fixStuck.status === null ? 1 : fixStuck.status);
  }
}

function outputSpawnResult(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

function isP3005(result) {
  const text = `${result.stdout || ""}\n${result.stderr || ""}`;
  return text.includes("P3005") || text.includes("database schema is not empty");
}

function schemaMatchesDatamodel() {
  if (!process.env.DATABASE_URL) return false;
  const diff = runPrisma(
    [
      "migrate",
      "diff",
      "--from-url",
      process.env.DATABASE_URL,
      "--to-schema-datamodel",
      "prisma/schema.prisma",
      "--exit-code",
    ],
    { stdio: "pipe", encoding: "utf8" },
  );
  outputSpawnResult(diff);
  return diff.status === 0;
}

function migrationNames() {
  const dir = path.join(bundleRoot, "prisma", "migrations");
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(dir, entry.name, "migration.sql")))
    .map((entry) => entry.name)
    .sort();
}

function resolveExistingSchemaAsApplied() {
  const names = migrationNames();
  if (names.length === 0) return false;
  console.warn(
    `[migrate] P3005: схема БД уже совпадает с Prisma schema, помечаю ${names.length} миграций как применённые.`,
  );
  for (const name of names) {
    const resolve = runPrisma(
      ["migrate", "resolve", "--applied", name, "--schema=prisma/schema.prisma"],
      { stdio: "inherit" },
    );
    if (resolve.status !== 0) return false;
  }
  return true;
}

function runMigrateDeploy() {
  return runPrisma(["migrate", "deploy", "--schema=prisma/schema.prisma"], {
    stdio: "pipe",
    encoding: "utf8",
  });
}

let r = runMigrateDeploy();
outputSpawnResult(r);

if (r.status !== 0) {
  if (isP3005(r) && schemaMatchesDatamodel() && resolveExistingSchemaAsApplied()) {
    r = runMigrateDeploy();
    outputSpawnResult(r);
  }
}

if (r.status !== 0) {
  process.exit(r.status === null ? 1 : r.status);
}

if (isSqlite && !prismaSqliteWasmRuntimePresent()) {
  console.warn(
    "В выкладке не найден полный runtime @prisma/client (типично для Next standalone). Устанавливаем пакеты через npm.",
  );
  if (!npmInstallPrismaPackages()) {
    process.exit(1);
  }
}

let gen = runPrismaGenerate();
if (gen.status !== 0) {
  console.warn("prisma generate завершился с ошибкой — пробуем npm install prisma пакетов и повтор.");
  if (npmInstallPrismaPackages()) {
    gen = runPrismaGenerate();
  }
}

if (gen.status !== 0) {
  process.exit(gen.status === null ? 1 : gen.status);
}
console.log(
  "prisma generate: OK. Перезапустите процесс Node (pm2 restart, systemctl и т.д.) — иначе старый @prisma/client останется в памяти.",
);

if (isSqlite) {
  const ensure = spawnNodeScript(pathToEnsure("ensure-tenant-columns-sqlite.cjs"));
  if (ensure.status !== 0) {
    process.exit(ensure.status === null ? 1 : ensure.status);
  }

  const ensureUser = spawnNodeScript(
    pathToEnsure("ensure-user-telegram-phone-sqlite.cjs"),
  );
  if (ensureUser.status !== 0) {
    process.exit(ensureUser.status === null ? 1 : ensureUser.status);
  }

  const ensureDoctorExtra = spawnNodeScript(
    pathToEnsure("ensure-doctor-extra-columns-sqlite.cjs"),
  );
  if (ensureDoctorExtra.status !== 0) {
    process.exit(ensureDoctorExtra.status === null ? 1 : ensureDoctorExtra.status);
  }

  const ensureClinicPriceOverrides = spawnNodeScript(
    pathToEnsure("ensure-clinic-price-overrides-sqlite.cjs"),
  );
  if (ensureClinicPriceOverrides.status !== 0) {
    process.exit(
      ensureClinicPriceOverrides.status === null
        ? 1
        : ensureClinicPriceOverrides.status,
    );
  }

  const ensureRoleModuleAccess = spawnNodeScript(
    pathToEnsure("ensure-role-module-access-sqlite.cjs"),
  );
  if (ensureRoleModuleAccess.status !== 0) {
    process.exit(
      ensureRoleModuleAccess.status === null ? 1 : ensureRoleModuleAccess.status,
    );
  }
}

function shouldAutoActivateTenantDb() {
  return String(process.env.TENANT_DB_AUTO_ACTIVATE || "").trim() === "1";
}

if (shouldAutoActivateTenantDb()) {
  const tenantSlug =
    String(process.env.TENANT_SLUG || "").trim() ||
    String(process.env.CRM_DEFAULT_TENANT_SLUG || "").trim();
  const tenantDbUrl = String(process.env.TENANT_DATABASE_URL || "").trim();
  if (!tenantSlug || !tenantDbUrl) {
    console.error(
      "TENANT_DB_AUTO_ACTIVATE=1 требует TENANT_DATABASE_URL и TENANT_SLUG (или CRM_DEFAULT_TENANT_SLUG).",
    );
    process.exit(1);
  }
  const provision = spawnNodeScript(pathToEnsure("tenant-provision-db.cjs"), {
    TENANT_SLUG: tenantSlug,
    ACTIVATE: "1",
  });
  if (provision.status !== 0) {
    process.exit(provision.status === null ? 1 : provision.status);
  }
  console.log(`tenant routing auto-activated for slug="${tenantSlug}"`);
}

function shouldAutoMigrateAttachmentsToS3() {
  return String(process.env.ATTACHMENTS_MIGRATE_S3_ON_DEPLOY || "").trim() === "1";
}

if (shouldAutoMigrateAttachmentsToS3()) {
  const script = pathToEnsure("migrate-order-attachments-to-s3.cjs");
  if (!fs.existsSync(script)) {
    console.error("Не найден скрипт migrate-order-attachments-to-s3.cjs в выкладке.");
    process.exit(1);
  }
  const args = [];
  if (String(process.env.ATTACHMENTS_MIGRATE_S3_DRY_RUN || "").trim() === "1") {
    args.push("--dry-run");
  }
  const batch = String(process.env.ATTACHMENTS_MIGRATE_S3_BATCH || "").trim();
  if (batch) args.push(`--batch=${batch}`);
  const limit = String(process.env.ATTACHMENTS_MIGRATE_S3_LIMIT || "").trim();
  if (limit) args.push(`--limit=${limit}`);

  const ef = path.join(bundleRoot, ".env");
  const nodeArgs = [];
  if (fs.existsSync(ef)) {
    nodeArgs.push("--env-file", ef);
  }
  nodeArgs.push(script, ...args);

  console.log(
    `attachments->s3 auto-migrate: start (${args.length > 0 ? args.join(" ") : "default"})`,
  );
  const migrate = spawnSync(process.execPath, nodeArgs, {
    cwd: bundleRoot,
    stdio: "inherit",
    env: process.env,
    shell: false,
  });
  if (migrate.status !== 0) {
    process.exit(migrate.status === null ? 1 : migrate.status);
  }
  console.log("attachments->s3 auto-migrate: done");
}

function runOrderMailRulesOnDeploy() {
  const script = pathToEnsure("deploy-order-digitaldemon-mail-rules.cjs");
  if (!fs.existsSync(script)) {
    console.warn("[mail-rules] deploy-order-digitaldemon-mail-rules.cjs не найден, пропускаю.");
    return;
  }
  const runRules = spawnNodeScript(script, {
    MAIL_RULES_ORDER_SKIP_MISSING: process.env.MAIL_RULES_ORDER_SKIP_MISSING || "1",
  });
  if (runRules.status !== 0) {
    process.exit(runRules.status === null ? 1 : runRules.status);
  }
}

function runOneTimeMailResetBeforeRules() {
  if (String(process.env.MAIL_RESET_AUTORUN_DISABLE || "").trim() === "1") {
    console.warn("[mail-reset] автосброс почты отключён через MAIL_RESET_AUTORUN_DISABLE=1.");
    return;
  }
  const script = pathToEnsure("reset-mail-accounts.cjs");
  if (!fs.existsSync(script)) {
    console.warn("[mail-reset] reset-mail-accounts.cjs не найден, пропускаю.");
    return;
  }
  const reset = spawnNodeScript(script, {
    RESET_MAIL_ACCOUNTS_CONFIRM: "DELETE_ALL_MAIL",
  }, ["--auto-once"]);
  if (reset.status !== 0) {
    process.exit(reset.status === null ? 1 : reset.status);
  }
}

function runOneTimeMailSeenReconcile() {
  if (String(process.env.MAIL_SEEN_RECONCILE_AUTORUN_DISABLE || "").trim() === "1") {
    console.warn("[mail-seen] сверка read/unread отключена через MAIL_SEEN_RECONCILE_AUTORUN_DISABLE=1.");
    return;
  }
  const script = pathToEnsure("reconcile-mail-seen-from-imap.cjs");
  if (!fs.existsSync(script)) {
    console.warn("[mail-seen] reconcile-mail-seen-from-imap.cjs не найден, пропускаю.");
    return;
  }
  const reconcile = spawnNodeScript(script, {}, ["--auto-once"]);
  if (reconcile.status !== 0) {
    process.exit(reconcile.status === null ? 1 : reconcile.status);
  }
}

function runOneTimeKanbanClearLabMatchedDueDates() {
  if (String(process.env.KANBAN_CLEAR_STAGE_DUE_AUTORUN_DISABLE || "").trim() === "1") {
    console.warn(
      "[kanban-due] очистка этапных сроков отключена через KANBAN_CLEAR_STAGE_DUE_AUTORUN_DISABLE=1.",
    );
    return;
  }
  const script = pathToEnsure("clear-kanban-card-stage-due-dates.cjs");
  if (!fs.existsSync(script)) {
    console.warn("[kanban-due] clear-kanban-card-stage-due-dates.cjs не найден, пропускаю.");
    return;
  }
  const run = spawnNodeScript(script, {}, ["--auto-once"]);
  if (run.status !== 0) {
    process.exit(run.status === null ? 1 : run.status);
  }
}

function shouldSkipOptionalDeployHooks() {
  const flag = String(process.env.SKIP_DEPLOY_HOOKS || "").trim();
  if (flag === "1" || flag.toLowerCase() === "true") return true;
  const ci = String(process.env.CI || "").trim().toLowerCase();
  if (ci === "true" || ci === "1") return true;
  if (String(process.env.TW_CLOUD_BUILD || "").trim() === "1") return true;
  return false;
}

if (shouldSkipOptionalDeployHooks()) {
  console.log(
    "[migrate] post-deploy hooks пропущены (SKIP_DEPLOY_HOOKS / CI / TW_CLOUD_BUILD).",
  );
} else {
  runOneTimeMailResetBeforeRules();
  runOrderMailRulesOnDeploy();
  runOneTimeMailSeenReconcile();
  runOneTimeKanbanClearLabMatchedDueDates();
}

console.log("single db mode: OK.");
process.exit(0);
