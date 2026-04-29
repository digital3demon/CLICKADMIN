/**
 * Импорт прайс-листа (.xlsx) в PriceListItem.
 *
 * Ожидаемый формат (как в data/imports/прайс.xlsx):
 *   строка 1 — заголовки; ищем колонки «ЦЕНА», «СРОК», «ОПИСАНИЕ»;
 *   колонка с наименованием вида «1001 Сплинт сложный» (код + пробел + название);
 *   строки данных: в колонке A часто true / «true» (чекбокс Excel);
 *   заголовки разделов: «1. НАЗВАНИЕ» (цифра, точка, пробел); подразделы: «1.1 Название» (цифра.цифра…).
 *
 * Запуск из корня проекта:
 *   node --env-file=.env scripts/import-price-xlsx.cjs
 *   node --env-file=.env scripts/import-price-xlsx.cjs "путь/к/файлу.xlsx" [имя_листа]
 *
 * Повторный импорт: upsert по паре (каталог, code).
 *
 * Каталог назначения:
 *   переменная окружения PRICE_LIST_ID (id из Конфигурация → Прайс), или
 *   четвёртый аргумент: node ... import-price-xlsx.cjs файл.xlsx Лист1 <priceListId>
 *   иначе — активный каталог для нарядов (настройка в разделе Прайс).
 */

const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const { PrismaClient } = require("@prisma/client");

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

function cellText(cell) {
  if (cell == null) return "";
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "object" && v !== null && "richText" in v) {
    return String(
      v.richText?.map((r) => r.text).join("") ?? "",
    ).trim();
  }
  if (typeof v === "object" && v !== null && "text" in v) {
    return String(v.text ?? "").trim();
  }
  if (typeof v === "number") return String(v);
  return String(v).trim();
}

function parseRub(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw))
    return Math.round(raw);
  const s = String(raw).replace(/\s/g, "").replace(",", ".");
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function parseDays(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw))
    return Math.max(0, Math.floor(raw));
  const s = String(raw).replace(/\s/g, "");
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? Math.max(0, n) : null;
}

function rowIsDataFlag(aVal) {
  if (aVal === true || aVal === 1) return true;
  const s = String(aVal).trim().toLowerCase();
  return s === "true" || s === "1" || s === "да";
}

/** Строка «1.1 Сплинты» — подраздел; «1. ПОДГОТОВКА…» — раздел (не 1.1). */
function classifyStructureRow(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  if (/^\d+\.\d+/.test(t)) {
    return { kind: "subsection", title: t.slice(0, 500) };
  }
  if (/^\d+\.\s/.test(t)) {
    return { kind: "section", title: t.slice(0, 500) };
  }
  return null;
}

function findHeaderColumns(headerRow) {
  let priceCol = 0;
  let daysCol = 0;
  let descCol = 0;
  let nameCol = 0;
  const maxCol = headerRow.cellCount || 40;
  for (let c = 1; c <= maxCol; c++) {
    const t = cellText(headerRow.getCell(c)).toLowerCase();
    if (t.includes("цена") && !priceCol) priceCol = c;
    if (t.includes("срок") && !daysCol) daysCol = c;
    if (t.includes("описан") && !descCol) descCol = c;
  }
  if (!nameCol) nameCol = 3;
  if (!priceCol) priceCol = 5;
  if (!daysCol) daysCol = 7;
  if (!descCol) descCol = 9;
  return { nameCol, priceCol, daysCol, descCol };
}

async function resolveTargetPriceListId(prisma, argv4) {
  const fromEnv = process.env.PRICE_LIST_ID?.trim();
  if (fromEnv) {
    const pl = await prisma.priceList.findUnique({
      where: { id: fromEnv },
      select: { id: true },
    });
    if (!pl) {
      console.error("PRICE_LIST_ID не найден в БД:", fromEnv);
      process.exit(1);
    }
    return pl.id;
  }
  const fromArg = argv4?.trim();
  if (fromArg) {
    const pl = await prisma.priceList.findUnique({
      where: { id: fromArg },
      select: { id: true },
    });
    if (!pl) {
      console.error("Каталог прайса не найден (4-й аргумент):", fromArg);
      process.exit(1);
    }
    return pl.id;
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
    console.error("В БД нет каталогов прайса. Создайте каталог в Конфигурация → Прайс.");
    process.exit(1);
  }
  return first.id;
}

async function main() {
  loadEnvFallback();
  const fileArg = process.argv[2];
  const sheetName = process.argv[3];
  const listIdArg = process.argv[4];
  const defaultFile = path.join(
    process.cwd(),
    "data",
    "imports",
    "прайс.xlsx",
  );
  const filePath = fileArg
    ? path.isAbsolute(fileArg)
      ? fileArg
      : path.join(process.cwd(), fileArg)
    : defaultFile;

  if (!fs.existsSync(filePath)) {
    console.error("Файл не найден:", filePath);
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const sheet =
    sheetName != null && String(sheetName).trim()
      ? wb.getWorksheet(String(sheetName).trim())
      : wb.worksheets[0];
  if (!sheet) {
    console.error("Лист не найден");
    process.exit(1);
  }

  const headerRow = sheet.getRow(1);
  const cols = findHeaderColumns(headerRow);

  const prisma = new PrismaClient();
  const targetListId = await resolveTargetPriceListId(prisma, listIdArg);
  let n = 0;
  let sortOrder = 0;
  /** @type {string | null} */
  let currentSection = null;
  /** @type {string | null} */
  let currentSubsection = null;
  try {
    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const aVal = row.getCell(1).value;
      const nameFromNameCol = cellText(row.getCell(cols.nameCol));
      const nameFromA = cellText(row.getCell(1));
      const structureText = nameFromNameCol || nameFromA;
      const struct = classifyStructureRow(structureText);
      if (struct?.kind === "section") {
        currentSection = struct.title;
        currentSubsection = null;
        continue;
      }
      if (struct?.kind === "subsection") {
        currentSubsection = struct.title;
        continue;
      }

      if (!rowIsDataFlag(aVal)) continue;

      const nameCell = nameFromNameCol;
      const m = nameCell.match(/^(\d{3,5})\s+(.+)$/u);
      if (!m) continue;
      const code = m[1];
      const name = m[2].trim().slice(0, 500);
      if (!name) continue;

      const priceRub = parseRub(row.getCell(cols.priceCol).value);
      if (priceRub == null || priceRub < 0) continue;

      const leadWorkingDays = parseDays(row.getCell(cols.daysCol).value);
      const description = cellText(row.getCell(cols.descCol)) || null;
      sortOrder += 1;

      await prisma.priceListItem.upsert({
        where: {
          priceListId_code: { priceListId: targetListId, code },
        },
        create: {
          priceListId: targetListId,
          code,
          name: name.slice(0, 400),
          sectionTitle: currentSection,
          subsectionTitle: currentSubsection,
          priceRub,
          leadWorkingDays,
          description: description ? description.slice(0, 8000) : null,
          isActive: true,
          sortOrder,
        },
        update: {
          name: name.slice(0, 400),
          sectionTitle: currentSection,
          subsectionTitle: currentSubsection,
          priceRub,
          leadWorkingDays,
          description: description ? description.slice(0, 8000) : null,
          isActive: true,
          sortOrder,
        },
      });
      n++;
    }
    console.log(
      `Импортировано/обновлено позиций: ${n} (каталог ${targetListId})`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
