import type { PrismaClient } from "@prisma/client";
import {
  ConstructionCategory,
  DemoKanbanColumn,
  KaitenTrackLane,
  LabWorkStatus,
  OrderStatus,
  UserRole,
} from "@prisma/client";
import { emptyProsthetics, prostheticsToJson } from "@/lib/order-prosthetics";
import { ORDER_NUMBER_SETTINGS_ID } from "@/lib/order-number";
import { ensureKaitenDirectory } from "@/lib/kaiten-directory-bootstrap";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-constants";

const OWNER_ID = "cm_demo_owner_user_v1";
const OWNER_EMAIL = "owner@demo.crm";

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

/** Есть ли уже сид демо (для режима без принудительного reseed при каждом входе). */
export async function isDemoDatabaseSeeded(db: PrismaClient): Promise<boolean> {
  const u = await db.user.findUnique({
    where: { id: OWNER_ID },
    select: { id: true },
  });
  return Boolean(u);
}

/** Полная демо-выгрузка: клиники, врачи, наряды, прайс, склад, курьеры, типы карточек. */
export async function seedDemoDatabase(db: PrismaClient): Promise<void> {
  await db.$transaction(async (tx) => {
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
      data: { id: ORDER_NUMBER_SETTINGS_ID, postingYearMonth: "2604" },
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

    /** Названия позиций — в канбане демо типы карточек: `demoKanbanPriceCardTypes()` в `lib/kanban/model.ts`. */
    const priceItems = await Promise.all(
      [
        { code: "D1001", name: "Диагностика и план", priceRub: 2500, leadWorkingDays: 1 },
        { code: "D1002", name: "Временная коронка", priceRub: 4200, leadWorkingDays: 3 },
        { code: "D1003", name: "Коронка МК", priceRub: 12000, leadWorkingDays: 7 },
        { code: "D1004", name: "Коронка Zr", priceRub: 18500, leadWorkingDays: 10 },
        { code: "D1005", name: "Съёмный протез", priceRub: 28000, leadWorkingDays: 14 },
      ].map((row, i) =>
        tx.priceListItem.create({
          data: {
            priceListId: demoPriceList.id,
            code: row.code,
            name: row.name,
            sectionTitle: "Демо-прайс",
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
        name: "Склад материалов",
        isDefault: true,
        isActive: true,
        notes: "Демо: расходники и материалы",
      },
    });
    const whPros = await tx.warehouse.create({
      data: {
        name: "Склад протетики",
        isDefault: false,
        isActive: true,
        notes: "Демо: заготовки и CAD/CAM",
      },
    });

    const invMat = await Promise.all(
      materials.map((m, i) =>
        tx.inventoryItem.create({
          data: {
            warehouseId: whMat.id,
            name: `Склад: ${m.name}`,
            unit: "шт",
            sortOrder: i,
            isActive: true,
            unitsPerSupply: 10,
            referenceUnitPriceRub: 12,
          },
        }),
      ),
    );

    const invPros = await Promise.all([
      tx.inventoryItem.create({
        data: {
          warehouseId: whPros.id,
          name: "Циркониевый диск 98 мм",
          unit: "шт",
          sortOrder: 0,
          isActive: true,
          manufacturer: "Демо-производитель",
        },
      }),
      tx.inventoryItem.create({
        data: {
          warehouseId: whPros.id,
          name: "Абатменты титановые",
          unit: "шт",
          sortOrder: 1,
          isActive: true,
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

    const clinics = await Promise.all([
      tx.clinic.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          name: "Демо — стоматология «Импульс»",
          address: "г. Москва, ул. Примерная, д. 10",
          isActive: true,
          phone: "+74951110010",
        },
      }),
      tx.clinic.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          name: "Демо — клиника «Дент-Профи»",
          address: "г. Москва, пр-т Демонстрационный, д. 22",
          isActive: true,
          phone: "+74952220022",
        },
      }),
    ]);

    const doctors = await Promise.all([
      tx.doctor.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          fullName: "Соколова Мария Петровна",
          lastName: "Соколова",
          firstName: "Мария",
          patronymic: "Петровна",
          specialty: "Ортопед",
          city: "Москва",
          acceptsPrivatePractice: false,
        },
      }),
      tx.doctor.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          fullName: "Кузнецов Андрей Викторович",
          lastName: "Кузнецов",
          firstName: "Андрей",
          patronymic: "Викторович",
          specialty: "Хирург",
          city: "Москва",
          acceptsPrivatePractice: false,
        },
      }),
      tx.doctor.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          fullName: "Новикова Елена Сергеевна",
          lastName: "Новикова",
          firstName: "Елена",
          patronymic: "Сергеевна",
          specialty: "Терапевт",
          city: "Москва",
          acceptsPrivatePractice: false,
        },
      }),
      tx.doctor.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          fullName: "Волков Дмитрий Олегович",
          lastName: "Волков",
          firstName: "Дмитрий",
          patronymic: "Олегович",
          specialty: "Ортопед",
          city: "Москва",
          acceptsPrivatePractice: false,
        },
      }),
      tx.doctor.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          fullName: "Лебедев Игорь Николаевич",
          lastName: "Лебедев",
          firstName: "Игорь",
          patronymic: "Николаевич",
          specialty: "Ортопед",
          city: "Москва",
          acceptsPrivatePractice: true,
        },
      }),
    ]);

    const [d0, d1, d2, d3, d4] = doctors;
    const [clinicImpuls, clinicDentProfi] = clinics;
    const links: Array<{ doctorId: string; clinicId: string }> = [
      { doctorId: d0.id, clinicId: clinicImpuls.id },
      { doctorId: d1.id, clinicId: clinicImpuls.id },
      { doctorId: d2.id, clinicId: clinicImpuls.id },
      { doctorId: d3.id, clinicId: clinicDentProfi.id },
      { doctorId: d4.id, clinicId: clinicDentProfi.id },
    ];
    for (const row of links) {
      await tx.doctorOnClinic.create({ data: row });
    }

    const orderSeeds = [
      { i: 1, doctor: d0, clinic: clinicImpuls, col: DemoKanbanColumn.NEW },
      { i: 2, doctor: d1, clinic: clinicImpuls, col: DemoKanbanColumn.IN_PROGRESS },
      { i: 3, doctor: d3, clinic: clinicDentProfi, col: DemoKanbanColumn.IN_PROGRESS },
      { i: 4, doctor: d4, clinic: null, col: DemoKanbanColumn.DONE },
    ] as const;

    const patientNames = [
      "Иванов А.С. (11, 12 коронки)",
      "Петрова О.В. (временная 21)",
      "Сидоров П.К. (цирконий 36)",
      "Козлова Н.Д. (частная практика, съёмный)",
    ];

    for (let ix = 0; ix < orderSeeds.length; ix++) {
      const row = orderSeeds[ix]!;
      const i = row.i;
      const doc = row.doctor;
      const clinic = row.clinic;
      const col = row.col;
      const kt = kaitenTypes[ix % 4]!;
      const courierPick = couriers[ix % 2]!;
      const courierDel = couriers[(ix + 1) % 2]!;
      const dueLab = new Date();
      dueLab.setUTCDate(dueLab.getUTCDate() + 14 + i);
      const dueAdm = new Date();
      dueAdm.setUTCDate(dueAdm.getUTCDate() + 2 + (i % 6));

      await tx.order.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          orderNumber: `2604-${pad3(i)}`,
          clinicId: clinic?.id ?? null,
          doctorId: doc.id,
          patientName: patientNames[ix] ?? `Пациент демо ${i}`,
          status: OrderStatus.IN_PROGRESS,
          labWorkStatus: LabWorkStatus.PRODUCTION,
          dueDate: dueLab,
          dueToAdminsAt: dueAdm,
          appointmentDate: dueAdm,
          demoKanbanColumn: col,
          kaitenCardTypeId: kt.id,
          kaitenTrackLane: KaitenTrackLane.ORTHOPEDICS,
          kaitenDecideLater: false,
          prosthetics: prostheticsToJson(emptyProsthetics()),
          courierPickupId: courierPick.id,
          courierDeliveryId: courierDel.id,
          registeredByLabel: "Демо CRM",
          constructions: {
            create: [
              {
                category: ConstructionCategory.PRICE_LIST,
                priceListItemId: priceItems[ix % 5]!.id,
                quantity: 1,
                unitPrice: priceItems[ix % 5]!.priceRub,
                sortOrder: 0,
              },
              {
                category: ConstructionCategory.FIXED,
                constructionTypeId: constructionTypes[ix % 2]!.id,
                materialId: materials[ix % 5]!.id,
                teethFdi: ["11", "12"],
                quantity: 1,
                unitPrice: 5000,
                sortOrder: 1,
              },
            ],
          },
        },
      });
    }

  });
}

export { OWNER_ID, OWNER_EMAIL };
