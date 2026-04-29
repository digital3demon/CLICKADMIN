/**
 * Сводит версии просчёта в одну:
 * - создаёт/обновляет целевую версию "Прайс версия 1.2026";
 * - переносит колонки, пулы, строки, профили и постоянные расходы;
 * - удаляет старые версии "Атрибьют" и "Основной 01.01.2026 (шаблон)".
 *
 * Запуск:
 * node --env-file=.env scripts/consolidate-costing-versions.cjs
 */

const { PrismaClient } = require("@prisma/client");

const TARGET_TITLE = "Прайс версия 1.2026";
const SOURCE_TITLES = ["Атрибьют", "Основной 01.01.2026 (шаблон)", "Основной прайс"];

function asObj(v) {
  if (v && typeof v === "object" && !Array.isArray(v)) return v;
  return {};
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const sources = await prisma.costingVersion.findMany({
      where: { title: { in: SOURCE_TITLES } },
      orderBy: [{ createdAt: "desc" }],
      include: {
        columns: { orderBy: { sortOrder: "asc" } },
        sharedPools: { orderBy: { sortOrder: "asc" } },
        lines: {
          orderBy: { createdAt: "asc" },
          include: { poolShares: true },
        },
        profiles: { orderBy: { createdAt: "asc" } },
        fixedCostItems: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (sources.length === 0) {
      throw new Error("Не найдены исходные версии для переноса.");
    }

    const mainSource = [...sources].sort(
      (a, b) => b.lines.length - a.lines.length || b.columns.length - a.columns.length,
    )[0];

    let target = await prisma.costingVersion.findFirst({
      where: { title: TARGET_TITLE },
      select: { id: true },
    });
    if (!target) {
      target = await prisma.costingVersion.create({
        data: {
          title: TARGET_TITLE,
          archived: false,
          effectiveFrom: new Date("2026-01-01T12:00:00.000Z"),
          fixedCostsPeriodNote: mainSource.fixedCostsPeriodNote ?? null,
          expectedWorksPerMonth: mainSource.expectedWorksPerMonth ?? null,
          monthlyFixedCostsRub: 0,
        },
        select: { id: true },
      });
    }

    const targetId = target.id;

    await prisma.$transaction(async (tx) => {
      await tx.costingLinePoolShare.deleteMany({
        where: { line: { versionId: targetId } },
      });
      await tx.costingLine.deleteMany({ where: { versionId: targetId } });
      await tx.costingSharedPool.deleteMany({ where: { versionId: targetId } });
      await tx.costingClientProfile.deleteMany({ where: { versionId: targetId } });
      await tx.costingFixedCostItem.deleteMany({ where: { versionId: targetId } });
      await tx.costingColumn.deleteMany({ where: { versionId: targetId } });
    });

    await prisma.costingColumn.createMany({
      data: mainSource.columns.map((c) => ({
        versionId: targetId,
        key: c.key,
        label: c.label,
        kind: c.kind,
        formula: c.formula,
        sortOrder: c.sortOrder,
        hint: c.hint,
      })),
    });

    const poolByKey = new Map();
    for (const src of sources) {
      for (const p of src.sharedPools) {
        if (poolByKey.has(p.key)) continue;
        const created = await prisma.costingSharedPool.create({
          data: {
            versionId: targetId,
            key: p.key,
            label: p.label,
            totalRub: p.totalRub,
            sortOrder: p.sortOrder,
          },
          select: { id: true, key: true },
        });
        poolByKey.set(created.key, created.id);
      }
    }

    const lineIdByPriceItemId = new Map();
    let createdLines = 0;
    for (const src of sources) {
      const srcPoolsById = new Map(src.sharedPools.map((p) => [p.id, p.key]));
      for (const ln of src.lines) {
        const key = ln.priceListItemId ? `pli:${ln.priceListItemId}` : `note:${ln.note ?? ""}`;
        if (lineIdByPriceItemId.has(key)) continue;

        const created = await prisma.costingLine.create({
          data: {
            versionId: targetId,
            priceListItemId: ln.priceListItemId,
            note: ln.note,
            inputsJson: asObj(ln.inputsJson),
          },
          select: { id: true },
        });
        lineIdByPriceItemId.set(key, created.id);
        createdLines += 1;

        const sharesRows = [];
        for (const sh of ln.poolShares) {
          const poolKey = srcPoolsById.get(sh.poolId);
          if (!poolKey) continue;
          const targetPoolId = poolByKey.get(poolKey);
          if (!targetPoolId) continue;
          if (!Number.isFinite(sh.shareRub) || sh.shareRub === 0) continue;
          sharesRows.push({
            lineId: created.id,
            poolId: targetPoolId,
            shareRub: sh.shareRub,
          });
        }
        if (sharesRows.length > 0) {
          await prisma.costingLinePoolShare.createMany({ data: sharesRows });
        }
      }
    }

    const profileSeen = new Set();
    for (const src of sources) {
      for (const p of src.profiles) {
        const dedupe = `${p.name}::${p.clinicId ?? ""}`;
        if (profileSeen.has(dedupe)) continue;
        profileSeen.add(dedupe);
        await prisma.costingClientProfile.create({
          data: {
            versionId: targetId,
            clinicId: p.clinicId,
            name: p.name,
            listDiscountPercent: p.listDiscountPercent,
            note: p.note,
          },
        });
      }
    }

    const fixedSeen = new Set();
    let sortOrder = 0;
    for (const src of sources) {
      for (const it of src.fixedCostItems) {
        const dedupe = it.label.trim().toLowerCase();
        if (fixedSeen.has(dedupe)) continue;
        fixedSeen.add(dedupe);
        sortOrder += 10;
        await prisma.costingFixedCostItem.create({
          data: {
            versionId: targetId,
            label: it.label,
            amountRub: it.amountRub,
            sortOrder,
          },
        });
      }
    }

    const fixedSum = await prisma.costingFixedCostItem.aggregate({
      where: { versionId: targetId },
      _sum: { amountRub: true },
    });

    await prisma.costingVersion.update({
      where: { id: targetId },
      data: {
        title: TARGET_TITLE,
        archived: false,
        effectiveFrom: new Date("2026-01-01T12:00:00.000Z"),
        fixedCostsPeriodNote: mainSource.fixedCostsPeriodNote ?? null,
        expectedWorksPerMonth: mainSource.expectedWorksPerMonth ?? null,
        monthlyFixedCostsRub: fixedSum._sum.amountRub ?? 0,
      },
    });

    for (const src of sources) {
      if (src.id === targetId) continue;
      await prisma.costingVersion.delete({ where: { id: src.id } });
    }

    const final = await prisma.costingVersion.findUnique({
      where: { id: targetId },
      include: {
        _count: {
          select: { columns: true, lines: true, profiles: true, sharedPools: true, fixedCostItems: true },
        },
      },
    });

    console.log("Готово: версии объединены.");
    console.log("targetId:", targetId);
    console.log("title:", TARGET_TITLE);
    console.log("lines imported:", createdLines);
    console.log("counts:", final?._count);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
