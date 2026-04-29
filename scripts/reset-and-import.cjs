/**
 * Полная очистка БД и перезагрузка «с нуля»:
 *   1) prisma db push --force-reset — SQLite к актуальной схеме (у db push в новых Prisma нет --skip-generate)
 *   2) prisma generate — клиент; на Windows при ошибке EPERM закройте dev, Studio, лишние Node
 *   3) prisma db seed
 *   4) (опционально) импорт клиник/врачей из .xlsx
 *
 * Почему не «migrate reset»: цепочка миграций в репозитории расходится с текущей схемой (старый init,
 * пустая миграция clinic_requisites), после reset БД не совпадает с Prisma Client → seed падает
 * (например, нет колонки Clinic.isActive). db push всегда приводит SQLite к актуальной схеме.
 *
 * Запуск из корня проекта:
 *   node --env-file=.env scripts/reset-and-import.cjs
 *   node --env-file=.env scripts/reset-and-import.cjs путь/к/файлу.xlsx
 *   node --env-file=.env scripts/reset-and-import.cjs --no-import
 *   node --env-file=.env scripts/reset-and-import.cjs --no-import   # push + generate + seed
 *
 * Путь к Excel по умолчанию: data/imports/1.xlsx или переменная окружения CLINICS_IMPORT_XLSX.
 *
 * npm:
 *   npm run db:reset:import
 *   npm run db:reset:import -- C:\path\to\file.xlsx
 *   npm run db:reset        # без импорта
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function runGenerateOrExplain(cwd) {
  console.log("\n— prisma generate (обновление query engine)…\n");
  try {
    execSync("npx prisma generate", {
      cwd,
      stdio: "inherit",
      env: process.env,
      shell: true,
    });
  } catch {
    console.error(`
[!] prisma generate завершился с ошибкой (часто EPERM на Windows: DLL занят другим процессом).

  Что сделать:
  1) Остановите: npm run dev, Prisma Studio, другие node-процессы в этом каталоге.
  2) Закройте лишние окна терминала в Cursor/VS Code.
  3) Снова: npx prisma generate
  4) Затем при необходимости: npx prisma db seed

База после db push уже совпадает со схемой — проблема только в замене файла в node_modules/.prisma/
`);
    process.exit(1);
  }
}

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

function main() {
  loadEnvFallback();
  const cwd = process.cwd();
  const noImport = process.argv.includes("--no-import");
  const positional = process.argv.slice(2).filter((a) => a !== "--no-import");
  const xlsxArg =
    positional.find((a) => !a.startsWith("-")) ||
    process.env.CLINICS_IMPORT_XLSX ||
    path.join("data", "imports", "1.xlsx");

  console.log(
    "— Шаг 1/4: prisma db push --force-reset --accept-data-loss (схема БД)…\n",
  );
  try {
    execSync(
      "npx prisma db push --force-reset --accept-data-loss",
      {
        cwd,
        stdio: "inherit",
        env: process.env,
        shell: true,
      },
    );
  } catch {
    process.exit(1);
  }

  runGenerateOrExplain(cwd);

  console.log("\n— Шаг 3/4: prisma db seed…\n");
  try {
    execSync("npx prisma db seed", {
      cwd,
      stdio: "inherit",
      env: process.env,
      shell: true,
    });
  } catch {
    process.exit(1);
  }

  if (noImport) {
    console.log("\n— Шаг 4/4: импорт пропущен (--no-import). Готово.");
    return;
  }

  const abs = path.isAbsolute(xlsxArg) ? xlsxArg : path.join(cwd, xlsxArg);
  if (!fs.existsSync(abs)) {
    console.warn(
      "\n— Шаг 4/4: файл импорта не найден, пропуск:",
      abs,
      "\n  Подложите Excel в data/imports/1.xlsx или укажите путь / CLINICS_IMPORT_XLSX.",
    );
    return;
  }

  console.log("\n— Шаг 4/4: импорт клиник из", abs, "…\n");
  const quoted = JSON.stringify(abs);
  try {
    execSync(`node --env-file=.env scripts/import-clinics-xlsx.cjs ${quoted}`, {
      cwd,
      stdio: "inherit",
      env: process.env,
      shell: true,
    });
  } catch {
    process.exit(1);
  }

  console.log("\nГотово: БД сброшена, seed выполнен, импорт завершён.");
}

main();
