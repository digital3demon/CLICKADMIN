import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  ConstructionCategory,
  DemoKanbanColumn,
  EmailDirection,
  EmailFolderType,
  KaitenTrackLane,
  LabWorkStatus,
  OrderChatCorrectionSource,
  OrderChatInboxItemType,
  OrderChatInboxSyncState,
  OrderStatus,
  StockMovementKind,
  UserRole,
} from "@prisma/client";
import { emptyProsthetics, prostheticsToJson } from "@/lib/order-prosthetics";
import { ORDER_NUMBER_SETTINGS_ID } from "@/lib/order-number";
import { ensureFinanceOfficeDebtColumns } from "@/lib/ensure-finance-office-debt-columns";
import { ensureInventoryItemColumns } from "@/lib/ensure-inventory-item-columns";
import { ensureLegalEntityReconciliationTable } from "@/lib/ensure-legal-entity-reconciliation-table";
import { ensureKaitenDirectory } from "@/lib/kaiten-directory-bootstrap";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-constants";
import { KAITEN_MIRROR_KANBAN_COLUMNS } from "@/lib/kanban/model";
import { UI_DESIGN_CLIENT_STATE_KEY } from "@/lib/ui-design";
import { kanbanOrderCommentsStateKey } from "@/lib/kanban/kanban-order-comments";

const OWNER_ID = "cm_demo_owner_user_v1";
const OWNER_EMAIL = "owner@demo.crm";
const DEMO_MAILBOX = "lab@demo.crm";
const DEMO_AUTHOR = "Владелец (демо)";

/**
 * Бамп → при входе в демо (в т.ч. DEMO_RESEED_ON_START=0) старая выгрузка
 * считается «не сиднутой» и пересоздаётся. См. isDemoDatabaseSeeded.
 */
export const DEMO_SEED_REVISION = 7;
const DEMO_SEED_REVISION_KEY = "demo-seed-revision";
/** Минимум нарядов в актуальном сиде (ниже = устаревшая выгрузка на 4 заказа). */
const DEMO_ORDER_COUNT_MIN = 50;

