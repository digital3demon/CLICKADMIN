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

function ensureOrdersSchema() {
  const ver = resolvePrismaVersion();
  const spec = `prisma@${ver}`;
  const r = spawnSync(
    "npx",
    ["-y", spec, "db", "push", "--schema=prisma/orders/schema.prisma", "--skip-generate"],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    },
  );
  if (r.status !== 0) {
    throw new Error(`db push orders failed with code ${r.status ?? -1}`);
  }
}

function chunked(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function createManyChunked(model, rows, chunkSize = 500) {
  if (!rows.length) return;
  const chunks = chunked(rows, chunkSize);
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
  const ordersUrl = envUrl("ORDERS_DATABASE_URL");
  if (!clientsUrl) {
    throw new Error("Не задан CLIENTS_DATABASE_URL/DATABASE_URL");
  }
  if (!ordersUrl) {
    throw new Error("Не задан ORDERS_DATABASE_URL");
  }
  if (clientsUrl === ordersUrl) {
    console.log("split-copy-orders: source == target, пропускаем.");
    return;
  }

  const src = new PrismaClient({
    log: ["error"],
    datasources: { db: { url: clientsUrl } },
  });
  const dst = new PrismaClient({
    log: ["error"],
    datasources: { db: { url: ordersUrl } },
  });

  try {
    ensureOrdersSchema();
    const [srcTables, dstTables] = await Promise.all([
      listTables(src),
      listTables(dst),
    ]);
    const expected = [
      "OrderNumberSettings",
      "Order",
      "OrderAttachment",
      "OrderConstruction",
      "OrderRevision",
      "OrderCustomTag",
      "OrderChatCorrection",
      "OrderProstheticsRequest",
    ];
    const missingDst = expected.filter((t) => !dstTables.has(t));
    if (missingDst.length > 0) {
      if (missingDst.length === expected.length) {
        throw new Error(
          "target orders DB не содержит ни одной ожидаемой таблицы. Проверьте ORDERS_DATABASE_URL и db push.",
        );
      }
      console.warn(
        `split-copy-orders: в target нет таблиц (${missingDst.join(", ")}), копирование этих сущностей будет пропущено.`,
      );
    }
    const hasSrc = (t) => srcTables.has(t);
    const hasDst = (t) => dstTables.has(t);
    console.log("split-copy-orders: читаем source...");
    const [
      orderNumberSettings,
      orders,
      orderAttachments,
      orderConstructions,
      orderRevisions,
      orderCustomTags,
      orderChatCorrections,
      orderProstheticsRequests,
    ] = await Promise.all([
      hasSrc("OrderNumberSettings")
        ? src.orderNumberSettings.findMany()
        : Promise.resolve([]),
      hasSrc("Order") ? src.order.findMany() : Promise.resolve([]),
      hasSrc("OrderAttachment")
        ? src.orderAttachment.findMany()
        : Promise.resolve([]),
      hasSrc("OrderConstruction")
        ? src.orderConstruction.findMany()
        : Promise.resolve([]),
      hasSrc("OrderRevision")
        ? src.orderRevision.findMany()
        : Promise.resolve([]),
      hasSrc("OrderCustomTag")
        ? src.orderCustomTag.findMany()
        : Promise.resolve([]),
      hasSrc("OrderChatCorrection")
        ? src.orderChatCorrection.findMany()
        : Promise.resolve([]),
      hasSrc("OrderProstheticsRequest")
        ? src.orderProstheticsRequest.findMany()
        : Promise.resolve([]),
    ]);

    console.log("split-copy-orders: очищаем target...");
    if (hasDst("OrderProstheticsRequest")) await dst.orderProstheticsRequest.deleteMany();
    if (hasDst("OrderChatCorrection")) await dst.orderChatCorrection.deleteMany();
    if (hasDst("OrderCustomTag")) await dst.orderCustomTag.deleteMany();
    if (hasDst("OrderRevision")) await dst.orderRevision.deleteMany();
    if (hasDst("OrderConstruction")) await dst.orderConstruction.deleteMany();
    if (hasDst("OrderAttachment")) await dst.orderAttachment.deleteMany();
    if (hasDst("Order")) await dst.order.deleteMany();
    if (hasDst("OrderNumberSettings")) await dst.orderNumberSettings.deleteMany();

    console.log("split-copy-orders: пишем target...");
    if (hasDst("OrderNumberSettings")) {
      await createManyChunked(dst.orderNumberSettings, orderNumberSettings);
    }
    if (hasDst("Order")) await createManyChunked(dst.order, orders, 300);
    if (hasDst("OrderAttachment")) {
      await createManyChunked(dst.orderAttachment, orderAttachments, 50);
    }
    if (hasDst("OrderConstruction")) {
      await createManyChunked(dst.orderConstruction, orderConstructions, 300);
    }
    if (hasDst("OrderRevision")) {
      await createManyChunked(dst.orderRevision, orderRevisions, 300);
    }
    if (hasDst("OrderCustomTag")) {
      await createManyChunked(dst.orderCustomTag, orderCustomTags, 500);
    }
    if (hasDst("OrderChatCorrection")) {
      await createManyChunked(dst.orderChatCorrection, orderChatCorrections, 300);
    }
    if (hasDst("OrderProstheticsRequest")) {
      await createManyChunked(
        dst.orderProstheticsRequest,
        orderProstheticsRequests,
        300,
      );
    }

    console.log("split-copy-orders: OK");
    console.log(
      JSON.stringify(
        {
          orderNumberSettings: orderNumberSettings.length,
          orders: orders.length,
          orderAttachments: orderAttachments.length,
          orderConstructions: orderConstructions.length,
          orderRevisions: orderRevisions.length,
          orderCustomTags: orderCustomTags.length,
          orderChatCorrections: orderChatCorrections.length,
          orderProstheticsRequests: orderProstheticsRequests.length,
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
  console.error("split-copy-orders: FAILED", e);
  process.exit(1);
});

