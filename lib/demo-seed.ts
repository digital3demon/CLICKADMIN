import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  ConstructionCategory,
  DemoKanbanColumn,
  EmailDirection,
  EmailFolderType,
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
import { ensureKaitenDirectory } from "@/lib/kaiten-directory-bootstrap";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-constants";
import { kanbanOrderCommentsStateKey } from "@/lib/kanban/kanban-order-comments";

const OWNER_ID = "cm_demo_owner_user_v1";
const OWNER_EMAIL = "owner@demo.crm";
const DEMO_MAILBOX = "lab@demo.crm";
const DEMO_AUTHOR = "Владелец (демо)";

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

/** Есть ли уже сид демо (для режима без принудительного reseed при каждом входе). */
export async function isDemoDatabaseSeeded(db: PrismaClient): Promise<boolean> {
  const u = await db.user.findUnique({
    where: { id: OWNER_ID },
    select: { id: true },
  });
  return Boolean(u);
}

/** Полная демо-выгрузка: клиники, врачи, наряды, прайс, склад, курьеры, фейковая почта и чат. */
export async function seedDemoDatabase(db: PrismaClient): Promise<void> {
  await db.$transaction(
    async (tx) => {
    await tx.orderCustomTag.deleteMany();
    await tx.subscriptionInvoice.deleteMany();
    await tx.contractorRevision.deleteMany();
    await tx.clinicReconciliationSnapshot.deleteMany();
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

      const order = await tx.order.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          orderNumber,
          createdAt,
          clinicId: clinic?.id ?? null,
          doctorId: doc.id,
          patientName: `${surname} ${initials} (${hint})`,
          status,
          labWorkStatus,
          dueDate: dueLab,
          dueToAdminsAt: dueAdm,
          appointmentDate: dueAdm,
          workReceivedAt: createdAt,
          demoKanbanColumn: col,
          kaitenCardTypeId: kt.id,
          kaitenTrackLane: null,
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
    const oLinked = [
      createdOrders[createdOrders.length - 1]!,
      createdOrders[createdOrders.length - 2]!,
      createdOrders[createdOrders.length - 3]!,
      createdOrders[createdOrders.length - 4]!,
      createdOrders[createdOrders.length - 5]!,
      createdOrders[Math.floor(createdOrders.length / 2)]!,
      createdOrders[10]!,
    ];
    const o1 = oLinked[0]!;
    const o2 = oLinked[1]!;
    const o3 = oLinked[2]!;
    const clinicA = clinics[0]!;
    const clinicB = clinics[1]!;
    const clinicC = clinics[2]!;
    const clinicD = clinics[3]!;
    const docA = doctors[0]!;
    const docB = doctors[1]!;
    const docC = doctors[2]!;

    const mailSpecs: Array<{
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
    }> = [
      {
        folderId: inboxId,
        direction: EmailDirection.INBOUND,
        isRead: false,
        fromName: clinicA.name,
        fromAddress: "reception@impuls-demo.ru",
        to: [{ name: "Лаборатория", address: DEMO_MAILBOX }],
        subject: `Скан к наряду ${o1.orderNumber}`,
        preview: "Прикладываем скан, можно брать в работу.",
        body: `Добрый день!\n\nКлиника: ${clinicA.name}\nВрач: ${docA.fullName}\nНаряд: ${o1.orderNumber}\n\nОтправили скан — можно брать в работу.\n\nС уважением,\nРесепшен`,
        at: hoursAgo(2),
        linkOrderId: o1.id,
      },
      {
        folderId: inboxId,
        direction: EmailDirection.INBOUND,
        isRead: false,
        fromName: docB.fullName,
        fromAddress: "petrova@dent-demo.ru",
        to: [{ name: "Лаборатория", address: DEMO_MAILBOX }],
        subject: `Уточнение по ${o2.orderNumber}`,
        preview: "Можно ли сдвинуть срок на 2 дня?",
        body: `Здравствуйте!\n\nПо наряду ${o2.orderNumber} можно ли сдвинуть срок сдачи на 2 дня?\n\n${docB.fullName}`,
        at: hoursAgo(4),
        linkOrderId: o2.id,
      },
      {
        folderId: inboxId,
        direction: EmailDirection.INBOUND,
        isRead: true,
        fromName: clinicB.name,
        fromAddress: "lab@dent-profi-demo.ru",
        to: [{ name: "Лаборатория", address: DEMO_MAILBOX }],
        subject: `Коррекция цвета ${o3.orderNumber}`,
        preview: "Просим чуть светлее A2 → A1.",
        body: `Добрый день!\n\nНаряд ${o3.orderNumber}: просим сделать цвет чуть светлее (A2 → A1).\n\n${clinicB.name}`,
        at: hoursAgo(18),
        linkOrderId: o3.id,
      },
      {
        folderId: inboxId,
        direction: EmailDirection.INBOUND,
        isRead: true,
        fromName: clinicC.name,
        fromAddress: "ordo@ulybka-demo.ru",
        to: [{ name: "Лаборатория", address: DEMO_MAILBOX }],
        subject: `Готовность ${oLinked[3]!.orderNumber}?`,
        preview: "Когда можно забирать работу?",
        body: `Здравствуйте!\n\nПодскажите, наряд ${oLinked[3]!.orderNumber} уже можно забирать?\n\n${clinicC.name}`,
        at: hoursAgo(30),
        linkOrderId: oLinked[3]!.id,
      },
      {
        folderId: sentId,
        direction: EmailDirection.OUTBOUND,
        isRead: true,
        fromName: "Демо-почта лаборатории",
        fromAddress: DEMO_MAILBOX,
        to: [{ name: clinicA.name, address: "reception@impuls-demo.ru" }],
        subject: `Re: Скан к наряду ${o1.orderNumber}`,
        preview: "Скан получили, в работу взяли.",
        body: `Добрый день!\n\nСкан по ${o1.orderNumber} получили, наряд в работе.\n\nЛаборатория`,
        at: hoursAgo(1.5),
        linkOrderId: o1.id,
      },
      {
        folderId: sentId,
        direction: EmailDirection.OUTBOUND,
        isRead: true,
        fromName: "Демо-почта лаборатории",
        fromAddress: DEMO_MAILBOX,
        to: [{ name: docC.fullName, address: "sidorov@demo-clinic.ru" }],
        subject: `Готовность ${oLinked[4]!.orderNumber}`,
        preview: "Работа готова, можно забирать после 14:00.",
        body: `Добрый день!\n\nНаряд ${oLinked[4]!.orderNumber} готов — после 14:00 можно забирать.\n\nЛаборатория`,
        at: hoursAgo(12),
        linkOrderId: oLinked[4]!.id,
      },
      {
        folderId: inboxId,
        direction: EmailDirection.INBOUND,
        isRead: true,
        fromName: clinicD.name,
        fromAddress: "info@zhemchug-demo.ru",
        to: [{ name: "Лаборатория", address: DEMO_MAILBOX }],
        subject: `Фото припасовки ${oLinked[5]!.orderNumber}`,
        preview: "Присылаем фото после примерки.",
        body: `Добрый день!\n\nПо наряду ${oLinked[5]!.orderNumber} присылаем фото после примерки. Нужна доработка контакта.\n\n${clinicD.name}`,
        at: daysAgo(3, 11),
        linkOrderId: oLinked[5]!.id,
      },
      // Новые заявки без наряда — можно «Создать заказ» из письма
      {
        folderId: inboxId,
        direction: EmailDirection.INBOUND,
        isRead: false,
        fromName: clinicA.name,
        fromAddress: "reception@impuls-demo.ru",
        to: [{ name: "Лаборатория", address: DEMO_MAILBOX }],
        subject: "Новый заказ: коронки Zr 11, 21",
        preview: "Пациент Смирнов И.П., цвет A2, срок 10 раб. дней.",
        body: `Добрый день!\n\nКлиника: ${clinicA.name}\nВрач: ${docA.fullName}\nПациент: Смирнов И.П.\n\nЗаказ:\n— коронки циркониевые 11, 21\n— цвет A2\n— срок 10 рабочих дней\n\nСкан во вложении (демо).\n\nС уважением,\nРесепшен`,
        at: hoursAgo(6),
      },
      {
        folderId: inboxId,
        direction: EmailDirection.INBOUND,
        isRead: false,
        fromName: clinicB.name,
        fromAddress: "lab@dent-profi-demo.ru",
        to: [{ name: "Лаборатория", address: DEMO_MAILBOX }],
        subject: "Заявка: временные коронки 34–36",
        preview: "Нужны временные на 3 зуба, срочно к пятнице.",
        body: `Здравствуйте!\n\nКлиника: ${clinicB.name}\nВрач: ${docB.fullName}\nПациент: Орлова М.А.\n\nНужны временные коронки 34, 35, 36.\nСрок — к пятнице.\n\n${clinicB.name}`,
        at: hoursAgo(9),
      },
      {
        folderId: inboxId,
        direction: EmailDirection.INBOUND,
        isRead: false,
        fromName: docC.fullName,
        fromAddress: "sidorov@demo-clinic.ru",
        to: [{ name: "Лаборатория", address: DEMO_MAILBOX }],
        subject: "Частная практика: каппа на верх",
        preview: "Пациент без клиники, каппа ночная.",
        body: `Добрый день!\n\nВрач (частная практика): ${docC.fullName}\nПациент: Кузнецов Д.В.\n\nЗаказ: каппа ночная на верхнюю челюсть.\nСрок 5 рабочих дней.\n\nС уважением`,
        at: hoursAgo(14),
      },
      {
        folderId: inboxId,
        direction: EmailDirection.INBOUND,
        isRead: true,
        fromName: clinicC.name,
        fromAddress: "ordo@ulybka-demo.ru",
        to: [{ name: "Лаборатория", address: DEMO_MAILBOX }],
        subject: "Мост 3 ед. Zr 45–47",
        preview: "Цвет A3, каркас на примерку.",
        body: `Добрый день!\n\nКлиника: ${clinicC.name}\nВрач: ${doctors[3]!.fullName}\nПациент: Васильева Е.Н.\n\nМост циркониевый 45–47, цвет A3.\nСначала каркас на примерку.\n\n${clinicC.name}`,
        at: daysAgo(1, 15),
      },
      {
        folderId: inboxId,
        direction: EmailDirection.INBOUND,
        isRead: true,
        fromName: clinicD.name,
        fromAddress: "info@zhemchug-demo.ru",
        to: [{ name: "Лаборатория", address: DEMO_MAILBOX }],
        subject: "Виниры 12–22",
        preview: "6 виниров E.max, фото во вложении.",
        body: `Здравствуйте!\n\nКлиника: ${clinicD.name}\nВрач: ${doctors[4]!.fullName}\nПациент: Николаева С.И.\n\nВиниры 12, 11, 21, 22 (и по ситуации 13, 23).\nМатериал E.max, фото улыбки приложили.\n\n${clinicD.name}`,
        at: daysAgo(2, 9),
      },
      {
        folderId: inboxId,
        direction: EmailDirection.INBOUND,
        isRead: false,
        fromName: clinics[4]!.name,
        fromAddress: "mail@ortodent-demo.ru",
        to: [{ name: "Лаборатория", address: DEMO_MAILBOX }],
        subject: "Абатмент Multi-unit + коронка 36",
        preview: "Имплант Straumann, срочно.",
        body: `Добрый день!\n\nКлиника: ${clinics[4]!.name}\nВрач: ${doctors[5]!.fullName}\nПациент: Фролов А.К.\n\nНужен абатмент Multi-unit и коронка Zr на 36.\nПлатформа Straumann.\n\nС уважением`,
        at: hoursAgo(20),
      },
      {
        folderId: inboxId,
        direction: EmailDirection.INBOUND,
        isRead: true,
        fromName: "Поставщик Циркон+",
        fromAddress: "sales@zircon-plus-demo.ru",
        to: [{ name: "Лаборатория", address: DEMO_MAILBOX }],
        subject: "Счёт на диски ZrO2",
        preview: "Счёт во вложении (демо без файла).",
        body: "Добрый день!\n\nНаправляем счёт на диски ZrO2. Оплата по реквизитам в письме.\n\nЦиркон+",
        at: daysAgo(4, 10),
      },
      {
        folderId: inboxId,
        direction: EmailDirection.INBOUND,
        isRead: true,
        fromName: "Курьерская служба",
        fromAddress: "dispatch@courier-demo.ru",
        to: [{ name: "Лаборатория", address: DEMO_MAILBOX }],
        subject: "Забор завтра 11:00–13:00",
        preview: "Подтверждаем окно забора на завтра.",
        body: "Подтверждаем забор завтра с 11:00 до 13:00.\n\nКурьерская служба",
        at: hoursAgo(8),
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
    await seedOrderChat(
      o1.id,
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
      o2.id,
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
    await seedOrderChat(o3.id, [
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

  },
    { maxWait: 60_000, timeout: 180_000 },
  );
}

export { OWNER_ID, OWNER_EMAIL };