function demoMirrorColumnTitle(
  col: (typeof DemoKanbanColumn)[keyof typeof DemoKanbanColumn],
  ix: number,
): string {
  if (col === DemoKanbanColumn.NEW) return "НА СКАН";
  if (col === DemoKanbanColumn.DONE) return "Сдана админам";
  const mid = KAITEN_MIRROR_KANBAN_COLUMNS.filter(
    (c) => c.title !== "НА СКАН" && c.title !== "Сдана админам",
  );
  return mid[ix % mid.length]?.title ?? "К исполнению";
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

/** Календарный день лаборатории = MSK (как в аналитике). */
const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

/** `daysFromToday=0` — сегодня по МСК; час/минута тоже по МСК. */
function daysAgoMsk(daysFromToday: number, hourMsk = 11, minuteMsk = 0): Date {
  const nowMsk = new Date(Date.now() + MSK_OFFSET_MS);
  const y = nowMsk.getUTCFullYear();
  const m = nowMsk.getUTCMonth();
  const d = nowMsk.getUTCDate() - Math.max(0, daysFromToday);
  return new Date(
    Date.UTC(y, m, d, hourMsk, minuteMsk, 0, 0) - MSK_OFFSET_MS,
  );
}

/** @deprecated use daysAgoMsk — оставлено для писем/склада */
function daysAgo(d: number, hourUtc = 10): Date {
  return daysAgoMsk(d, hourUtc, (d * 17) % 60);
}

function yymmOf(d: Date): string {
  const msk = new Date(d.getTime() + MSK_OFFSET_MS);
  const y = String(msk.getUTCFullYear()).slice(-2);
  const m = String(msk.getUTCMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

/**
 * Актуальна ли демо-БД (не «просто есть владелец»).
 * Старые выгрузки (4 наряда / без revision) → false → resetAndSeed.
 */
export async function isDemoDatabaseSeeded(db: PrismaClient): Promise<boolean> {
  const u = await db.user.findUnique({
    where: { id: OWNER_ID },
    select: { id: true },
  });
  if (!u) return false;
  const orderCount = await db.order.count({
    where: { tenantId: DEFAULT_TENANT_ID },
  });
  if (orderCount < DEMO_ORDER_COUNT_MIN) return false;
  const rev = await db.tenantClientState.findUnique({
    where: {
      tenantId_key: {
        tenantId: DEFAULT_TENANT_ID,
        key: DEMO_SEED_REVISION_KEY,
      },
    },
    select: { value: true },
  });
  const raw =
    rev?.value && typeof rev.value === "object" && rev.value !== null
      ? (rev.value as { v?: unknown }).v
      : null;
  return Number(raw) === DEMO_SEED_REVISION;
}

/** Полная демо-выгрузка: клиники, врачи, наряды, прайс, склад, курьеры, фейковая почта и чат. */
export async function seedDemoDatabase(db: PrismaClient): Promise<void> {
  await ensureFinanceOfficeDebtColumns(db);
  /** Демо часто пропускает полный force-reset — догоняем таблицы/колонки перед wipe. */
  await ensureLegalEntityReconciliationTable(db);
  await ensureInventoryItemColumns(db);
  await db.$transaction(
    async (tx) => {
    await tx.orderCustomTag.deleteMany();
    await tx.subscriptionInvoice.deleteMany();
    await tx.contractorRevision.deleteMany();
    await tx.clinicReconciliationSnapshot.deleteMany();
    await tx.legalEntityReconciliation.deleteMany();
    await tx.stockMovement.deleteMany();
    await tx.stockBalance.deleteMany();
    await tx.inventoryItem.deleteMany();
    await tx.warehouse.deleteMany();
    await tx.orderRevision.deleteMany();
    await tx.orderConstruction.deleteMany();
    await tx.order.deleteMany();
    await tx.priceListWorkspaceSettings.deleteMany();
    await tx.priceListItem.deleteMany();
    await tx.priceList.deleteMany();
    await tx.kaitenCardType.deleteMany();
    await tx.material.deleteMany();
    await tx.constructionType.deleteMany();
    await tx.courier.deleteMany();
    await tx.doctorClinicLinkSuppression.deleteMany();
    await tx.doctorOnClinic.deleteMany();
    await tx.doctor.deleteMany();
    await tx.clinic.deleteMany();
    await tx.user.deleteMany();
    await tx.orderNumberSettings.deleteMany();
    await tx.tenant.deleteMany();

    await tx.tenant.create({
      data: {
        id: DEFAULT_TENANT_ID,
        slug: "demo",
        name: "Демо",
        plan: "ULTRA",
        addonKanban: true,
      },
    });

    await tx.orderNumberSettings.create({
      data: { id: ORDER_NUMBER_SETTINGS_ID, postingYearMonth: "2608" },
    });

    await tx.user.create({
      data: {
        id: OWNER_ID,
        tenantId: DEFAULT_TENANT_ID,
        email: OWNER_EMAIL,
        displayName: "Владелец (демо)",
        role: UserRole.OWNER,
        passwordHash: null,
        isActive: true,
      },
    });

    /** Общий bcrypt для «есть пароль» в списке; вход в демо — по коду, не по этим учёткам. */
    const demoStaffPasswordHash = bcrypt.hashSync("demo-staff-not-used", 10);
    const staffSeeds: Array<{
      id: string;
      email: string;
      displayName: string;
      role: (typeof UserRole)[keyof typeof UserRole];
    }> = [
      {
        id: "cm_demo_user_admin_v1",
        email: "admin@demo.crm",
        displayName: "Пользователь · Администратор",
        role: UserRole.ADMINISTRATOR,
      },
      {
        id: "cm_demo_user_senior_admin_v1",
        email: "senior-admin@demo.crm",
        displayName: "Пользователь · Старший админ",
        role: UserRole.SENIOR_ADMINISTRATOR,
      },
      {
        id: "cm_demo_user_tech_v1",
        email: "tech@demo.crm",
        displayName: "Пользователь · Техник",
        role: UserRole.SENIOR_TECHNICIAN,
      },
      {
        id: "cm_demo_user_prod_v1",
        email: "production@demo.crm",
        displayName: "Пользователь · Производство",
        role: UserRole.PRODUCTION,
      },
      {
        id: "cm_demo_user_manager_v1",
        email: "manager@demo.crm",
        displayName: "Пользователь · Менеджер",
        role: UserRole.MANAGER,
      },
      {
        id: "cm_demo_user_accountant_v1",
        email: "accountant@demo.crm",
        displayName: "Пользователь · Бухгалтер",
        role: UserRole.ACCOUNTANT,
      },
    ];
    for (let si = 0; si < staffSeeds.length; si++) {
      const u = staffSeeds[si]!;
      await tx.user.create({
        data: {
          id: u.id,
          tenantId: DEFAULT_TENANT_ID,
          email: u.email,
          displayName: u.displayName,
          role: u.role,
          passwordHash: demoStaffPasswordHash,
          isActive: true,
          lastLoginAt: hoursAgo(12 + si),
        },
      });
    }

    const demoUserIds = [OWNER_ID, ...staffSeeds.map((u) => u.id)];
    for (const userId of demoUserIds) {
      await tx.userClientState.create({
        data: {
          userId,
          tenantId: DEFAULT_TENANT_ID,
          key: UI_DESIGN_CLIENT_STATE_KEY,
          value: { design: "harmony" },
        },
      });
    }

    const couriers = await Promise.all([
      tx.courier.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          name: "Курьер «Север»",
          sortOrder: 0,
          isActive: true,
        },
      }),
      tx.courier.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          name: "Курьер «Юг»",
          sortOrder: 1,
          isActive: true,
        },
      }),
    ]);

    const materials = await Promise.all(
      [
        "Дисиликат литийный",
        "Воск моделировочный",
        "Гипс III класс",
        "Пластмасса зуботехническая",
        "Штифт стекловолоконный",
      ].map((name) =>
        tx.material.create({
          data: { name },
        }),
      ),
    );

    const constructionTypes = await Promise.all([
      tx.constructionType.create({
        data: {
          name: "Коронка металлокерамика",
          code: "MCZ",
          isArchWork: false,
        },
      }),
      tx.constructionType.create({
        data: {
          name: "Коронка циркониевая",
          code: "ZR",
          isArchWork: false,
        },
      }),
    ]);

    await ensureKaitenDirectory(tx, DEFAULT_TENANT_ID);
    const kaitenByName = async (name: string) => {
      const t = await tx.kaitenCardType.findFirst({
        where: { name, tenantId: DEFAULT_TENANT_ID },
      });
      if (!t) throw new Error(`demo seed: нет типа карточки «${name}»`);
      return t;
    };
    const ktPermanent = await kaitenByName("Постоянные");
    const ktTemporary = await kaitenByName("Временные");
    const ktSurgery = await kaitenByName("Хирургия");
    const ktMio = await kaitenByName("МиоСплинт");
    const kaitenTypes = [ktPermanent, ktTemporary, ktSurgery, ktMio];

    const demoPriceList = await tx.priceList.create({
      data: { name: "Демо-прайс", sortOrder: 0 },
    });
    await tx.priceListWorkspaceSettings.create({
      data: { id: "default", activePriceListId: demoPriceList.id },
    });

    /** Ровно 10 демо-позиций, без разделов/подгрупп (sectionTitle пустой). */
    const demoPriceRows = [
      { code: "DM01", name: "Демо · диагностика", priceRub: 2100, leadWorkingDays: 1 },
      { code: "DM02", name: "Демо · временная коронка", priceRub: 3900, leadWorkingDays: 2 },
      { code: "DM03", name: "Демо · коронка Zr", priceRub: 16200, leadWorkingDays: 8 },
      { code: "DM04", name: "Демо · коронка МК", priceRub: 11800, leadWorkingDays: 7 },
      { code: "DM05", name: "Демо · вкладка", priceRub: 7400, leadWorkingDays: 5 },
      { code: "DM06", name: "Демо · винир", priceRub: 14500, leadWorkingDays: 9 },
      { code: "DM07", name: "Демо · абатмент", priceRub: 5200, leadWorkingDays: 4 },
      { code: "DM08", name: "Демо · мост 3 ед.", priceRub: 33600, leadWorkingDays: 12 },
      { code: "DM09", name: "Демо · съёмный частичный", priceRub: 24800, leadWorkingDays: 14 },
      { code: "DM10", name: "Демо · каппа", priceRub: 6100, leadWorkingDays: 3 },
    ] as const;

    const priceItems = await Promise.all(
      demoPriceRows.map((row, i) =>
        tx.priceListItem.create({
          data: {
            priceListId: demoPriceList.id,
            code: row.code,
            name: row.name,
            sectionTitle: null,
            subsectionTitle: null,
            priceRub: row.priceRub,
            leadWorkingDays: row.leadWorkingDays,
            isActive: true,
            sortOrder: i,
          },
        }),
      ),
    );

    const whMat = await tx.warehouse.create({
      data: {
        name: "Демо — склад материалов",
        warehouseType: "demo",
        isDefault: true,
        isActive: true,
        notes: "Сгенерированные расходники (не прод)",
      },
    });
    const whPros = await tx.warehouse.create({
      data: {
        name: "Демо — склад протетики",
        warehouseType: "demo",
        isDefault: false,
        isActive: true,
        notes: "Сгенерированные заготовки (не прод)",
      },
    });

    const invMat = await Promise.all(
      materials.map((m, i) =>
        tx.inventoryItem.create({
          data: {
            warehouseId: whMat.id,
            sku: `DM-MAT-${String(i + 1).padStart(2, "0")}`,
            name: `Демо: ${m.name}`,
            unit: "шт",
            sortOrder: i,
            isActive: true,
            unitsPerSupply: 10,
            referenceUnitPriceRub: 50 + i * 7,
            manufacturer: "ДемоМатериал",
          },
        }),
      ),
    );

    const invPros = await Promise.all([
      tx.inventoryItem.create({
        data: {
          warehouseId: whPros.id,
          sku: "DM-PRO-01",
          name: "Демо: циркониевый диск 98 мм",
          unit: "шт",
          sortOrder: 0,
          isActive: true,
          manufacturer: "ДемоCAD",
          referenceUnitPriceRub: 4200,
        },
      }),
      tx.inventoryItem.create({
        data: {
          warehouseId: whPros.id,
          sku: "DM-PRO-02",
          name: "Демо: абатменты титановые",
          unit: "шт",
          sortOrder: 1,
          isActive: true,
          manufacturer: "ДемоImplant",
          referenceUnitPriceRub: 890,
        },
      }),
      tx.inventoryItem.create({
        data: {
          warehouseId: whPros.id,
          sku: "DM-PRO-03",
          name: "Демо: PMMA диск многослойный",
          unit: "шт",
          sortOrder: 2,
          isActive: true,
          manufacturer: "ДемоCAD",
          referenceUnitPriceRub: 2100,
        },
      }),
    ]);

    for (let idx = 0; idx < invMat.length; idx++) {
      const it = invMat[idx]!;
      await tx.stockBalance.create({
        data: {
          itemId: it.id,
          warehouseId: whMat.id,
          quantityOnHand: 55 + (idx % 20),
          averageUnitCostRub: 120,
        },
      });
    }
    for (const it of invPros) {
      await tx.stockBalance.create({
        data: {
          itemId: it.id,
          warehouseId: whPros.id,
          quantityOnHand: 15,
          averageUnitCostRub: 800,
        },
      });
    }

    const clinicSeeds = [
      {
        name: "Демо — стоматология «Импульс»",
        address: "г. Санкт-Петербург, Невский пр-т, д. 28",
        phone: "+78121110010",
      },
      {
        name: "Демо — клиника «Дент-Профи»",
        address: "г. Новосибирск, Красный пр-т, д. 50",
        phone: "+73832220022",
      },
      {
        name: "Демо — «Улыбка Плюс»",
        address: "г. Екатеринбург, ул. Малышева, д. 36",
        phone: "+73433330033",
      },
      {
        name: "Демо — «Белый Жемчуг»",
        address: "г. Казань, ул. Баумана, д. 19",
        phone: "+78437770077",
      },
      {
        name: "Демо — «Ортодент»",
        address: "г. Нижний Новгород, ул. Большая Покровская, д. 12",
        phone: "+78314440044",
      },
      {
        name: "Демо — «Стомалайн»",
        address: "г. Самара, ул. Ленинградская, д. 25",
        phone: "+78465550055",
      },
      {
        name: "Демо — «Дентал Сити»",
        address: "г. Краснодар, ул. Красная, д. 88",
        phone: "+78616660066",
      },
      {
        name: "Демо — «КронаМед»",
        address: "г. Владивосток, ул. Светланская, д. 41",
        phone: "+74238880088",
      },
      {
        name: "Демо — «Апекс»",
        address: "г. Ростов-на-Дону, пр-т Будённовский, д. 17",
        phone: "+78639990099",
      },
      {
        name: "Демо — «Формула Улыбки»",
        address: "г. Калининград, ул. Пролетарская, д. 7",
        phone: "+74012123121",
      },
    ] as const;

    const clinics = await Promise.all(
      clinicSeeds.map((c) =>
        tx.clinic.create({
          data: {
            tenantId: DEFAULT_TENANT_ID,
            name: c.name,
            address: c.address,
            isActive: true,
            phone: c.phone,
          },
        }),
      ),
    );

    const doctorSeeds = [
      {
        lastName: "Соколова",
        firstName: "Мария",
        patronymic: "Петровна",
        specialty: "Ортопед",
        private: false,
      },
      {
        lastName: "Кузнецов",
        firstName: "Андрей",
        patronymic: "Викторович",
        specialty: "Хирург",
        private: false,
      },
      {
        lastName: "Новикова",
        firstName: "Елена",
        patronymic: "Сергеевна",
        specialty: "Терапевт",
        private: false,
      },
      {
        lastName: "Волков",
        firstName: "Дмитрий",
        patronymic: "Олегович",
        specialty: "Ортопед",
        private: false,
      },
      {
        lastName: "Лебедев",
        firstName: "Игорь",
        patronymic: "Николаевич",
        specialty: "Ортопед",
        private: true,
      },
      {
        lastName: "Морозова",
        firstName: "Анна",
        patronymic: "Игоревна",
        specialty: "Ортодонт",
        private: false,
      },
      {
        lastName: "Павлов",
        firstName: "Сергей",
        patronymic: "Алексеевич",
        specialty: "Хирург",
        private: false,
      },
      {
        lastName: "Фёдорова",
        firstName: "Ольга",
        patronymic: "Владимировна",
        specialty: "Ортопед",
        private: false,
      },
      {
        lastName: "Смирнов",
        firstName: "Павел",
        patronymic: "Романович",
        specialty: "Терапевт",
        private: false,
      },
      {
        lastName: "Козлова",
        firstName: "Наталья",
        patronymic: "Дмитриевна",
        specialty: "Ортопед",
        private: true,
      },
      {
        lastName: "Орлов",
        firstName: "Кирилл",
        patronymic: "Сергеевич",
        specialty: "Хирург",
        private: false,
      },
      {
        lastName: "Белова",
        firstName: "Ирина",
        patronymic: "Андреевна",
        specialty: "Ортодонт",
        private: false,
      },
      {
        lastName: "Громов",
        firstName: "Максим",
        patronymic: "Ильич",
        specialty: "Ортопед",
        private: false,
      },
      {
        lastName: "Тарасова",
        firstName: "Юлия",
        patronymic: "Олеговна",
        specialty: "Терапевт",
        private: false,
      },
      {
        lastName: "Егоров",
        firstName: "Артём",
        patronymic: "Павлович",
        specialty: "Ортопед",
        private: false,
      },
      {
        lastName: "Зайцева",
        firstName: "Дарья",
        patronymic: "Николаевна",
        specialty: "Хирург",
        private: false,
      },
      {
        lastName: "Никитин",
        firstName: "Роман",
        patronymic: "Евгеньевич",
        specialty: "Ортопед",
        private: true,
      },
      {
        lastName: "Савельева",
        firstName: "Виктория",
        patronymic: "Сергеевна",
        specialty: "Ортодонт",
        private: false,
      },
      {
        lastName: "Макаров",
        firstName: "Денис",
        patronymic: "Александрович",
        specialty: "Терапевт",
        private: false,
      },
      {
        lastName: "Полякова",
        firstName: "Алина",
        patronymic: "Михайловна",
        specialty: "Ортопед",
        private: false,
      },
    ] as const;

    /** Города врачей — те же регионы, что у клиник (не только Москва). */
    const doctorCities = [
      "Санкт-Петербург",
      "Новосибирск",
      "Екатеринбург",
      "Казань",
      "Нижний Новгород",
      "Самара",
      "Краснодар",
      "Владивосток",
      "Ростов-на-Дону",
      "Калининград",
    ] as const;

    const doctors = await Promise.all(
      doctorSeeds.map((d, di) => {
        const fullName = `${d.lastName} ${d.firstName} ${d.patronymic}`;
        return tx.doctor.create({
          data: {
            tenantId: DEFAULT_TENANT_ID,
            fullName,
            lastName: d.lastName,
            firstName: d.firstName,
            patronymic: d.patronymic,
            specialty: d.specialty,
            city: doctorCities[di % doctorCities.length]!,
            acceptsPrivatePractice: d.private,
          },
        });
      }),
    );

    const links: Array<{ doctorId: string; clinicId: string }> = [];
    for (let di = 0; di < doctors.length; di++) {
      const doc = doctors[di]!;
      if (doctorSeeds[di]?.private && di >= 4) {
        // частная практика — без обязательной клиники, но части даём 1 клинику для удобства
        if (di % 3 === 0) {
          links.push({
            doctorId: doc.id,
            clinicId: clinics[di % clinics.length]!.id,
          });
        }
        continue;
      }
      links.push({
        doctorId: doc.id,
        clinicId: clinics[di % clinics.length]!.id,
      });
      if (di % 4 === 0) {
        links.push({
          doctorId: doc.id,
          clinicId: clinics[(di + 3) % clinics.length]!.id,
        });
      }
    }
    for (const row of links) {
      await tx.doctorOnClinic.create({ data: row });
    }

    /** ~90 нарядов за 30 дней МСК — по ~3 в день для живой аналитики. */
    const DEMO_ORDER_COUNT = 90;
    const DEMO_ORDER_SPAN_DAYS = 30;
    const patientSurnames = [
      "Иванов",
      "Петрова",
      "Сидоров",
      "Козлова",
      "Морозов",
      "Волкова",
      "Лебедев",
      "Соколова",
      "Новиков",
      "Фёдорова",
      "Михайлов",
      "Егорова",
      "Алексеев",
      "Кузнецова",
      "Степанов",
      "Павлова",
    ] as const;
    const patientInitials = [
      "А.С.",
      "О.В.",
      "П.К.",
      "Н.Д.",
      "И.М.",
      "Е.А.",
      "Р.Л.",
      "Т.Ю.",
    ] as const;
    const toothHints = [
      "11, 12 коронки",
      "временная 21",
      "цирконий 36",
      "съёмный",
      "виниры 12–22",
      "абатмент 46",
      "мост 34–36",
      "каппа",
      "вкладка 15",
      "ретейнер",
    ] as const;

    const orderDescriptionTemplates = [
      (h: string, color: string) =>
        `Клиника прислала скан.\nРабота: ${h}.\nЦвет ${color}.\nКонтакт окклюзии средний, без срочности.`,
      (h: string, color: string) =>
        `Заказ с почты.\n${h}.\nОттенок ${color}, прозрачность стандарт.\nПросим фото до/после при возможности.`,
      (h: string, color: string) =>
        `Пациент на повторный приём.\n${h}, цвет ${color}.\nУчесть прикус по присланной регистрации.`,
      (h: string, color: string) =>
        `Новый заказ.\nПозиция: ${h}.\nЦвет ${color}.\nСкан во вложении к письму (демо).`,
      (h: string, color: string) =>
        `${h}.\nЦвет ${color}, индивидуализация десны по фото.\nСрок — как в шапке наряда.`,
      (h: string, color: string) =>
        `Ортопедия.\n${h}.\n${color}.\nБез металлического края, просим глазурь.`,
    ] as const;
    const shadePool = ["A1", "A2", "A3", "B1", "BL2", "C2"] as const;

    const seqByYymm = new Map<string, number>();
    const createdOrders: { id: string; orderNumber: string }[] = [];

    for (let ix = 0; ix < DEMO_ORDER_COUNT; ix++) {
      /** Равномерно по дням: 0 = сегодня МСК … SPAN-1 = самый старый. */
      const daysFromToday =
        DEMO_ORDER_SPAN_DAYS -
        1 -
        Math.floor((ix * DEMO_ORDER_SPAN_DAYS) / DEMO_ORDER_COUNT);
      const hourMsk = 9 + (ix % 9);
      const minuteMsk = (ix * 7) % 60;
      const createdAt = daysAgoMsk(daysFromToday, hourMsk, minuteMsk);
      const yymm = yymmOf(createdAt);
      const seq = (seqByYymm.get(yymm) ?? 0) + 1;
      seqByYymm.set(yymm, seq);
      const orderNumber = `${yymm}-${pad3(seq)}`;

      const doc = doctors[ix % doctors.length]!;
      const privateOrder = ix % 7 === 0;
      const clinic = privateOrder ? null : clinics[ix % clinics.length]!;
      const kt = kaitenTypes[ix % kaitenTypes.length]!;
      const courierPick = couriers[ix % couriers.length]!;
      const courierDel = couriers[(ix + 1) % couriers.length]!;

      const bucket = ix % 10;
      let status: OrderStatus = OrderStatus.IN_PROGRESS;
      let labWorkStatus: LabWorkStatus = LabWorkStatus.PRODUCTION;
      let col: DemoKanbanColumn = DemoKanbanColumn.IN_PROGRESS;
      let adminShippedOtpr = false;
      let adminShippedAt: Date | null = null;
      let payment: string | null = null;
      if (bucket === 9) {
        status = OrderStatus.CANCELLED;
        labWorkStatus = LabWorkStatus.TO_ADMINS;
        col = DemoKanbanColumn.DONE;
      } else if (bucket >= 5 || daysFromToday >= 8) {
        status = OrderStatus.DELIVERED;
        labWorkStatus = LabWorkStatus.TO_ADMINS;
        col = DemoKanbanColumn.DONE;
        adminShippedOtpr = true;
        adminShippedAt = new Date(
          createdAt.getTime() + (2 + (ix % 4)) * 24 * 60 * 60 * 1000,
        );
        payment =
          ix % 3 === 0 ? "Оплачено" : ix % 3 === 1 ? "Сверка-ОПЛАЧЕНО" : null;
      } else if (bucket <= 1 && daysFromToday < 4) {
        status = OrderStatus.REVIEW;
        labWorkStatus = LabWorkStatus.TO_SCAN;
        col = DemoKanbanColumn.NEW;
      }

      const dueLab = new Date(createdAt);
      dueLab.setUTCDate(dueLab.getUTCDate() + 10 + (ix % 8));
      const dueAdm = new Date(createdAt);
      dueAdm.setUTCDate(dueAdm.getUTCDate() + 2 + (ix % 6));

      const pi = priceItems[ix % priceItems.length]!;
      const qty = 1 + (ix % 3);
      const constructions: Array<{
        category: typeof ConstructionCategory.PRICE_LIST;
        priceListItemId: string;
        quantity: number;
        unitPrice: number;
        sortOrder: number;
      }> = [
        {
          category: ConstructionCategory.PRICE_LIST,
          priceListItemId: pi.id,
          quantity: qty,
          unitPrice: pi.priceRub,
          sortOrder: 0,
        },
      ];
      if (ix % 4 === 0) {
        const pi2 = priceItems[(ix + 3) % priceItems.length]!;
        constructions.push({
          category: ConstructionCategory.PRICE_LIST,
          priceListItemId: pi2.id,
          quantity: 1,
          unitPrice: pi2.priceRub,
          sortOrder: 1,
        });
      }

      const surname = patientSurnames[ix % patientSurnames.length]!;
      const initials = patientInitials[ix % patientInitials.length]!;
      const hint = toothHints[ix % toothHints.length]!;
      const shade = shadePool[ix % shadePool.length]!;
      const descTpl =
        orderDescriptionTemplates[ix % orderDescriptionTemplates.length]!;
      const clientOrderText = descTpl(hint, shade);
      const notes =
        ix % 5 === 0
          ? "Демо: внутренний комментарий админа — проверить комплектацию перед отгрузкой."
          : null;
      /** Как в CRM-списке: ФИО без «(подсказка)» — иначе personNameSurnameInitials даёт «О. (.». */
      const patientName = `${surname} ${initials}`;
      const kaitenColumnTitle = demoMirrorColumnTitle(col, ix);
      const kaitenTrackLane =
        ix % 5 === 0
          ? KaitenTrackLane.ORTHODONTICS
          : KaitenTrackLane.ORTHOPEDICS;

      const order = await tx.order.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          orderNumber,
          createdAt,
          clinicId: clinic?.id ?? null,
          doctorId: doc.id,
          patientName,
          status,
          labWorkStatus,
          dueDate: dueLab,
          dueToAdminsAt: dueAdm,
          appointmentDate: dueAdm,
          workReceivedAt: createdAt,
          demoKanbanColumn: col,
          kaitenColumnTitle,
          kaitenCardTypeId: kt.id,
          kaitenTrackLane,
          kaitenDecideLater: false,
          clientOrderText,
          notes,
          payment,
          kaitenCardDescriptionMirror: clientOrderText,
          prosthetics: prostheticsToJson(emptyProsthetics()),
          courierPickupId: courierPick.id,
          courierDeliveryId: courierDel.id,
          registeredByLabel: "Демо CRM",
          adminShippedOtpr,
          adminShippedAt,
          constructions: { create: constructions },
        },
        select: { id: true, orderNumber: true },
      });
      createdOrders.push(order);
    }

    const latestYymm = [...seqByYymm.keys()].sort().at(-1) ?? "2608";
    const maxSeqLatest = seqByYymm.get(latestYymm) ?? 0;
    await tx.orderNumberSettings.update({
      where: { id: ORDER_NUMBER_SETTINGS_ID },
      data: {
        postingYearMonth: latestYymm,
        nextSequenceFloor: maxSeqLatest + 1,
      },
    });

    /** Движения склада за тот же период — вкладка «Склад» в аналитике. */
    const stockItems = [...invMat, ...invPros];
    for (let mi = 0; mi < 24; mi++) {
      const it = stockItems[mi % stockItems.length]!;
      const whId = it.warehouseId;
      const at = daysAgo(40 - mi, 12);
      const isIssue = mi % 3 !== 0;
      const linked =
        isIssue && createdOrders.length > 0
          ? createdOrders[mi % createdOrders.length]!
          : null;
      await tx.stockMovement.create({
        data: {
          createdAt: at,
          kind: isIssue
            ? StockMovementKind.SALE_ISSUE
            : StockMovementKind.PURCHASE_RECEIPT,
          quantity: isIssue ? 1 + (mi % 3) : 10 + (mi % 5),
          totalCostRub: isIssue ? 120 * (1 + (mi % 3)) : 800 + mi * 15,
          note: isIssue ? "Демо: отпуск в работу" : "Демо: приход от поставщика",
          itemId: it.id,
          warehouseId: whId,
          orderId: linked?.id ?? null,
          actorLabel: DEMO_AUTHOR,
          idempotencyKey: `demo-stock-${mi + 1}`,
        },
      });
    }

    const mailAccount = await tx.emailAccount.create({
      data: {
        tenantId: DEFAULT_TENANT_ID,
        createdByUserId: OWNER_ID,
        email: DEMO_MAILBOX,
        displayName: "Демо-почта лаборатории",
        encryptedAppPassword: null,
        allowedRoles: [
          UserRole.OWNER,
          UserRole.ADMINISTRATOR,
          UserRole.SENIOR_ADMINISTRATOR,
        ],
        settingsRoles: [UserRole.OWNER],
        isActive: true,
        lastSyncAt: hoursAgo(1),
        lastSyncError: null,
      },
    });

    const folderDefs = [
      {
        imapName: "INBOX",
        displayName: "Входящие",
        type: EmailFolderType.INBOX,
        sortOrder: 10,
      },
      {
        imapName: "Sent",
        displayName: "Отправленные",
        type: EmailFolderType.SENT,
        sortOrder: 20,
      },
      {
        imapName: "Drafts",
        displayName: "Черновики",
        type: EmailFolderType.DRAFTS,
        sortOrder: 30,
      },
      {
        imapName: "Archive",
        displayName: "Архив",
        type: EmailFolderType.ARCHIVE,
        sortOrder: 40,
      },
      {
        imapName: "Spam",
        displayName: "Спам",
        type: EmailFolderType.SPAM,
        sortOrder: 50,
      },
      {
        imapName: "Trash",
        displayName: "Корзина",
        type: EmailFolderType.TRASH,
        sortOrder: 60,
      },
    ] as const;

    const folders: Record<string, string> = {};
    for (const f of folderDefs) {
      const row = await tx.emailFolder.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          accountId: mailAccount.id,
          imapName: f.imapName,
          displayName: f.displayName,
          type: f.type,
          sortOrder: f.sortOrder,
        },
        select: { id: true, type: true },
      });
      folders[row.type] = row.id;
    }

    const inboxId = folders.INBOX!;
    const sentId = folders.SENT!;
    const clinicA = clinics[0]!;
    const clinicB = clinics[1]!;
    const clinicC = clinics[2]!;
    const clinicD = clinics[3]!;
    const clinicE = clinics[4]!;
    const docA = doctors[0]!;
    const docB = doctors[1]!;
    const docC = doctors[2]!;
    const docD = doctors[3]!;
    const docE = doctors[4]!;
    const docF = doctors[5]!;

    /**
     * Входящие «Заказ: …» привязаны к нарядам (EmailSourceOrder) —
     * в списке почты виден номер наряда (зелёная галочка).
     */
    type MailSpec = {
      folderId: string;
      direction: EmailDirection;
      isRead: boolean;
      fromName: string;
      fromAddress: string;
      to: unknown;
      subject: string;
      preview: string;
      body: string;
      at: Date;
      linkOrderId?: string;
    };

    const orderMail = (
      partial: Omit<MailSpec, "folderId" | "direction" | "to"> & {
        folderId?: string;
        direction?: EmailDirection;
      },
    ): MailSpec => ({
      folderId: inboxId,
      direction: EmailDirection.INBOUND,
      to: [{ name: "Лаборатория", address: DEMO_MAILBOX }],
      ...partial,
    });

    /** Разные наряды для писем (свежие + середина списка). */
    const mailOrders = [
      createdOrders[createdOrders.length - 1]!,
      createdOrders[createdOrders.length - 2]!,
      createdOrders[createdOrders.length - 3]!,
      createdOrders[createdOrders.length - 4]!,
      createdOrders[createdOrders.length - 5]!,
      createdOrders[createdOrders.length - 6]!,
      createdOrders[createdOrders.length - 7]!,
      createdOrders[createdOrders.length - 8]!,
      createdOrders[Math.floor(createdOrders.length * 0.7)]!,
      createdOrders[Math.floor(createdOrders.length * 0.55)]!,
      createdOrders[Math.floor(createdOrders.length * 0.4)]!,
      createdOrders[Math.floor(createdOrders.length * 0.3)]!,
      createdOrders[Math.floor(createdOrders.length * 0.2)]!,
      createdOrders[Math.floor(createdOrders.length * 0.1)]!,
      createdOrders[5]!,
    ];
    const o = (i: number) => mailOrders[i]!;

    const mailSpecs: MailSpec[] = [
      orderMail({
        isRead: false,
        fromName: clinicA.name,
        fromAddress: "reception@impuls-demo.ru",
        subject: `Заказ: коронки Zr 11, 21 · ${o(0).orderNumber}`,
        preview: `Наряд ${o(0).orderNumber}. Пациент Смирнов И.П., цвет A2.`,
        body: `Клиника: ${clinicA.name}\nВрач: ${docA.fullName}\nПациент: Смирнов И.П.\nНаряд: ${o(0).orderNumber}\n\nКоронки циркониевые 11, 21.\nЦвет A2.\nСрок 10 рабочих дней.\nСкан во вложении (демо).`,
        at: hoursAgo(1),
        linkOrderId: o(0).id,
      }),
      orderMail({
        isRead: false,
        fromName: clinicB.name,
        fromAddress: "lab@dent-profi-demo.ru",
        subject: `Заказ: временные коронки 34–36 · ${o(1).orderNumber}`,
        preview: `Наряд ${o(1).orderNumber}. Орлова М.А., срочно к пятнице.`,
        body: `Клиника: ${clinicB.name}\nВрач: ${docB.fullName}\nПациент: Орлова М.А.\nНаряд: ${o(1).orderNumber}\n\nВременные коронки 34, 35, 36.\nСрок — к пятнице.`,
        at: hoursAgo(2),
        linkOrderId: o(1).id,
      }),
      orderMail({
        isRead: false,
        fromName: docC.fullName,
        fromAddress: "sidorov@demo-clinic.ru",
        subject: `Заказ (частная практика): каппа · ${o(2).orderNumber}`,
        preview: `Наряд ${o(2).orderNumber}. Кузнецов Д.В., каппа ночная.`,
        body: `Врач: ${docC.fullName}\nПациент: Кузнецов Д.В.\nНаряд: ${o(2).orderNumber}\n\nКаппа ночная на верхнюю челюсть.\nСрок 5 рабочих дней.`,
        at: hoursAgo(3),
        linkOrderId: o(2).id,
      }),
      orderMail({
        isRead: false,
        fromName: clinicC.name,
        fromAddress: "ordo@ulybka-demo.ru",
        subject: `Заказ: мост Zr 45–47 · ${o(3).orderNumber}`,
        preview: `Наряд ${o(3).orderNumber}. Васильева Е.Н., цвет A3.`,
        body: `Клиника: ${clinicC.name}\nВрач: ${docD.fullName}\nПациент: Васильева Е.Н.\nНаряд: ${o(3).orderNumber}\n\nМост циркониевый 45–47, цвет A3.\nСначала каркас на примерку.`,
        at: hoursAgo(4),
        linkOrderId: o(3).id,
      }),
      orderMail({
        isRead: false,
        fromName: clinicD.name,
        fromAddress: "info@zhemchug-demo.ru",
        subject: `Заказ: виниры 12–22 · ${o(4).orderNumber}`,
        preview: `Наряд ${o(4).orderNumber}. Николаева С.И., 6 виниров E.max.`,
        body: `Клиника: ${clinicD.name}\nВрач: ${docE.fullName}\nПациент: Николаева С.И.\nНаряд: ${o(4).orderNumber}\n\nВиниры 12, 11, 21, 22 (при необходимости 13, 23).\nМатериал E.max.\nФото улыбки приложили (демо).`,
        at: hoursAgo(5),
        linkOrderId: o(4).id,
      }),
      orderMail({
        isRead: false,
        fromName: clinicE.name,
        fromAddress: "mail@ortodent-demo.ru",
        subject: `Заказ: абатмент Multi-unit + коронка 36 · ${o(5).orderNumber}`,
        preview: `Наряд ${o(5).orderNumber}. Фролов А.К., Straumann.`,
        body: `Клиника: ${clinicE.name}\nВрач: ${docF.fullName}\nПациент: Фролов А.К.\nНаряд: ${o(5).orderNumber}\n\nАбатмент Multi-unit и коронка Zr на 36.\nПлатформа Straumann.\nСрочно.`,
        at: hoursAgo(6),
        linkOrderId: o(5).id,
      }),
      orderMail({
        isRead: false,
        fromName: clinicA.name,
        fromAddress: "reception@impuls-demo.ru",
        subject: `Заказ: вкладка 15 + ретейнер · ${o(6).orderNumber}`,
        preview: `Наряд ${o(6).orderNumber}. Белова К.Т., цвет A1.`,
        body: `Клиника: ${clinicA.name}\nВрач: ${docA.fullName}\nПациент: Белова К.Т.\nНаряд: ${o(6).orderNumber}\n\nВкладка 15, цвет A1.\nРетейнер на верх после фиксации.`,
        at: hoursAgo(8),
        linkOrderId: o(6).id,
      }),
      orderMail({
        isRead: false,
        fromName: clinicB.name,
        fromAddress: "lab@dent-profi-demo.ru",
        subject: `Заказ: цирконий 36 одиночная · ${o(7).orderNumber}`,
        preview: `Наряд ${o(7).orderNumber}. Громов П.И., цвет B1.`,
        body: `Клиника: ${clinicB.name}\nВрач: ${docB.fullName}\nПациент: Громов П.И.\nНаряд: ${o(7).orderNumber}\n\nКоронка циркониевая 36, цвет B1.\nСкан приложен (демо).`,
        at: hoursAgo(10),
        linkOrderId: o(7).id,
      }),
      orderMail({
        isRead: true,
        fromName: clinicC.name,
        fromAddress: "ordo@ulybka-demo.ru",
        subject: `Заказ: съёмный частичный протез · ${o(8).orderNumber}`,
        preview: `Наряд ${o(8).orderNumber}. Ершова Н.В., верх.`,
        body: `Клиника: ${clinicC.name}\nВрач: ${docD.fullName}\nПациент: Ершова Н.В.\nНаряд: ${o(8).orderNumber}\n\nСъёмный частичный протез на верх.\nКламмеры по ситуации.\nСрок 12 рабочих дней.`,
        at: daysAgo(1, 14),
        linkOrderId: o(8).id,
      }),
      orderMail({
        isRead: true,
        fromName: clinicD.name,
        fromAddress: "info@zhemchug-demo.ru",
        subject: `Заказ: временная коронка 21 · ${o(9).orderNumber}`,
        preview: `Наряд ${o(9).orderNumber}. Лапин С.О., на имплант.`,
        body: `Клиника: ${clinicD.name}\nВрач: ${docE.fullName}\nПациент: Лапин С.О.\nНаряд: ${o(9).orderNumber}\n\nВременная коронка 21 на имплант.\nЦвет A2.\nСрок 3 рабочих дня.`,
        at: daysAgo(1, 11),
        linkOrderId: o(9).id,
      }),
      orderMail({
        isRead: true,
        fromName: clinicE.name,
        fromAddress: "mail@ortodent-demo.ru",
        subject: `Заказ: мост 34–36 металл-керамика · ${o(10).orderNumber}`,
        preview: `Наряд ${o(10).orderNumber}. Тихонов В.А., цвет A3.`,
        body: `Клиника: ${clinicE.name}\nВрач: ${docF.fullName}\nПациент: Тихонов В.А.\nНаряд: ${o(10).orderNumber}\n\nМост металл-керамика 34–36.\nЦвет A3.\nКаркас на примерку.`,
        at: daysAgo(2, 16),
        linkOrderId: o(10).id,
      }),
      orderMail({
        isRead: true,
        fromName: docA.fullName,
        fromAddress: "sokolova@impuls-demo.ru",
        subject: `Заказ: каппа ретенционная низ · ${o(11).orderNumber}`,
        preview: `Наряд ${o(11).orderNumber}. Юдин Р.М.`,
        body: `Врач: ${docA.fullName}\nПациент: Юдин Р.М.\nНаряд: ${o(11).orderNumber}\n\nКаппа ретенционная на низ.\nСрок 4 рабочих дня.`,
        at: daysAgo(2, 9),
        linkOrderId: o(11).id,
      }),
      orderMail({
        isRead: true,
        fromName: clinicA.name,
        fromAddress: "reception@impuls-demo.ru",
        subject: `Заказ: коронки E.max 11–12 · ${o(12).orderNumber}`,
        preview: `Наряд ${o(12).orderNumber}. Савельева И.Л., цвет BL2.`,
        body: `Клиника: ${clinicA.name}\nВрач: ${docB.fullName}\nПациент: Савельева И.Л.\nНаряд: ${o(12).orderNumber}\n\nКоронки E.max 11 и 12.\nЦвет BL2.\nИндивидуализация режущего края.`,
        at: daysAgo(3, 12),
        linkOrderId: o(12).id,
      }),
      orderMail({
        isRead: true,
        fromName: clinicB.name,
        fromAddress: "lab@dent-profi-demo.ru",
        subject: `Заказ: абатмент индивидуальный 46 · ${o(13).orderNumber}`,
        preview: `Наряд ${o(13).orderNumber}. Ковалёв Д.Н., Nobel.`,
        body: `Клиника: ${clinicB.name}\nВрач: ${docC.fullName}\nПациент: Ковалёв Д.Н.\nНаряд: ${o(13).orderNumber}\n\nИндивидуальный абатмент 46.\nПлатформа Nobel.\nДалее коронка Zr отдельным заказом.`,
        at: daysAgo(3, 10),
        linkOrderId: o(13).id,
      }),
      orderMail({
        isRead: true,
        fromName: clinicC.name,
        fromAddress: "ordo@ulybka-demo.ru",
        subject: `Заказ: полный съёмный верх · ${o(14).orderNumber}`,
        preview: `Наряд ${o(14).orderNumber}. Макарова Е.П.`,
        body: `Клиника: ${clinicC.name}\nВрач: ${docD.fullName}\nПациент: Макарова Е.П.\nНаряд: ${o(14).orderNumber}\n\nПолный съёмный протез верхняя челюсть.\nПостановка на примерку.\nСрок 14 рабочих дней.`,
        at: daysAgo(4, 15),
        linkOrderId: o(14).id,
      }),
      {
        folderId: sentId,
        direction: EmailDirection.OUTBOUND,
        isRead: true,
        fromName: "Демо-почта лаборатории",
        fromAddress: DEMO_MAILBOX,
        to: [{ name: clinicA.name, address: "reception@impuls-demo.ru" }],
        subject: `Re: Заказ: коронки Zr 11, 21 · ${o(0).orderNumber}`,
        preview: `Наряд ${o(0).orderNumber} принят в работу.`,
        body: `Добрый день!\n\nНаряд ${o(0).orderNumber}: заявку на коронки Zr 11, 21 получили, в работе.\n\nЛаборатория`,
        at: hoursAgo(0.5),
        linkOrderId: o(0).id,
      },
    ];

    for (let mi = 0; mi < mailSpecs.length; mi++) {
      const m = mailSpecs[mi]!;
      const email = await tx.email.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          accountId: mailAccount.id,
          folderId: m.folderId,
          uid: mi + 1,
          messageId: `<demo-mail-${mi + 1}@demo.crm>`,
          direction: m.direction,
          isRead: m.isRead,
          readAt: m.isRead ? m.at : null,
          fromName: m.fromName,
          fromAddress: m.fromAddress,
          to: m.to as object,
          subject: m.subject,
          preview: m.preview,
          textBody: m.body,
          receivedAt: m.direction === EmailDirection.INBOUND ? m.at : null,
          sentAt: m.direction === EmailDirection.OUTBOUND ? m.at : null,
          internalDate: m.at,
          createdAt: m.at,
        },
        select: { id: true },
      });
      if (m.linkOrderId) {
        await tx.emailSourceOrder.create({
          data: {
            tenantId: DEFAULT_TENANT_ID,
            emailId: email.id,
            orderId: m.linkOrderId,
            isReplyTarget: m.direction === EmailDirection.INBOUND,
          },
        });
      }
    }

    const inboxUnread = mailSpecs.filter(
      (m) => m.folderId === inboxId && !m.isRead,
    ).length;
    const inboxTotal = mailSpecs.filter((m) => m.folderId === inboxId).length;
    const sentTotal = mailSpecs.filter((m) => m.folderId === sentId).length;
    await tx.emailFolder.update({
      where: { id: inboxId },
      data: { totalCount: inboxTotal, unreadCount: inboxUnread },
    });
    await tx.emailFolder.update({
      where: { id: sentId },
      data: { totalCount: sentTotal, unreadCount: 0 },
    });

    type SeedComment = {
      id: string;
      userId: string;
      text: string;
      createdAt: string;
      authorLabel: string;
      source: "CRM";
      syncStatus: "local";
    };

    async function seedOrderChat(
      orderId: string,
      comments: SeedComment[],
      extras?: {
        correctionText?: string;
        correctionDraftId?: string;
        prostheticsText?: string;
        prostheticsDraftId?: string;
      },
    ) {
      await tx.tenantClientState.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          key: kanbanOrderCommentsStateKey(orderId),
          value: { comments } as object,
        },
      });
      if (extras?.correctionText && extras.correctionDraftId) {
        await tx.orderChatCorrection.create({
          data: {
            orderId,
            source: OrderChatCorrectionSource.DEMO_KANBAN,
            text: extras.correctionText,
            authorLabel: DEMO_AUTHOR,
          },
        });
        await tx.orderChatInboxItem.create({
          data: {
            tenantId: DEFAULT_TENANT_ID,
            orderId,
            type: OrderChatInboxItemType.CORRECTION,
            source: OrderChatCorrectionSource.DEMO_KANBAN,
            text: extras.correctionText,
            authorLabel: DEMO_AUTHOR,
            crmDraftId: extras.correctionDraftId,
            syncState: OrderChatInboxSyncState.LOCAL_ONLY,
          },
        });
      }
      if (extras?.prostheticsText && extras.prostheticsDraftId) {
        await tx.orderProstheticsRequest.create({
          data: {
            orderId,
            source: OrderChatCorrectionSource.DEMO_KANBAN,
            text: extras.prostheticsText,
            authorLabel: DEMO_AUTHOR,
          },
        });
        await tx.orderChatInboxItem.create({
          data: {
            tenantId: DEFAULT_TENANT_ID,
            orderId,
            type: OrderChatInboxItemType.PROSTHETICS,
            source: OrderChatCorrectionSource.DEMO_KANBAN,
            text: extras.prostheticsText,
            authorLabel: DEMO_AUTHOR,
            crmDraftId: extras.prostheticsDraftId,
            syncState: OrderChatInboxSyncState.LOCAL_ONLY,
          },
        });
      }
    }

    const c1a = "cm_demo_chat_001a";
    const c1b = "cm_demo_chat_001b";
    const c1c = "cm_demo_chat_001c";
    const oChat1 = createdOrders[createdOrders.length - 1]!;
    const oChat2 = createdOrders[createdOrders.length - 2]!;
    const oChat3 = createdOrders[createdOrders.length - 3]!;
    await seedOrderChat(
      oChat1.id,
      [
        {
          id: c1a,
          userId: OWNER_ID,
          text: "Скан по почте пришёл — берём в работу.",
          createdAt: hoursAgo(4.5).toISOString(),
          authorLabel: DEMO_AUTHOR,
          source: "CRM",
          syncStatus: "local",
        },
        {
          id: c1b,
          userId: OWNER_ID,
          text: "!!! Убрать 12, оставить только 11",
          createdAt: hoursAgo(2).toISOString(),
          authorLabel: DEMO_AUTHOR,
          source: "CRM",
          syncStatus: "local",
        },
        {
          id: c1c,
          userId: OWNER_ID,
          text: "Принял корректировку, состав обновлю.",
          createdAt: hoursAgo(1.5).toISOString(),
          authorLabel: DEMO_AUTHOR,
          source: "CRM",
          syncStatus: "local",
        },
      ],
      {
        correctionText: "Убрать 12, оставить только 11",
        correctionDraftId: c1b,
      },
    );

    const c2a = "cm_demo_chat_002a";
    const c2b = "cm_demo_chat_002b";
    await seedOrderChat(
      oChat2.id,
      [
        {
          id: c2a,
          userId: OWNER_ID,
          text: "Клиника просит сдвиг срока — смотрим загрузку.",
          createdAt: hoursAgo(2.5).toISOString(),
          authorLabel: DEMO_AUTHOR,
          source: "CRM",
          syncStatus: "local",
        },
        {
          id: c2b,
          userId: OWNER_ID,
          text: "??? Абатмент Multi-unit на 36",
          createdAt: hoursAgo(1).toISOString(),
          authorLabel: DEMO_AUTHOR,
          source: "CRM",
          syncStatus: "local",
        },
      ],
      {
        prostheticsText: "Абатмент Multi-unit на 36",
        prostheticsDraftId: c2b,
      },
    );

    const c3a = "cm_demo_chat_003a";
    await seedOrderChat(oChat3.id, [
      {
        id: c3a,
        userId: OWNER_ID,
        text: "Почти готово, завтра можно отдавать.",
        createdAt: hoursAgo(9).toISOString(),
        authorLabel: DEMO_AUTHOR,
        source: "CRM",
        syncStatus: "local",
      },
    ]);

    await tx.tenantClientState.create({
      data: {
        tenantId: DEFAULT_TENANT_ID,
        key: DEMO_SEED_REVISION_KEY,
        value: { v: DEMO_SEED_REVISION },
      },
    });

  },
    { maxWait: 60_000, timeout: 180_000 },
  );
}

export { OWNER_ID, OWNER_EMAIL };
