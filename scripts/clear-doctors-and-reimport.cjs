/**
 * Очистка импортированных врачей и повторный импорт из Excel.
 *
 * - Заказы, привязанные к удаляемым врачам, переводятся на служебную карточку
 *   (чтобы не нарушать обязательный doctorId в Order).
 * - По умолчанию сохраняются демо-врачи из seed (id начинается с seed-doc-).
 *
 * Запуск из корня проекта:
 *   node --env-file=.env scripts/clear-doctors-and-reimport.cjs
 *   node --env-file=.env scripts/clear-doctors-and-reimport.cjs путь/к/доктора.xlsx
 *   node --env-file=.env scripts/clear-doctors-and-reimport.cjs --dry-run
 *   node --env-file=.env scripts/clear-doctors-and-reimport.cjs --clear-only
 *   node --env-file=.env scripts/clear-doctors-and-reimport.cjs --no-keep-seed
 *
 * Переменная окружения DOCTORS_IMPORT_XLSX — абсолютный или относительный путь к Excel врачей.
 *
 * npm:
 *   npm run db:doctors:reimport
 *   npm run db:doctors:reimport -- --dry-run
 */

const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");
const {
  resolveDoctorXlsxAbs,
  formatMissingHelp,
} = require("./resolve-doctors-xlsx.cjs");

const PLACEHOLDER_DOCTOR_ID = "sys-placeholder-doctor-reimport";
const SEED_DOCTOR_ID_PREFIX = "seed-doc-";

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

function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run");
  const clearOnly = argv.includes("--clear-only");
  const keepSeed = !argv.includes("--no-keep-seed");
  const positional = argv.filter((a) => !a.startsWith("--"));
  const explicitXlsx = positional.find((a) => /\.xlsx$/i.test(a));
  return { dryRun, clearOnly, keepSeed, explicitXlsx };
}

async function ensurePlaceholderDoctor(prisma) {
  await prisma.doctor.upsert({
    where: { id: PLACEHOLDER_DOCTOR_ID },
    create: {
      id: PLACEHOLDER_DOCTOR_ID,
      fullName: "— Врач не задан (заказы после сброса справочника)",
      lastName: null,
      firstName: null,
      patronymic: null,
      phone: null,
      preferredContact: null,
      telegramUsername: null,
      acceptsPrivatePractice: false,
    },
    update: {},
  });
}

function isPreservedDoctorId(id, keepSeed) {
  if (id === PLACEHOLDER_DOCTOR_ID) return true;
  if (keepSeed && id.startsWith(SEED_DOCTOR_ID_PREFIX)) return true;
  return false;
}

async function main() {
  loadEnvFallback();
  const argv = process.argv.slice(2);
  const { dryRun, clearOnly, keepSeed, explicitXlsx } = parseArgs(argv);

  const absXlsx = resolveDoctorXlsxAbs(process.cwd(), explicitXlsx);
  if (!dryRun && !clearOnly && !fs.existsSync(absXlsx)) {
    console.error("[clear-doctors]", formatMissingHelp(absXlsx));
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const all = await prisma.doctor.findMany({ select: { id: true, fullName: true } });
    const toRemove = all.filter((d) => !isPreservedDoctorId(d.id, keepSeed));
    const removeIds = toRemove.map((d) => d.id);

    const orderCount =
      removeIds.length === 0
        ? 0
        : await prisma.order.count({
            where: { doctorId: { in: removeIds } },
          });

    const linkCount =
      removeIds.length === 0
        ? 0
        : await prisma.doctorOnClinic.count({
            where: { doctorId: { in: removeIds } },
          });

    console.log("[clear-doctors] план:", {
      всегоВрачей: all.length,
      будетУдалено: toRemove.length,
      связейВрачКлиника: linkCount,
      нарядовПереназначить: orderCount,
      dryRun,
      keepSeed,
      clearOnly,
      файлИмпорта: absXlsx,
      файлНайден: fs.existsSync(absXlsx),
    });

    if (dryRun) {
      if (toRemove.length <= 20) {
        console.log("[clear-doctors] к удалению:", toRemove.map((d) => d.fullName || d.id));
      }
      return;
    }

    if (toRemove.length === 0) {
      console.log("[clear-doctors] нечего удалять.");
    } else {
      await ensurePlaceholderDoctor(prisma);

      const re = await prisma.order.updateMany({
        where: { doctorId: { in: removeIds } },
        data: { doctorId: PLACEHOLDER_DOCTOR_ID },
      });

      await prisma.doctor.deleteMany({
        where: { id: { in: removeIds } },
      });

      console.log("[clear-doctors] готово:", {
        удаленоВрачей: toRemove.length,
        нарядовПереназначено: re.count,
      });
    }

    if (clearOnly) {
      console.log("[clear-doctors] импорт пропущен (--clear-only).");
      return;
    }

    console.log("[clear-doctors] импорт врачей из", absXlsx);
    execSync(
      `node --env-file=.env scripts/import-doctors-xlsx.cjs ${JSON.stringify(absXlsx)}`,
      {
        cwd: process.cwd(),
        stdio: "inherit",
        env: process.env,
        shell: true,
      },
    );
    console.log("[clear-doctors] переимпорт завершён.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
