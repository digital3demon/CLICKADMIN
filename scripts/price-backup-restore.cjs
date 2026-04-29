/**
 * Снимок прайс-листа (таблица PriceListItem) в JSON и восстановление из него.
 *
 * Снимок контрагентов (contractors-snapshot.json) прайс НЕ содержит — делайте
 * отдельный экспорт после наполнения прайса.
 *
 * ВОССТАНОВЛЕНИЕ «с нуля», если нет JSON:
 *   1) Положите файл Excel в data/imports/прайс.xlsx (формат см. import-price-xlsx.cjs)
 *   2) npm run import:price
 *
 * Экспорт:
 *   npm run db:price:export
 *   npm run db:price:export -- data/backup/moi-prais.json
 *
 * Импорт (upsert по полю code, существующие позиции обновляются):
 *   npm run db:price:import
 */

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const SNAPSHOT_VERSION = 1;
const DEFAULT_OUT = path.join("data", "backup", "price-snapshot.json");

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
  const pos = [];
  for (let i = 1; i < args.length; i++) {
    if (!args[i].startsWith("-")) pos.push(args[i]);
  }
  return { cmd, filePath: pos[0] || null };
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

async function sqliteTableExists(prisma, tableName) {
  if (tableName !== "PriceListItem") return false;
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

function itemCreateUpdate(row) {
  const base = {
    name: String(row.name ?? "").slice(0, 400),
    sectionTitle: row.sectionTitle ?? null,
    subsectionTitle: row.subsectionTitle ?? null,
    priceRub: Math.max(0, Math.floor(Number(row.priceRub) || 0)),
    leadWorkingDays:
      row.leadWorkingDays == null
        ? null
        : Math.max(0, Math.floor(Number(row.leadWorkingDays))),
    description: row.description ?? null,
    isActive: Boolean(row.isActive),
    sortOrder: Math.floor(Number(row.sortOrder) || 0),
  };
  const createdAt = parseDate(row.createdAt);
  return { base, createdAt };
}

async function exportSnapshot(prisma, outFile) {
  if (!(await sqliteTableExists(prisma, "PriceListItem"))) {
    console.error(
      "[ОШИБКА] Таблицы PriceListItem нет. Выполните: npm run db:sync",
    );
    process.exit(1);
  }

  const items = await prisma.priceListItem.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });

  const snapshot = {
    v: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    items: items.map((it) => ({
      id: it.id,
      priceListId: it.priceListId,
      code: it.code,
      name: it.name,
      sectionTitle: it.sectionTitle,
      subsectionTitle: it.subsectionTitle,
      priceRub: it.priceRub,
      leadWorkingDays: it.leadWorkingDays,
      description: it.description,
      isActive: it.isActive,
      sortOrder: it.sortOrder,
      createdAt: iso(it.createdAt),
      updatedAt: iso(it.updatedAt),
    })),
  };

  const dir = path.dirname(outFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(
    `[OK] Прайс сохранён: ${outFile}\n     позиций: ${items.length}`,
  );
}

async function resolveImportPriceListId(prisma, row) {
  const pid =
    row.priceListId != null && String(row.priceListId).trim()
      ? String(row.priceListId).trim()
      : "";
  if (pid) {
    const pl = await prisma.priceList.findUnique({
      where: { id: pid },
      select: { id: true },
    });
    if (pl) return pl.id;
  }
  const ws = await prisma.priceListWorkspaceSettings.findUnique({
    where: { id: "default" },
    select: { activePriceListId: true },
  });
  if (ws?.activePriceListId) return ws.activePriceListId;
  const first = await prisma.priceList.findFirst({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true },
  });
  if (!first) {
    throw new Error("В БД нет каталогов прайса (создайте в Конфигурация → Прайс).");
  }
  return first.id;
}

async function importSnapshot(prisma, filePath) {
  if (!(await sqliteTableExists(prisma, "PriceListItem"))) {
    console.error(
      "[ОШИБКА] Таблицы PriceListItem нет. Выполните: npm run db:sync",
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  const items = data.items || [];

  if (!Array.isArray(items) || items.length === 0) {
    console.error("[ОШИБКА] В файле нет массива items или он пустой.");
    process.exit(1);
  }

  let n = 0;
  for (const row of items) {
    const code = String(row.code ?? "").trim();
    if (!code) continue;
    if (!String(row.name ?? "").trim()) continue;
    const { base, createdAt } = itemCreateUpdate(row);
    const priceListId = await resolveImportPriceListId(prisma, row);
    await prisma.priceListItem.upsert({
      where: { priceListId_code: { priceListId, code } },
      create: {
        priceListId,
        code,
        ...base,
        ...(createdAt ? { createdAt } : {}),
      },
      update: { ...base },
    });
    n++;
  }
  console.log(
    `[OK] Импорт прайса: обработано позиций (upsert по каталогу и code): ${n}`,
  );
}

async function main() {
  loadEnvFallback();
  const { cmd, filePath } = parseArgs(process.argv);
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
      await importSnapshot(prisma, outFile);
    } else {
      console.log(`Использование:
  npm run db:price:export [-- путь/к/price-snapshot.json]
  npm run db:price:import [-- путь/к/price-snapshot.json]

Или импорт из Excel: npm run import:price`);
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
