/**
 * Отчёт: какие строки Excel не сопоставились с активным прайсом по коду.
 *
 * Запуск:
 * node --env-file=.env scripts/report-costing-xlsx-missing-codes.cjs "C:\path\file.xlsx"
 */

const fs = require("node:fs");
const path = require("node:path");
const ExcelJS = require("exceljs");
const { PrismaClient } = require("@prisma/client");

function cellText(cell) {
  if (!cell) return "";
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "object" && v !== null && "richText" in v) {
    return String(v.richText?.map((x) => x.text).join("") ?? "").trim();
  }
  if (typeof v === "object" && v !== null && "text" in v) {
    return String(v.text ?? "").trim();
  }
  if (typeof v === "object" && v !== null && "result" in v) {
    return v.result == null ? "" : String(v.result).trim();
  }
  return String(v).trim();
}

function numberFromCellValue(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "object" && raw !== null && "result" in raw) {
    return numberFromCellValue(raw.result);
  }
  const n = Number(String(raw).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function headerNorm(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function findCols(headerRow) {
  let code = 1;
  let name = 2;
  const maxCol = Math.max(30, headerRow.cellCount || 0);
  for (let c = 1; c <= maxCol; c++) {
    const h = headerNorm(cellText(headerRow.getCell(c)));
    if (!h) continue;
    if (h.includes("код")) code = c;
    if (h.includes("позиц")) name = c;
  }
  return { code, name };
}

function classifyStructureRow(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  if (/^\d+\.\d+/.test(t)) return "subsection";
  if (/^\d+\.\s/.test(t)) return "section";
  return null;
}

async function resolvePriceListId(prisma) {
  const ws = await prisma.priceListWorkspaceSettings.findUnique({
    where: { id: "default" },
    select: { activePriceListId: true },
  });
  if (ws?.activePriceListId) return ws.activePriceListId;
  const first = await prisma.priceList.findFirst({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true },
  });
  if (!first) throw new Error("В БД нет прайса.");
  return first.id;
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    throw new Error("Укажите путь к xlsx: node ... report-costing-xlsx-missing-codes.cjs <file.xlsx>");
  }
  const filePath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
  if (!fs.existsSync(filePath)) throw new Error(`Файл не найден: ${filePath}`);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error("Лист не найден");

  const cols = findCols(sheet.getRow(1));
  const prisma = new PrismaClient();
  try {
    const listId = await resolvePriceListId(prisma);
    const items = await prisma.priceListItem.findMany({
      where: { priceListId: listId },
      select: { code: true },
    });
    const codeSet = new Set(items.map((x) => x.code));

    const noCode = [];
    const missing = [];
    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const name = cellText(row.getCell(cols.name));
      if (classifyStructureRow(name)) continue;

      const codeRaw = cellText(row.getCell(cols.code));
      let code = "";
      if (/^\d{3,6}$/.test(codeRaw)) code = codeRaw;
      else {
        const n = numberFromCellValue(row.getCell(cols.code).value);
        if (n != null) code = String(Math.trunc(n));
      }
      if (!code) {
        noCode.push({ row: r, name });
        continue;
      }
      if (!codeSet.has(code)) {
        missing.push({ row: r, code, name });
      }
    }

    console.log("Отчёт по файлу:", filePath);
    console.log("Активный прайс:", listId);
    console.log("Без кода:", noCode.length);
    console.log("Код не найден в прайсе:", missing.length);
    if (noCode.length) {
      console.log("\n--- Строки без кода ---");
      for (const x of noCode) console.log(`row=${x.row}\t${x.name}`);
    }
    if (missing.length) {
      console.log("\n--- Коды, которых нет в прайсе ---");
      for (const x of missing) console.log(`row=${x.row}\tcode=${x.code}\t${x.name}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
