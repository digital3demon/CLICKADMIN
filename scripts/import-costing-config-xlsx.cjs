/**
 * Импорт таблицы расчёта в Конфигурация → Просчёт работ.
 *
 * Что делает:
 * - читает .xlsx с колонками затрат (как в "фот ИИ (1).xlsx");
 * - ищет позицию прайса по коду (в активном каталоге);
 * - создаёт/обновляет строки CostingLine в выбранной версии;
 * - заполняет inputsJson (статьи затрат + client_price + stoimost_baza).
 *
 * Запуск:
 *   node --env-file=.env scripts/import-costing-config-xlsx.cjs
 *   node --env-file=.env scripts/import-costing-config-xlsx.cjs "C:\\path\\file.xlsx"
 *   node --env-file=.env scripts/import-costing-config-xlsx.cjs "C:\\path\\file.xlsx" "<sheetName>" "<costingVersionId>"
 */

const fs = require("node:fs");
const path = require("node:path");
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

function findColumns(headerRow) {
  const byKey = {};
  const maxCol = Math.max(40, headerRow.cellCount || 0);

  for (let c = 1; c <= maxCol; c++) {
    const h = headerNorm(cellText(headerRow.getCell(c)));
    if (!h) continue;
    const setOnce = (key) => {
      if (byKey[key] == null) byKey[key] = c;
    };

    if (h.includes("код")) setOnce("code");
    else if (h.includes("позиц")) setOnce("name");
    else if (h.includes("описан")) setOnce("description");
    else if (h.includes("цена")) setOnce("client_price");
    else if (h.includes("стоимост")) setOnce("stoimost_baza");
    else if (h.includes("аналоги")) setOnce("analogi_shtifty");
    else if (h.includes("постобработ")) setOnce("postobrabotka");
    else if (h.includes("принт/фрез другое")) setOnce("print_frez_drugoe");
    else if (h.includes("гипс")) setOnce("gips_fot");
    else if (h.includes("принт/фрез коронки")) setOnce("print_frez_koronki");
    else if (h.includes("принт модель")) setOnce("print_model");
    else if (h.includes("воск/штифт")) setOnce("vosk_shtift");
    else if (h.includes("скан")) setOnce("scan");
    else if (h.includes("cad фот хирург")) setOnce("cad_fot_hirurgiya");
    else if (h === "cad фот" || h.includes("cad фот")) setOnce("cad_fot");
    else if (h.includes("протетика")) setOnce("prostetika");
    else if (h.includes("cam фот")) setOnce("cam_fot");
    else if (h.includes("обработка")) setOnce("obrabotka");
    else if (h.includes("мануальный")) setOnce("manual_zt");
    else if (h.includes("запчасти")) setOnce("zapchasti");
    else if (h.includes("материал")) setOnce("materialy_emal");
    else if (h.includes("упаковка")) setOnce("upakovka");
  }

  return {
    code: byKey.code ?? 1,
    name: byKey.name ?? 2,
    description: byKey.description ?? 3,
    client_price: byKey.client_price ?? 5,
    stoimost_baza: byKey.stoimost_baza ?? 27,
    analogi_shtifty: byKey.analogi_shtifty ?? 6,
    postobrabotka: byKey.postobrabotka ?? 7,
    print_frez_drugoe: byKey.print_frez_drugoe ?? 8,
    gips_fot: byKey.gips_fot ?? 9,
    print_frez_koronki: byKey.print_frez_koronki ?? 10,
    print_model: byKey.print_model ?? 11,
    vosk_shtift: byKey.vosk_shtift ?? 12,
    scan: byKey.scan ?? 13,
    cad_fot_hirurgiya: byKey.cad_fot_hirurgiya ?? 14,
    cad_fot: byKey.cad_fot ?? 15,
    prostetika: byKey.prostetika ?? 16,
    cam_fot: byKey.cam_fot ?? 17,
    obrabotka: byKey.obrabotka ?? 18,
    manual_zt: byKey.manual_zt ?? 19,
    zapchasti: byKey.zapchasti ?? 20,
    materialy_emal: byKey.materialy_emal ?? 21,
    upakovka: byKey.upakovka ?? 22,
  };
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
  if (!first) {
    throw new Error("В БД нет каталога прайса. Сначала создайте прайс.");
  }
  return first.id;
}

async function resolveCostingVersionId(prisma, argVersionId) {
  const fromArg = String(argVersionId ?? "").trim();
  if (fromArg) {
    const v = await prisma.costingVersion.findUnique({
      where: { id: fromArg },
      select: { id: true },
    });
    if (!v) throw new Error(`Версия просчёта не найдена: ${fromArg}`);
    return v.id;
  }

  const fromEnv = String(process.env.COSTING_VERSION_ID ?? "").trim();
  if (fromEnv) {
    const v = await prisma.costingVersion.findUnique({
      where: { id: fromEnv },
      select: { id: true },
    });
    if (!v) throw new Error(`COSTING_VERSION_ID не найден: ${fromEnv}`);
    return v.id;
  }

  const latest = await prisma.costingVersion.findFirst({
    where: { archived: false },
    orderBy: [{ createdAt: "desc" }],
    select: { id: true },
  });
  if (!latest) throw new Error("Нет активной версии просчёта.");
  return latest.id;
}

function toInputNumber(row, colIndex) {
  const n = numberFromCellValue(row.getCell(colIndex).value);
  if (n == null) return 0;
  return Math.round(n * 100) / 100;
}

