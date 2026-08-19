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

    const createdOrders: { id: string; orderNumber: string }[] = [];
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

      const order = await tx.order.create({
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
          kaitenTrackLane: null,
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
            ],
          },
        },
        select: { id: true, orderNumber: true },
      });
      createdOrders.push(order);
    }

    const mailAccount = await tx.emailAccount.create({
      data: {
        tenantId: DEFAULT_TENANT_ID,
        createdByUserId: OWNER_ID,
        email: DEMO_MAILBOX,
        displayName: "Демо-почта лаборатории",
        encryptedAppPassword: null,
        allowedRoles: [UserRole.OWNER, UserRole.ADMINISTRATOR],
        isActive: true,
        lastSyncAt: hoursAgo(1),
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
    const o1 = createdOrders[0]!;
    const o2 = createdOrders[1]!;
    const o3 = createdOrders[2]!;

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
        fromName: "Клиника Импульс",
        fromAddress: "reception@impuls-demo.ru",
        to: [{ name: "Лаборатория", address: DEMO_MAILBOX }],
        subject: `Скан к наряду ${o1.orderNumber}`,
        preview: "Добрый день! Прикладываем скан, можно брать в работу.",
        body: `Добрый день!\n\nПо наряду ${o1.orderNumber} отправили скан.\nМожно брать в работу.\n\nС уважением,\nКлиника Импульс`,
        at: hoursAgo(5),
        linkOrderId: o1.id,
      },
      {
        folderId: inboxId,
        direction: EmailDirection.INBOUND,
        isRead: false,
        fromName: "Д-р Петрова",
        fromAddress: "petrova@dent-demo.ru",
        to: [{ name: "Лаборатория", address: DEMO_MAILBOX }],
        subject: `Уточнение по ${o2.orderNumber}`,
        preview: "Можно ли сдвинуть срок на 2 дня?",
        body: `Здравствуйте!\n\nПо наряду ${o2.orderNumber} можно ли сдвинуть срок сдачи на 2 дня?\n\nПетрова О.В.`,
        at: hoursAgo(3),
        linkOrderId: o2.id,
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
        at: hoursAgo(28),
      },
      {
        folderId: sentId,
        direction: EmailDirection.OUTBOUND,
        isRead: true,
        fromName: "Демо-почта лаборатории",
        fromAddress: DEMO_MAILBOX,
        to: [{ name: "Клиника Импульс", address: "reception@impuls-demo.ru" }],
        subject: `Re: Скан к наряду ${o1.orderNumber}`,
        preview: "Скан получили, в работу взяли.",
        body: `Добрый день!\n\nСкан по ${o1.orderNumber} получили, наряд в работе.\n\nЛаборатория`,
        at: hoursAgo(4),
        linkOrderId: o1.id,
      },
      {
        folderId: sentId,
        direction: EmailDirection.OUTBOUND,
        isRead: true,
        fromName: "Демо-почта лаборатории",
        fromAddress: DEMO_MAILBOX,
        to: [{ name: "Д-р Сидоров", address: "sidorov@demo-clinic.ru" }],
        subject: `Готовность ${o3.orderNumber}`,
        preview: "Работа почти готова, завтра можно забирать.",
        body: `Добрый день!\n\nНаряд ${o3.orderNumber} почти готов — завтра после 14:00 можно забирать.\n\nЛаборатория`,
        at: hoursAgo(10),
        linkOrderId: o3.id,
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

  });
}

export { OWNER_ID, OWNER_EMAIL };
