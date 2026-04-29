/**
 * Импорт клиник и врачей из PDF (извлечение текста) в SQLite через Prisma.
 *
 * PDF не хранит таблицу как в Excel: из «верстки» часто получается перемешанный текст.
 * Надёжнее всего, если в PDF таблица экспортирована так, что при извлечении текста
 * каждая строка данных идёт отдельной строкой с разделителями:
 *
 *   Клиника<TAB>Адрес<TAB>Врач
 *
 * или через точку с запятой:
 *
 *   Клиника;Адрес;Врач
 *
 * Два столбца (таб или ;):  Клиника | Врач  (адрес пустой).
 * Один столбец: только название клиники.
 *
 * Первая строка, похожая на заголовок (содержит «клиник», «адрес», «врач» и т.п.), пропускается.
 *
 * Запуск:
 *   npm run import:clinics-pdf -- "C:\путь\клиенты.pdf"
 *
 * или:
 *   node --env-file=.env scripts/import-clinics-pdf.cjs файл.pdf
 */

const path = require("path");
const fs = require("fs");
const { PDFParse } = require("pdf-parse");
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

function looksLikeHeaderLine(line) {
  const n = line.toLowerCase();
  if (n.length > 120) return false;
  const hits = [
    "клиник",
    "clinic",
    "название",
    "организац",
    "адрес",
    "address",
    "врач",
    "doctor",
    "фио",
  ].filter((k) => n.includes(k));
  return hits.length >= 2;
}

function splitFields(line) {
  const t = line.replace(/\r/g, "").trim();
  if (!t) return [];
  let parts;
  if (t.includes("\t")) {
    parts = t.split("\t").map((s) => s.trim());
  } else if (t.includes(";")) {
    parts = t.split(";").map((s) => s.trim());
  } else {
    return [t];
  }
  while (parts.length && parts[parts.length - 1] === "") parts.pop();
  while (parts.length && parts[0] === "") parts.shift();
  return parts;
}

function rowFromParts(parts) {
  if (parts.length === 0) return null;
  if (parts.length >= 3) {
    return {
      clinic: parts[0],
      address: parts[1],
      doctor: parts.slice(2).join(" ").trim(),
    };
  }
  if (parts.length === 2) {
    return { clinic: parts[0], address: "", doctor: parts[1] };
  }
  return { clinic: parts[0], address: "", doctor: "" };
}

async function findOrCreateClinic(prisma, name, address) {
  const existing = await prisma.clinic.findFirst({ where: { name } });
  if (existing) {
    if (address && address !== (existing.address ?? "")) {
      return prisma.clinic.update({
        where: { id: existing.id },
        data: { address },
      });
    }
    return existing;
  }
  return prisma.clinic.create({
    data: { name, address: address || null },
  });
}

async function main() {
  loadEnvFallback();

  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error(
      'Укажите путь к .pdf:\n  npm run import:clinics-pdf -- "C:\\data\\clinics.pdf"',
    );
    process.exit(1);
  }

  const abs = path.isAbsolute(fileArg)
    ? fileArg
    : path.join(process.cwd(), fileArg);
  if (!fs.existsSync(abs)) {
    console.error("Файл не найден:", abs);
    process.exit(1);
  }

  const buffer = fs.readFileSync(abs);
  const parser = new PDFParse({ data: buffer });
  let text = "";
  try {
    const result = await parser.getText();
    text = result.text || "";
  } finally {
    await parser.destroy();
  }
  const lines = text.split(/\n/).map((l) => l.replace(/\r/g, ""));

  const prisma = new PrismaClient();
  let rowIndex = 0;
  let clinicsTouched = 0;
  let doctorsAdded = 0;
  let skipped = 0;

  try {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (rowIndex === 0 && looksLikeHeaderLine(line)) {
        skipped++;
        continue;
      }
      rowIndex++;

      const parts = splitFields(line);
      const row = rowFromParts(parts);
      if (!row || !row.clinic) {
        skipped++;
        continue;
      }

      const clinic = await findOrCreateClinic(
        prisma,
        row.clinic,
        row.address,
      );
      clinicsTouched++;

      if (row.doctor) {
        const dup = await prisma.doctor.findFirst({
          where: { clinicId: clinic.id, fullName: row.doctor },
        });
        if (!dup) {
          await prisma.doctor.create({
            data: { clinicId: clinic.id, fullName: row.doctor },
          });
          doctorsAdded++;
        }
      }
    }

    console.log("Готово (PDF → текст → строки).", {
      строкТекста: lines.filter((l) => l.trim()).length,
      пропущеноКакЗаголовокИлиПусто: skipped,
      клиникЗатронуто: clinicsTouched,
      врачейДобавлено: doctorsAdded,
    });
    if (clinicsTouched === 0) {
      console.warn(
        "\nНе найдено ни одной строки с клиникой. Часто PDF даёт не таблицей, а абзацами.\n" +
          "Сохраните список в Excel и используйте: npm run import:clinics -- файл.xlsx",
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