async function main() {
  loadEnvFallback();
  const fileArg = process.argv[2];
  const sheetArg = process.argv[3];
  const versionArg = process.argv[4];

  const defaultFile = path.join(process.cwd(), "data", "imports", "прайс.xlsx");
  const filePath = fileArg
    ? path.isAbsolute(fileArg)
      ? fileArg
      : path.join(process.cwd(), fileArg)
    : defaultFile;
  if (!fs.existsSync(filePath)) {
    throw new Error(`Файл не найден: ${filePath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet =
    sheetArg && String(sheetArg).trim()
      ? workbook.getWorksheet(String(sheetArg).trim())
      : workbook.worksheets[0];
  if (!sheet) throw new Error("Лист не найден");

  const prisma = new PrismaClient();
  try {
    const priceListId = await resolvePriceListId(prisma);
    const versionId = await resolveCostingVersionId(prisma, versionArg);

    const versionColumns = await prisma.costingColumn.findMany({
      where: { versionId },
      select: { key: true },
    });
    const columnKeys = new Set(versionColumns.map((x) => x.key));
    const requiredKeys = [
      "profile_discount_pct",
      "client_price",
      "stoimost_baza",
      "analogi_shtifty",
      "postobrabotka",
      "print_frez_drugoe",
      "gips_fot",
      "print_frez_koronki",
      "print_model",
      "vosk_shtift",
      "scan",
      "cad_fot_hirurgiya",
      "cad_fot",
      "prostetika",
      "cam_fot",
      "obrabotka",
      "manual_zt",
      "zapchasti",
      "materialy_emal",
      "upakovka",
    ];
    const missingColumns = requiredKeys.filter((k) => !columnKeys.has(k));
    if (missingColumns.length > 0) {
      throw new Error(
        `В версии просчёта не хватает колонок: ${missingColumns.join(", ")}`,
      );
    }

    const priceItems = await prisma.priceListItem.findMany({
      where: { priceListId },
      select: { id: true, code: true },
    });
    const itemByCode = new Map(priceItems.map((x) => [x.code, x]));

    const existingLines = await prisma.costingLine.findMany({
      where: { versionId, priceListItemId: { not: null } },
      select: { id: true, priceListItemId: true },
    });
    const lineByItemId = new Map(
      existingLines
        .filter((x) => x.priceListItemId)
        .map((x) => [x.priceListItemId, x]),
    );

    const cols = findColumns(sheet.getRow(1));

    let imported = 0;
    let created = 0;
    let updated = 0;
    let skippedNoCode = 0;
    let skippedNoPriceItem = 0;

    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const codeRaw = cellText(row.getCell(cols.code));
      const nameRaw = cellText(row.getCell(cols.name));
      if (classifyStructureRow(nameRaw)) continue;

      let code = "";
      if (/^\d{3,6}$/.test(codeRaw)) code = codeRaw;
      else {
        const numCode = numberFromCellValue(row.getCell(cols.code).value);
        if (numCode != null) code = String(Math.trunc(numCode));
      }
      if (!code) {
        skippedNoCode += 1;
        continue;
      }

      const priceItem = itemByCode.get(code);
      if (!priceItem) {
        skippedNoPriceItem += 1;
        continue;
      }

      const inputsJson = {
        profile_discount_pct: 0,
        client_price: toInputNumber(row, cols.client_price),
        stoimost_baza: toInputNumber(row, cols.stoimost_baza),
        analogi_shtifty: toInputNumber(row, cols.analogi_shtifty),
        postobrabotka: toInputNumber(row, cols.postobrabotka),
        print_frez_drugoe: toInputNumber(row, cols.print_frez_drugoe),
        gips_fot: toInputNumber(row, cols.gips_fot),
        print_frez_koronki: toInputNumber(row, cols.print_frez_koronki),
        print_model: toInputNumber(row, cols.print_model),
        vosk_shtift: toInputNumber(row, cols.vosk_shtift),
        scan: toInputNumber(row, cols.scan),
        cad_fot_hirurgiya: toInputNumber(row, cols.cad_fot_hirurgiya),
        cad_fot: toInputNumber(row, cols.cad_fot),
        prostetika: toInputNumber(row, cols.prostetika),
        cam_fot: toInputNumber(row, cols.cam_fot),
        obrabotka: toInputNumber(row, cols.obrabotka),
        manual_zt: toInputNumber(row, cols.manual_zt),
        zapchasti: toInputNumber(row, cols.zapchasti),
        materialy_emal: toInputNumber(row, cols.materialy_emal),
        upakovka: toInputNumber(row, cols.upakovka),
      };
      const note = nameRaw || null;
      const existing = lineByItemId.get(priceItem.id);

      if (existing) {
        await prisma.costingLine.update({
          where: { id: existing.id },
          data: { inputsJson, note },
        });
        updated += 1;
      } else {
        await prisma.costingLine.create({
          data: {
            versionId,
            priceListItemId: priceItem.id,
            inputsJson,
            note,
          },
        });
        created += 1;
      }
      imported += 1;
    }

    console.log("Импорт расчёта завершён");
    console.log("versionId:", versionId);
    console.log("priceListId:", priceListId);
    console.log("строк обработано:", imported);
    console.log("создано:", created);
    console.log("обновлено:", updated);
    console.log("пропущено без кода:", skippedNoCode);
    console.log("пропущено (код не найден в прайсе):", skippedNoPriceItem);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
