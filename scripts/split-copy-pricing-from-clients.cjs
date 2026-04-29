const { PrismaClient } = require("@prisma/client");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function envUrl(name) {
  return String(process.env[name] || "").trim();
}

function resolvePrismaVersion() {
  try {
    const vf = path.join(process.cwd(), ".prisma-cli-version");
    const v = fs.readFileSync(vf, "utf8").trim();
    if (v) return v;
  } catch {}
  return "6.19.3";
}

function ensurePricingSchema() {
  const ver = resolvePrismaVersion();
  const spec = `prisma@${ver}`;
  const r = spawnSync(
    "npx",
    ["-y", spec, "db", "push", "--schema=prisma/pricing/schema.prisma", "--skip-generate"],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    },
  );
  if (r.status !== 0) {
    throw new Error(`db push pricing failed with code ${r.status ?? -1}`);
  }
}

function chunked(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function createManyChunked(model, rows) {
  if (!rows.length) return;
  const chunks = chunked(rows, 500);
  for (const ch of chunks) {
    await model.createMany({ data: ch });
  }
}

async function listTables(db) {
  const rows = await db.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type = 'table'",
  );
  return new Set(
    Array.isArray(rows)
      ? rows
          .map((r) => (r && typeof r === "object" ? String(r.name || "") : ""))
          .filter(Boolean)
      : [],
  );
}

async function main() {
  const clientsUrl = envUrl("CLIENTS_DATABASE_URL") || envUrl("DATABASE_URL");
  const pricingUrl = envUrl("PRICING_DATABASE_URL");
  if (!clientsUrl) {
    throw new Error("Не задан CLIENTS_DATABASE_URL/DATABASE_URL");
  }
  if (!pricingUrl) {
    throw new Error("Не задан PRICING_DATABASE_URL");
  }
  if (clientsUrl === pricingUrl) {
    console.log("split-copy-pricing: source == target, пропускаем.");
    return;
  }

  const src = new PrismaClient({
    log: ["error"],
    datasources: { db: { url: clientsUrl } },
  });
  const dst = new PrismaClient({
    log: ["error"],
    datasources: { db: { url: pricingUrl } },
  });

  try {
    ensurePricingSchema();
    const [srcTables, dstTables] = await Promise.all([
      listTables(src),
      listTables(dst),
    ]);
    const expected = [
      "ConstructionType",
      "Material",
      "PriceList",
      "PriceListWorkspaceSettings",
      "PriceListItem",
      "ClinicPriceOverride",
      "Warehouse",
      "InventoryItem",
      "StockBalance",
      "StockMovement",
    ];
    const missingDst = expected.filter((t) => !dstTables.has(t));
    if (missingDst.length > 0) {
      if (missingDst.length === expected.length) {
        throw new Error(
          "target pricing DB не содержит ни одной ожидаемой таблицы. Проверьте PRICING_DATABASE_URL и db push.",
        );
      }
      console.warn(
        `split-copy-pricing: в target нет таблиц (${missingDst.join(", ")}), копирование этих сущностей будет пропущено.`,
      );
    }
    const hasSrc = (t) => srcTables.has(t);
    const hasDst = (t) => dstTables.has(t);
    console.log("split-copy-pricing: читаем source...");
    const [
      constructionTypes,
      materials,
      priceLists,
      workspaceSettings,
      priceListItems,
      clinicPriceOverrides,
      warehouses,
      inventoryItems,
      stockBalances,
      stockMovements,
    ] = await Promise.all([
      hasSrc("ConstructionType")
        ? src.constructionType.findMany()
        : Promise.resolve([]),
      hasSrc("Material") ? src.material.findMany() : Promise.resolve([]),
      hasSrc("PriceList") ? src.priceList.findMany() : Promise.resolve([]),
      hasSrc("PriceListWorkspaceSettings")
        ? src.priceListWorkspaceSettings.findMany()
        : Promise.resolve([]),
      hasSrc("PriceListItem") ? src.priceListItem.findMany() : Promise.resolve([]),
      hasSrc("ClinicPriceOverride")
        ? src.clinicPriceOverride.findMany()
        : Promise.resolve([]),
      hasSrc("Warehouse") ? src.warehouse.findMany() : Promise.resolve([]),
      hasSrc("InventoryItem")
        ? src.inventoryItem.findMany()
        : Promise.resolve([]),
      hasSrc("StockBalance") ? src.stockBalance.findMany() : Promise.resolve([]),
      hasSrc("StockMovement")
        ? src.stockMovement.findMany()
        : Promise.resolve([]),
    ]);

    console.log("split-copy-pricing: очищаем target...");
    if (hasDst("StockMovement")) await dst.stockMovement.deleteMany();
    if (hasDst("StockBalance")) await dst.stockBalance.deleteMany();
    if (hasDst("InventoryItem")) await dst.inventoryItem.deleteMany();
    if (hasDst("Warehouse")) await dst.warehouse.deleteMany();
    if (hasDst("ClinicPriceOverride")) await dst.clinicPriceOverride.deleteMany();
    if (hasDst("PriceListItem")) await dst.priceListItem.deleteMany();
    if (hasDst("PriceListWorkspaceSettings")) {
      await dst.priceListWorkspaceSettings.deleteMany();
    }
    if (hasDst("PriceList")) await dst.priceList.deleteMany();
    if (hasDst("Material")) await dst.material.deleteMany();
    if (hasDst("ConstructionType")) await dst.constructionType.deleteMany();

    console.log("split-copy-pricing: пишем target...");
    if (hasDst("ConstructionType")) {
      await createManyChunked(dst.constructionType, constructionTypes);
    }
    if (hasDst("Material")) await createManyChunked(dst.material, materials);
    if (hasDst("PriceList")) await createManyChunked(dst.priceList, priceLists);
    if (hasDst("PriceListWorkspaceSettings")) {
      await createManyChunked(dst.priceListWorkspaceSettings, workspaceSettings);
    }
    if (hasDst("PriceListItem")) {
      await createManyChunked(dst.priceListItem, priceListItems);
    }
    if (hasDst("ClinicPriceOverride")) {
      await createManyChunked(dst.clinicPriceOverride, clinicPriceOverrides);
    }
    if (hasDst("Warehouse")) await createManyChunked(dst.warehouse, warehouses);
    if (hasDst("InventoryItem")) {
      await createManyChunked(dst.inventoryItem, inventoryItems);
    }
    if (hasDst("StockBalance")) {
      await createManyChunked(dst.stockBalance, stockBalances);
    }
    if (hasDst("StockMovement")) {
      await createManyChunked(dst.stockMovement, stockMovements);
    }

    console.log("split-copy-pricing: OK");
    console.log(
      JSON.stringify(
        {
          constructionTypes: constructionTypes.length,
          materials: materials.length,
          priceLists: priceLists.length,
          priceListItems: priceListItems.length,
          clinicPriceOverrides: clinicPriceOverrides.length,
          warehouses: warehouses.length,
          inventoryItems: inventoryItems.length,
          stockBalances: stockBalances.length,
          stockMovements: stockMovements.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await src.$disconnect();
    await dst.$disconnect();
  }
}

main().catch((e) => {
  console.error("split-copy-pricing: FAILED", e);
  process.exit(1);
});

