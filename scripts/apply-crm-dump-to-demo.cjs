/**
 * Распаковать обезличенный crm-dump zip в data/demo-from-dump.json
 * (импорт в SQLite — отдельным шагом после появления apply-to-sqlite).
 *
 *   node scripts/apply-crm-dump-to-demo.cjs path/to/crm-dump.anonymized.zip
 *
 * Не читает и не пишет прод-БД.
 */
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

async function main() {
  const inPath = process.argv[2];
  if (!inPath) {
    console.error("Usage: node scripts/apply-crm-dump-to-demo.cjs <anonymized.zip>");
    process.exit(1);
  }
  const abs = path.resolve(inPath);
  if (!fs.existsSync(abs)) {
    console.error("Не найден:", abs);
    process.exit(1);
  }
  const zip = await JSZip.loadAsync(fs.readFileSync(abs));
  const dumpFile = zip.file("dump.json");
  if (!dumpFile) {
    console.error("Нет dump.json в архиве");
    process.exit(1);
  }
  const text = await dumpFile.async("string");
  const payload = JSON.parse(text);
  if (!payload.meta?.anonymizedAt) {
    console.warn(
      "Внимание: dump без anonymizedAt — похоже, сырой дамп. Сначала scripts/anonymize-crm-dump.cjs",
    );
  }
  const outDir = path.join(process.cwd(), "data");
  fs.mkdirSync(outDir, { recursive: true });
  const outJson = path.join(outDir, "demo-from-dump.json");
  fs.writeFileSync(outJson, JSON.stringify(payload, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        wrote: outJson,
        month: payload.meta?.month,
        orders: payload.meta?.orderCount,
        anonymizedAt: payload.meta?.anonymizedAt ?? null,
        next: "Импорт JSON → SQLite будет добавлен после получения дампа; пока файл готов для дальнейшей заливки.",
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
