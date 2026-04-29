/**
 * Удаление из БД «почти пустых» врачей (та же логика, что пропуск строк при импорте).
 * Не трогает: seed-doc-*, плейсхолдер переимпорта, врачей с нарядами или привязкой к клинике.
 *
 *   node --env-file=.env scripts/prune-sparse-doctors.cjs
 *   node --env-file=.env scripts/prune-sparse-doctors.cjs --dry-run
 *
 * npm run db:doctors:prune-sparse
 */

const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { isSparseSurnameOnlyRow } = require("./doctor-is-sparse.cjs");

const PLACEHOLDER_ID = "sys-placeholder-doctor-reimport";
const SEED_PREFIX = "seed-doc-";

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

function isProtectedId(id) {
  return (
    id === PLACEHOLDER_ID ||
    id.startsWith(SEED_PREFIX)
  );
}

function doctorToSparseCtx(d) {
  return {
    lastName: d.lastName,
    firstName: d.firstName,
    patronymic: d.patronymic,
    phone: d.phone,
    telegramUsername: d.telegramUsername,
    email: d.email,
    clinicWorkEmail: d.clinicWorkEmail,
    specialty: d.specialty,
    city: d.city,
    formerLastName: d.formerLastName,
    birthday: d.birthday,
    clinicRaw: "",
    familyCleaned: d.fullName || d.lastName || "",
  };
}

async function main() {
  loadEnvFallback();
  const dryRun = process.argv.includes("--dry-run");
  const prisma = new PrismaClient();

  try {
    const doctors = await prisma.doctor.findMany({
      where: {
        NOT: {
          OR: [
            { id: { startsWith: SEED_PREFIX } },
            { id: PLACEHOLDER_ID },
          ],
        },
      },
      select: {
        id: true,
        fullName: true,
        lastName: true,
        firstName: true,
        patronymic: true,
        phone: true,
        telegramUsername: true,
        email: true,
        clinicWorkEmail: true,
        specialty: true,
        city: true,
        formerLastName: true,
        birthday: true,
        _count: { select: { orders: true, clinicLinks: true } },
      },
    });

    const toDelete = [];
    for (const d of doctors) {
      if (isProtectedId(d.id)) continue;
      if (d._count.orders > 0) continue;
      if (d._count.clinicLinks > 0) continue;
      if (!isSparseSurnameOnlyRow(doctorToSparseCtx(d))) continue;
      toDelete.push(d);
    }

    console.log("[prune-sparse-doctors]", {
      всегоПроверено: doctors.length,
      кУдалению: toDelete.length,
      dryRun,
    });

    if (dryRun && toDelete.length <= 30) {
      console.log(
        "Примеры:",
        toDelete.map((d) => d.fullName || d.id).slice(0, 30),
      );
    }

    if (dryRun || toDelete.length === 0) {
      return;
    }

    const ids = toDelete.map((d) => d.id);
    const res = await prisma.doctor.deleteMany({ where: { id: { in: ids } } });
    console.log("[prune-sparse-doctors] удалено записей:", res.count);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
