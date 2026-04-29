/**
 * Одноразовый backfill: Tenant «default» + проставить tenantId во всех сущностях.
 * Запуск: node --env-file=.env scripts/backfill-tenant-ids.cjs
 */
const { PrismaClient } = require("@prisma/client");

const DEFAULT_TENANT_ID = "cltenantdefault0000000000";
const LEGACY_ORDER_NUMBER_ID = "default";
const DEFAULT_SLUG = "default";

async function main() {
  const p = new PrismaClient();
  try {
    await p.tenant.upsert({
      where: { id: DEFAULT_TENANT_ID },
      create: {
        id: DEFAULT_TENANT_ID,
        slug: DEFAULT_SLUG,
        name: "Организация",
        plan: "ULTRA",
        addonKanban: true,
      },
      update: {},
    });

    await p.user.updateMany({
      where: { tenantId: null },
      data: { tenantId: DEFAULT_TENANT_ID },
    });
    await p.clinic.updateMany({
      where: { tenantId: null },
      data: { tenantId: DEFAULT_TENANT_ID },
    });
    await p.doctor.updateMany({
      where: { tenantId: null },
      data: { tenantId: DEFAULT_TENANT_ID },
    });
    await p.courier.updateMany({
      where: { tenantId: null },
      data: { tenantId: DEFAULT_TENANT_ID },
    });
    await p.kaitenCardType.updateMany({
      where: { tenantId: null },
      data: { tenantId: DEFAULT_TENANT_ID },
    });
    await p.order.updateMany({
      where: { tenantId: null },
      data: { tenantId: DEFAULT_TENANT_ID },
    });

    const ons = await p.orderNumberSettings.findUnique({
      where: { id: LEGACY_ORDER_NUMBER_ID },
    });
    const ons2 = await p.orderNumberSettings.findUnique({
      where: { id: DEFAULT_TENANT_ID },
    });
    if (ons && !ons2) {
      await p.orderNumberSettings.delete({ where: { id: LEGACY_ORDER_NUMBER_ID } });
      await p.orderNumberSettings.create({
        data: {
          id: DEFAULT_TENANT_ID,
          postingYearMonth: ons.postingYearMonth,
          nextSequenceFloor: ons.nextSequenceFloor,
        },
      });
    } else if (!ons && !ons2) {
      await p.orderNumberSettings.create({
        data: { id: DEFAULT_TENANT_ID, postingYearMonth: "0001" },
      });
    }

    console.log("backfill-tenant-ids: ok");
  } finally {
    await p.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
