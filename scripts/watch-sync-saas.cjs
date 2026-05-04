/**
 * Фоновое авто-обновление dental-crm-saas при сохранении файлов в лабе.
 * Запуск (отдельный терминал): npm run sync:saas:watch
 *
 * Переменные:
 *   SAAS_SYNC_DEBOUNCE_MS — пауза перед синком (по умолчанию 5000)
 *   DENTAL_CRM_SAAS_DIR — куда синкать
 *
 * Если установлен chokidar — точнее наблюдение; иначе встроенный fs.watch (Node 20+).
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const syncScript = path.join(__dirname, "sync-saas-from-lab.cjs");

const debounceMs = Math.max(
  500,
  parseInt(process.env.SAAS_SYNC_DEBOUNCE_MS || "5000", 10) || 5000,
);

let timer = null;
function scheduleSync() {
  clearTimeout(timer);
  timer = setTimeout(runSync, debounceMs);
}

function runSync() {
  console.log("\n[sync:saas:watch]", new Date().toISOString());
  const r = spawnSync(process.execPath, [syncScript], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    console.error("[sync:saas:watch] код выхода", r.status);
  }
}

function watchWithChokidar() {
  const chokidar = require("chokidar");
  const patterns = [
    "app",
    "components",
    "lib",
    "prisma",
    "public",
    "scripts",
    "types",
    "docs",
    "data",
    "middleware.ts",
    "next.config.ts",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "instrumentation.ts",
    "server.js",
    "prisma.config.ts",
    "vitest.config.ts",
    "postcss.config.mjs",
    "ecosystem.config.cjs",
  ].map((p) => path.join(ROOT, p));

  const watcher = chokidar.watch(patterns, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 400,
      pollInterval: 100,
    },
  });

  watcher.on("all", (event, filePath) => {
    if (event === "add" || event === "change" || event === "unlink") {
      const base = path.basename(filePath);
      if (/\.db(-journal)?$/i.test(base)) return;
      scheduleSync();
    }
  });

  console.log("Режим: chokidar");
}

/** Без зависимости chokidar — базовое наблюдение каталогов (Node fs.watch). */
function watchWithFs() {
  const dirs = [
    "app",
    "components",
    "lib",
    "prisma",
    "public",
    "scripts",
    "types",
    "docs",
    "data",
  ];

  for (const rel of dirs) {
    const d = path.join(ROOT, rel);
    if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) continue;
    try {
      fs.watch(
        d,
        { recursive: true },
        (_evt, fname) => {
          if (fname && /\.db(-journal)?$/i.test(fname)) return;
          scheduleSync();
        },
      );
    } catch (e) {
      console.warn("watch пропущен:", rel, e.message);
    }
  }

  const files = [
    "middleware.ts",
    "next.config.ts",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "instrumentation.ts",
    "server.js",
    "prisma.config.ts",
    "vitest.config.ts",
    "postcss.config.mjs",
    "ecosystem.config.cjs",
  ];
  for (const f of files) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    try {
      fs.watch(p, () => scheduleSync());
    } catch (e) {
      console.warn("watch пропущен:", f, e.message);
    }
  }

  console.log(
    "Режим: fs.watch (без chokidar). Для надёжности: npm install && npm run sync:saas:watch",
  );
}

try {
  require.resolve("chokidar");
  watchWithChokidar();
} catch {
  watchWithFs();
}

console.log(
  `Пауза ${debounceMs} мс после правок → зеркало SaaS (без *.db). Ctrl+C — выход.`,
);
