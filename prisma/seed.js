const { PrismaClient, OrderStatus, ConstructionCategory, JawArch } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

/** Совпадает с `lib/tenant-constants.ts` и `scripts/backfill-tenant-ids.cjs` */
const DEFAULT_TENANT_ID = "cltenantdefault0000000000";

/** Календарный «сегодня» по Москве (как в отгрузках). */
function moscowTodayYmd() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addCalendarDaysYmd(ymd, delta) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) throw new Error(`INVALID_YMD: ${ymd}`);
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  const dt = new Date(Date.UTC(y, mo - 1, d + delta));
  const y2 = dt.getUTCFullYear();
  const m2 = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d2 = String(dt.getUTCDate()).padStart(2, "0");
  return `${y2}-${m2}-${d2}`;
}

/** Полдень по календарной дате МСК (для dueDate в демо-отгрузках). */
function moscowNoonOnYmd(ymd) {
  return new Date(`${ymd}T12:00:00+03:00`);
}

async function main() {
  await prisma.tenant.upsert({
    where: { id: DEFAULT_TENANT_ID },
    create: {
      id: DEFAULT_TENANT_ID,
      slug: "default",
      name: "Организация (seed)",
      plan: "ULTRA",
      addonKanban: true,
    },
    update: {
      plan: "ULTRA",
      addonKanban: true,
    },
  });

  const clinic = await prisma.clinic.upsert({
    where: { id: "seed-clinic-klinikaklik" },
    update: {
      name: "КлиникаКлик",
      address: "Спб, Улица Тест, дом1",
      tenantId: DEFAULT_TENANT_ID,
    },
    create: {
      id: "seed-clinic-klinikaklik",
      tenantId: DEFAULT_TENANT_ID,
      name: "КлиникаКлик",
      address: "Спб, Улица Тест, дом1",
    },
  });

  const doctorsData = [
    {
      id: "seed-doc-ivanov",
      fullName: "Иванов И.И.",
      phone: "+7 900 111-22-33",
      preferredContact: "Telegram",
      telegramUsername: "ivanov_ortho",
      birthday: new Date("1985-03-15T00:00:00.000Z"),
      particulars: null,
      acceptsPrivatePractice: false,
    },
    {
      id: "seed-doc-sergeeva",
      fullName: "Сергеева А.В.",
      phone: null,
      preferredContact: "WhatsApp",
      telegramUsername: null,
      birthday: null,
      particulars: "Предпочитает связь после 14:00",
      acceptsPrivatePractice: true,
    },
  ];

  for (const d of doctorsData) {
    const { id, fullName, ...rest } = d;
    await prisma.doctor.upsert({
      where: { id },
      update: { fullName, ...rest, tenantId: DEFAULT_TENANT_ID },
      create: { id, fullName, tenantId: DEFAULT_TENANT_ID, ...rest },
    });
    await prisma.doctorOnClinic.upsert({
      where: {
        doctorId_clinicId: { doctorId: id, clinicId: clinic.id },
      },
      update: {},
      create: { doctorId: id, clinicId: clinic.id },
    });
  }

  await prisma.doctor.upsert({
    where: { id: "seed-doc-private" },
    update: {
      fullName: "Петров П.П.",
      acceptsPrivatePractice: true,
      phone: "+7 900 444-55-66",
      preferredContact: "Звонок",
      telegramUsername: null,
      birthday: new Date("1990-07-01T00:00:00.000Z"),
      particulars: "Только частная практика в демо-данных",
      tenantId: DEFAULT_TENANT_ID,
    },
    create: {
      id: "seed-doc-private",
      tenantId: DEFAULT_TENANT_ID,
      fullName: "Петров П.П.",
      acceptsPrivatePractice: true,
      phone: "+7 900 444-55-66",
      preferredContact: "Звонок",
      telegramUsername: null,
      birthday: new Date("1990-07-01T00:00:00.000Z"),
      particulars: "Только частная практика в демо-данных",
    },
  });

  const crownType = await prisma.constructionType.upsert({
    where: { id: "seed-type-crown" },
    update: { name: "Коронка (полная анатомия)", isArchWork: false },
    create: {
      id: "seed-type-crown",
      name: "Коронка (полная анатомия)",
      code: "CROWN_FULL",
      isArchWork: false,
    },
  });

  const splintType = await prisma.constructionType.upsert({
    where: { id: "seed-type-splint" },
    update: { name: "Сплинт", isArchWork: true },
    create: {
      id: "seed-type-splint",
      name: "Сплинт",
      code: "SPLINT",
      isArchWork: true,
    },
  });

  await prisma.constructionType.upsert({
    where: { id: "seed-type-overlay" },
    update: { name: "Накладка", isArchWork: false },
    create: {
      id: "seed-type-overlay",
      name: "Накладка",
      code: "OVERLAY",
      isArchWork: false,
    },
  });

  await prisma.constructionType.upsert({
    where: { id: "seed-type-veneer" },
    update: { name: "Винир", isArchWork: false },
    create: {
      id: "seed-type-veneer",
      name: "Винир",
      code: "VENEER",
      isArchWork: false,
    },
  });

  const zirconia = await prisma.material.upsert({
    where: { id: "seed-mat-zro2" },
    update: { name: "Диоксид циркония" },
    create: { id: "seed-mat-zro2", name: "Диоксид циркония" },
  });

  const todayYmd = moscowTodayYmd();
  const tomorrowYmd = addCalendarDaysYmd(todayYmd, 1);
  const dueTodayMsk = moscowNoonOnYmd(todayYmd);
  const dueTomorrowMsk = moscowNoonOnYmd(tomorrowYmd);

  await prisma.order.upsert({
    where: {
      tenantId_orderNumber: {
        tenantId: DEFAULT_TENANT_ID,
        orderNumber: "00000002",
      },
    },
    update: { dueDate: dueTomorrowMsk, appointmentDate: dueTomorrowMsk },
    create: {
      tenantId: DEFAULT_TENANT_ID,
      orderNumber: "00000002",
      clinicId: null,
      doctorId: "seed-doc-private",
      patientName: "Демо: частное лицо",
      status: OrderStatus.REVIEW,
      dueDate: dueTomorrowMsk,
      appointmentDate: dueTomorrowMsk,
      constructions: {
        create: [
          {
            category: ConstructionCategory.FIXED,
            constructionTypeId: crownType.id,
            materialId: zirconia.id,
            shade: "B1",
            teethFdi: ["11"],
            sortOrder: 0,
          },
        ],
      },
    },
  });

  const demoOrder = await prisma.order.upsert({
    where: {
      tenantId_orderNumber: {
        tenantId: DEFAULT_TENANT_ID,
        orderNumber: "00000001",
      },
    },
    update: { dueDate: dueTodayMsk, appointmentDate: dueTodayMsk },
    create: {
      tenantId: DEFAULT_TENANT_ID,
      orderNumber: "00000001",
      clinicId: clinic.id,
      doctorId: doctorsData[0].id,
      patientName: null,
      status: OrderStatus.IN_PROGRESS,
      dueDate: dueTodayMsk,
      appointmentDate: dueTodayMsk,
      constructions: {
        create: [
          {
            category: ConstructionCategory.FIXED,
            constructionTypeId: crownType.id,
            materialId: zirconia.id,
            shade: "A2",
            teethFdi: ["14", "15", "16", "17", "18"],
            sortOrder: 0,
          },
          {
            category: ConstructionCategory.ARCH,
            constructionTypeId: splintType.id,
            arch: JawArch.UPPER,
            sortOrder: 1,
          },
          {
            category: ConstructionCategory.BRIDGE,
            bridgeFromFdi: "47",
            bridgeToFdi: "37",
            sortOrder: 2,
          },
          {
            category: ConstructionCategory.FIXED,
            constructionTypeId: crownType.id,
            teethFdi: ["54", "64"],
            sortOrder: 3,
          },
        ],
      },
    },
  });

  const seedOwnerEmail = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
  const seedOwnerPassword = process.env.SEED_OWNER_PASSWORD;
  const seedOwnerName =
    process.env.SEED_OWNER_DISPLAY_NAME?.trim() || "Владелец (seed)";
  if (seedOwnerEmail && seedOwnerPassword && seedOwnerPassword.length >= 8) {
    const passwordHash = await bcrypt.hash(seedOwnerPassword, 10);
    await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: DEFAULT_TENANT_ID,
          email: seedOwnerEmail,
        },
      },
      update: {
        displayName: seedOwnerName,
        role: "OWNER",
        passwordHash,
        inviteCodeHash: null,
      },
      create: {
        tenantId: DEFAULT_TENANT_ID,
        email: seedOwnerEmail,
        displayName: seedOwnerName,
        role: "OWNER",
        passwordHash,
        inviteCodeHash: null,
      },
    });
    console.log("Seed: владелец upsert по SEED_OWNER_EMAIL:", seedOwnerEmail);
  }

  console.log("Seed OK:", {
    clinic: clinic.name,
    doctors: [...doctorsData.map((d) => d.fullName), "Петров П.П. (частная)"],
    demoOrders: [demoOrder.orderNumber, "00000002"],
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
