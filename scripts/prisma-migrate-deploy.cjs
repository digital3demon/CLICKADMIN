/**
 * `prisma migrate deploy` для текущего datasource.
 * Важно: вызываем `npx prisma@<версия>`, а не `npx prisma` — иначе npx подтянет Prisma 7+,
 * где datasource `url` в schema.prisma убран (P1012), а проект на Prisma 6.
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

/** Node с абсолютным --env-file и shell:false — иначе путь с пробелом (кириллица) ломается при shell:true. */
function spawnNodeScript(scriptPath) {
  const args = [];
  const ef = path.join(bundleRoot, ".env");
  if (fs.existsSync(ef)) {
    args.push("--env-file", ef);
  }
  args.push(scriptPath);
  return spawnSync(process.execPath, args, {
    cwd: bundleRoot,
    stdio: "inherit",
    env: process.env,
    shell: false,
  });
}

const r = spawnSync(
  "npx",
  [
    "-y",
    prismaSpec,
    "migrate",
    "deploy",
    "--schema=prisma/schema.prisma",
  ],
  {
    cwd: bundleRoot,
    stdio: "inherit",
    env: process.env,
    shell: isWin,
  },
);

if (r.status !== 0) {
  process.exit(r.status === null ? 1 : r.status);
}

/** Без generate клиент Prisma в node_modules не совпадает с БД после migrate — P2022 и т.п. в UI */
function runPrismaGenerate() {
  return spawnSync(
    "npx",
    ["-y", prismaSpec, "generate", "--schema=prisma/schema.prisma"],
    {
      cwd: bundleRoot,
      stdio: "inherit",
      env: process.env,
      shell: isWin,
    },
  );
}

function runPrismaDbPush(schemaPath, label) {
  console.log(`db push (${label})...`);
  return spawnSync(
    "npx",
    ["-y", prismaSpec, "db", "push", `--schema=${schemaPath}`, "--skip-generate"],
    {
      cwd: bundleRoot,
      stdio: "inherit",
      env: process.env,
      shell: isWin,
    },
  );
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

const pricingUrl = process.env.PRICING_DATABASE_URL?.trim() || "";
const ordersUrl = process.env.ORDERS_DATABASE_URL?.trim() || "";
const clientsUrl = process.env.CLIENTS_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || "";

if (pricingUrl && pricingUrl !== clientsUrl) {
  const rPricing = runPrismaDbPush("prisma/pricing/schema.prisma", "pricing");
  if (rPricing.status !== 0) {
    process.exit(rPricing.status === null ? 1 : rPricing.status);
  }
  if (String(process.env.SPLIT_COPY_PRICING_FROM_CLIENTS || "").trim() === "1") {
    const copyPricing = spawnNodeScript(
      pathToEnsure("split-copy-pricing-from-clients.cjs"),
    );
    if (copyPricing.status !== 0) {
      process.exit(copyPricing.status === null ? 1 : copyPricing.status);
    }
  }
}

if (ordersUrl && ordersUrl !== clientsUrl) {
  const rOrders = runPrismaDbPush("prisma/orders/schema.prisma", "orders");
  if (rOrders.status !== 0) {
    process.exit(rOrders.status === null ? 1 : rOrders.status);
  }
  if (String(process.env.SPLIT_COPY_ORDERS_FROM_CLIENTS || "").trim() === "1") {
    const copyOrders = spawnNodeScript(
      pathToEnsure("split-copy-orders-from-clients.cjs"),
    );
    if (copyOrders.status !== 0) {
      process.exit(copyOrders.status === null ? 1 : copyOrders.status);
    }
  }
}

console.log("split db sync: OK.");
process.exit(0);
