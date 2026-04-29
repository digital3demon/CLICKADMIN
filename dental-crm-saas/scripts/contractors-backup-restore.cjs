/**
 * Резервная копия и восстановление контрагентов (клиники, врачи, связи M:N,
 * ручные отвязки DoctorClinicLinkSuppression, журнал ContractorRevision).
 *
 * НЕ сохраняет наряды, склад, прайс и т.д. — только карточки клиентов/врачей.
 * Прайс отдельно: npm run db:price:export / db:price:import или import:price (Excel).
 *
 * ---------------------------------------------------------------------------
 * ШАГ 1. Сделать снимок (пока база ещё «живая»)
 * ---------------------------------------------------------------------------
 *   cd папка_проекта_dental-lab-crm
 *   npm run db:contractors:export
 *
 * Файл по умолчанию: data/backup/contractors-snapshot.json
 * Свой путь:
 *   npm run db:contractors:export -- data/backup/moi-klienty.json
 *
 * ---------------------------------------------------------------------------
 * ШАГ 2. Починить миграции — в базе ОБЯЗАТЕЛЬНО должны появиться таблицы
 * ---------------------------------------------------------------------------
 *   npx prisma migrate reset --skip-seed
 *
 *   Дождитесь успешного конца команды (без ошибки). Если reset не проходит,
 *   попробуйте: npx prisma migrate dev
 *
 *   --skip-seed важен, если потом хотите полностью заменить клиник/врачей из
 *   снимка. Если запустить сид, в БД появятся демо-наряды — тогда полная
 *   замена контрагентов скриптом заблокирована (защита от поломки FK).
 *
 *   После reset при необходимости:
 *   npx prisma generate
 *
 *   Без таблиц Clinic/Doctor импорт остановится с подсказкой — сначала миграции.
 *
 *   Если импорт падает с «column does not exist» (например isActive): миграции в
 *   репозитории не полностью совпадают со схемой — подтяните SQLite к schema.prisma:
 *     npm run db:sync
 *   (это prisma db push), затем снова импорт.
 *
 * ---------------------------------------------------------------------------
 * ШАГ 3. Вернуть клиник и врачей из файла
 * ---------------------------------------------------------------------------
 *   Полная замена (в БД не должно быть ни одного наряда):
 *   npm run db:contractors:import -- --wipe-first
 *
 *   Только добавить/обновить записи из файла, ничего не удаляя:
 *   npm run db:contractors:import
 *
 *   Указать файл:
 *   npm run db:contractors:import -- --wipe-first data/backup/moi-klienty.json
 *
 * ---------------------------------------------------------------------------
 * Если после reset вы ЗАПУСТИЛИ сид (есть наряды) — используйте импорт БЕЗ
 * --wipe-first: он сделает upsert клиник/врачей и добавит недостающие связи.
 * ---------------------------------------------------------------------------
 */

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const SNAPSHOT_VERSION = 1;
const DEFAULT_OUT = path.join("data", "backup", "contractors-snapshot.json");

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
  const args = argv.slice(2);
  const cmd = args[0];
  const flags = new Set();
  const pos = [];
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--wipe-first") flags.add("wipe-first");
    else if (!args[i].startsWith("-")) pos.push(args[i]);
  }
  return { cmd, flags, filePath: pos[0] || null };
}

function iso(d) {
  if (d == null) return null;
  if (d instanceof Date) return d.toISOString();
  return new Date(d).toISOString();
}

function parseDate(s) {
  if (s == null || s === "") return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Имена таблиц = как в SQLite (как в schema Prisma). */
const SQLITE_TABLES = {
  clinic: "Clinic",
  doctor: "Doctor",
  doctorOnClinic: "DoctorOnClinic",
  contractorRevision: "ContractorRevision",
  linkSuppression: "DoctorClinicLinkSuppression",
  order: "Order",
};

async function sqliteTableExists(prisma, tableName) {
  const allowed = new Set(Object.values(SQLITE_TABLES));
  if (!allowed.has(tableName)) return false;
  try {
    const rows = await prisma.$queryRaw`
      SELECT 1
      FROM sqlite_master
      WHERE type = 'table' AND name = ${tableName}
      LIMIT 1
    `;
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

function clinicPayload(row) {
  return {
    name: row.name,
    address: row.address ?? null,
    isActive: Boolean(row.isActive),
    notes: row.notes ?? null,
    legalFullName: row.legalFullName ?? null,
    legalAddress: row.legalAddress ?? null,
    inn: row.inn ?? null,
    kpp: row.kpp ?? null,
    ogrn: row.ogrn ?? null,
    bankName: row.bankName ?? null,
    bik: row.bik ?? null,
    settlementAccount: row.settlementAccount ?? null,
    correspondentAccount: row.correspondentAccount ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    ceoName: row.ceoName ?? null,
    worksWithReconciliation: Boolean(row.worksWithReconciliation),
    reconciliationFrequency:
      row.reconciliationFrequency === "MONTHLY_2"
        ? "MONTHLY_2"
        : row.reconciliationFrequency === "MONTHLY_1"
          ? "MONTHLY_1"
          : null,
    contractSigned: Boolean(row.contractSigned),
    contractNumber: row.contractNumber ?? null,
    worksWithEdo: Boolean(row.worksWithEdo),
    billingLegalForm: row.billingLegalForm ?? null,
    createdAt: parseDate(row.createdAt) ?? undefined,
    deletedAt: parseDate(row.deletedAt),
  };
}

function doctorPayload(row) {
  return {
    fullName: row.fullName,
    lastName: row.lastName ?? null,
    firstName: row.firstName ?? null,
    patronymic: row.patronymic ?? null,
    formerLastName: row.formerLastName ?? null,
    specialty: row.specialty ?? null,
    city: row.city ?? null,
    email: row.email ?? null,
    clinicWorkEmail: row.clinicWorkEmail ?? null,
    phone: row.phone ?? null,
    preferredContact: row.preferredContact ?? null,
    telegramUsername: row.telegramUsername ?? null,
    birthday: parseDate(row.birthday),
    particulars: row.particulars ?? null,
    acceptsPrivatePractice: Boolean(row.acceptsPrivatePractice),
    createdAt: parseDate(row.createdAt) ?? undefined,
    deletedAt: parseDate(row.deletedAt),
  };
}

async function exportSnapshot(prisma, outFile) {
  let clinics = [];
  let doctors = [];
  let doctorOnClinic = [];
  let contractorRevisions = [];
  let doctorClinicLinkSuppression = [];

  if (await sqliteTableExists(prisma, SQLITE_TABLES.clinic)) {
    clinics = await prisma.clinic.findMany({ orderBy: { name: "asc" } });
  } else {
    console.warn(
      "[!] Таблицы Clinic нет — снимок клиник будет пустым (нужен npx prisma migrate dev).",
    );
  }

  if (await sqliteTableExists(prisma, SQLITE_TABLES.doctor)) {
    doctors = await prisma.doctor.findMany({ orderBy: { fullName: "asc" } });
  } else {
    console.warn(
      "[!] Таблицы Doctor нет — снимок врачей будет пустым (нужен npx prisma migrate dev).",
    );
  }

  if (await sqliteTableExists(prisma, SQLITE_TABLES.doctorOnClinic)) {
    doctorOnClinic = await prisma.doctorOnClinic.findMany();
  } else {
    console.warn(
      "[!] Таблицы DoctorOnClinic нет — связи врач–клиника в снимке пустые.",
    );
  }

  if (await sqliteTableExists(prisma, SQLITE_TABLES.contractorRevision)) {
    contractorRevisions = await prisma.contractorRevision.findMany({
      orderBy: { createdAt: "asc" },
    });
  } else {
    console.warn(
      "[!] Таблицы ContractorRevision нет — история изменений контрагентов в снимке пустая.",
    );
  }

  if (await sqliteTableExists(prisma, SQLITE_TABLES.linkSuppression)) {
    doctorClinicLinkSuppression =
      await prisma.doctorClinicLinkSuppression.findMany();
  } else {
    console.warn(
      "[!] Таблицы DoctorClinicLinkSuppression нет — подавления связей в снимке пустые.",
    );
  }

  const snapshot = {
    v: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    clinics: clinics.map((c) => ({
      ...c,
      createdAt: iso(c.createdAt),
      deletedAt: iso(c.deletedAt),
    })),
    doctors: doctors.map((d) => ({
      ...d,
      birthday: iso(d.birthday),
      createdAt: iso(d.createdAt),
      deletedAt: iso(d.deletedAt),
    })),
    doctorOnClinic,
    doctorClinicLinkSuppression: doctorClinicLinkSuppression.map((s) => ({
      ...s,
      createdAt: iso(s.createdAt),
    })),
    contractorRevisions: contractorRevisions.map((r) => ({
      id: r.id,
      createdAt: iso(r.createdAt),
      actorLabel: r.actorLabel,
      kind: r.kind,
      clinicId: r.clinicId,
      doctorId: r.doctorId,
      summary: r.summary,
      details: r.details,
    })),
  };

  const dir = path.dirname(outFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(
    `[OK] Снимок сохранён: ${outFile}\n` +
      `     клиник: ${clinics.length}, врачей: ${doctors.length}, ` +
      `связей врач–клиника: ${doctorOnClinic.length}, ` +
      `подавлений связи: ${doctorClinicLinkSuppression.length}, ` +
      `записей истории: ${contractorRevisions.length}`,
  );
}

async function wipeContractors(prisma) {
  const t = {
    rev: await sqliteTableExists(prisma, SQLITE_TABLES.contractorRevision),
    sup: await sqliteTableExists(prisma, SQLITE_TABLES.linkSuppression),
    link: await sqliteTableExists(prisma, SQLITE_TABLES.doctorOnClinic),
    clinic: await sqliteTableExists(prisma, SQLITE_TABLES.clinic),
    doctor: await sqliteTableExists(prisma, SQLITE_TABLES.doctor),
  };

  const any = t.rev || t.sup || t.link || t.clinic || t.doctor;
  if (!any) {
    console.warn(
      "[!] В базе нет таблиц контрагентов — нечего очищать (wipe пропущен).",
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (t.rev) await tx.contractorRevision.deleteMany({});
    if (t.sup) await tx.doctorClinicLinkSuppression.deleteMany({});
    if (t.link) await tx.doctorOnClinic.deleteMany({});
    if (t.clinic) await tx.clinic.deleteMany({});
    if (t.doctor) await tx.doctor.deleteMany({});
  });
}

async function importSnapshot(prisma, filePath, wipeFirst) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  if (data.v !== SNAPSHOT_VERSION) {
    console.warn(
      `[!] Версия снимка ${data.v}, ожидалась ${SNAPSHOT_VERSION}. Продолжаю с осторожностью.`,
    );
  }

  const hasClinicTbl = await sqliteTableExists(prisma, SQLITE_TABLES.clinic);
  const hasDoctorTbl = await sqliteTableExists(prisma, SQLITE_TABLES.doctor);
  if (!hasClinicTbl || !hasDoctorTbl) {
    console.error(
      "\n[ОШИБКА] В базе нет таблиц Clinic и/или Doctor — импорт невозможен.\n\n" +
        "  Сначала примените миграции (создадутся все таблицы):\n" +
        "    npx prisma migrate dev\n" +
        "  или после сброса:\n" +
        "    npx prisma migrate reset --skip-seed\n\n" +
        "  Затем снова:\n" +
        "    npm run db:contractors:import -- --wipe-first\n",
    );
    process.exit(1);
  }

  let orderCount = 0;
  if (await sqliteTableExists(prisma, SQLITE_TABLES.order)) {
    orderCount = await prisma.order.count();
  }
  if (wipeFirst && orderCount > 0) {
    console.error(
      "\n[ОШИБКА] В базе есть наряды — полная замена контрагентов опасна (внешние ключи).\n\n" +
        "  Варианты:\n" +
        "  • Импорт без удаления:  npm run db:contractors:import -- путь/к/файлу.json\n" +
        "  • Или сброс без сида, затем импорт с --wipe-first:\n" +
        "      npx prisma migrate reset --skip-seed\n" +
        "      npm run db:contractors:import -- --wipe-first путь/к/файлу.json\n",
    );
    process.exit(1);
  }

  if (wipeFirst) {
    console.log("— Удаляю всех клиник, врачей и связанные записи контрагентов…");
    await wipeContractors(prisma);
  }

  const clinics = data.clinics || [];
  const doctors = data.doctors || [];
  const links = data.doctorOnClinic || [];
  const suppressions = data.doctorClinicLinkSuppression || [];
  const revisions = data.contractorRevisions || [];

  console.log(`— Клиники: ${clinics.length}, врачи: ${doctors.length}`);

  for (const row of clinics) {
    const payload = clinicPayload(row);
    await prisma.clinic.upsert({
      where: { id: row.id },
      create: { id: row.id, ...payload },
      update: { ...payload },
    });
  }

  for (const row of doctors) {
    const payload = doctorPayload(row);
    await prisma.doctor.upsert({
      where: { id: row.id },
      create: { id: row.id, ...payload },
      update: { ...payload },
    });
  }

  if (links.length) {
    if (await sqliteTableExists(prisma, SQLITE_TABLES.doctorOnClinic)) {
      const res = await prisma.doctorOnClinic.createMany({
        data: links.map((l) => ({
          doctorId: l.doctorId,
          clinicId: l.clinicId,
        })),
        skipDuplicates: true,
      });
      console.log(
        `— Связи врач–клиника: добавлено (новых строк): ${res.count}`,
      );
    } else {
      console.warn(
        "[!] Таблицы DoctorOnClinic нет — связи из снимка не загружены.",
      );
    }
  }

  if (suppressions.length) {
    if (await sqliteTableExists(prisma, SQLITE_TABLES.linkSuppression)) {
      for (const s of suppressions) {
        await prisma.doctorClinicLinkSuppression.upsert({
          where: {
            doctorId_clinicId: {
              doctorId: s.doctorId,
              clinicId: s.clinicId,
            },
          },
          create: {
            doctorId: s.doctorId,
            clinicId: s.clinicId,
            createdAt: parseDate(s.createdAt) ?? undefined,
          },
          update: {},
        });
      }
      console.log(`— Подавления связей: ${suppressions.length}`);
    } else {
      console.warn(
        `[!] В снимке ${suppressions.length} записей подавления связей, но таблицы DoctorClinicLinkSuppression в БД нет — пропуск (сначала npx prisma migrate dev).`,
      );
    }
  }

  if (revisions.length) {
    if (await sqliteTableExists(prisma, SQLITE_TABLES.contractorRevision)) {
      const res = await prisma.contractorRevision.createMany({
        data: revisions.map((r) => ({
          id: r.id,
          createdAt: parseDate(r.createdAt) ?? new Date(),
          actorLabel: r.actorLabel,
          kind: r.kind,
          clinicId: r.clinicId ?? null,
          doctorId: r.doctorId ?? null,
          summary: r.summary,
          details: r.details === undefined ? undefined : r.details,
        })),
        skipDuplicates: true,
      });
      console.log(
        `— История контрагентов: добавлено (новых строк): ${res.count}`,
      );
    } else {
      console.warn(
        `[!] Таблицы ContractorRevision нет — ${revisions.length} записей истории из снимка пропущены.`,
      );
    }
  }

  console.log("\n[OK] Импорт контрагентов завершён.");
}

async function main() {
  loadEnvFallback();
  const { cmd, flags, filePath } = parseArgs(process.argv);
  const outFile = path.resolve(process.cwd(), filePath || DEFAULT_OUT);
  const prisma = new PrismaClient();

  try {
    if (cmd === "export") {
      await exportSnapshot(prisma, outFile);
    } else if (cmd === "import") {
      if (!fs.existsSync(outFile)) {
        console.error(`[ОШИБКА] Файл не найден: ${outFile}`);
        process.exit(1);
      }
      await importSnapshot(prisma, outFile, flags.has("wipe-first"));
    } else {
      console.log(`Использование:
  npm run db:contractors:export [-- путь/к/файлу.json]
  npm run db:contractors:import [-- --wipe-first] [-- путь/к/файлу.json]

Подробные шаги см. в начале файла scripts/contractors-backup-restore.cjs`);
      process.exit(cmd ? 1 : 0);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
