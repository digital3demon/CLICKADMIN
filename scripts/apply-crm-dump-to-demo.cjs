/**
 * Обезличенный crm-dump → артефакт демо в хранилище (диск / S3).
 * Прод-БД и любую живую БД НЕ трогает.
 *
 *   node scripts/apply-crm-dump-to-demo.cjs path/to/crm-dump.anonymized.zip
 *
 * Результат:
 *   data/crm-dumps/demo/<month>/…anonymized.zip
 *   data/crm-dumps/demo/CURRENT.json  — указатель на актуальный файл
 *   data/demo-from-dump.json          — удобный JSON для отладки (опционально)
 *   при S3_ENABLED=true — ключ s3://…/crm-dumps/demo/<month>/<file>
 */
const fs = require("fs");
const path = require("path");
const {
  S3Client,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const JSZip = require("jszip");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = val;
    }
  }
}

function getCrmDumpLocalDir() {
  const raw = (process.env.CRM_DUMP_DIR || "").trim();
  if (raw) {
    return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  }
  return path.join(process.cwd(), "data", "crm-dumps");
}

function isS3Enabled() {
  const enabled =
    (process.env.S3_ENABLED || "").trim().toLowerCase() === "true";
  return Boolean(
    enabled &&
      (process.env.S3_ENDPOINT || "").trim() &&
      (process.env.S3_REGION || "").trim() &&
      (process.env.S3_BUCKET || "").trim() &&
      (process.env.S3_ACCESS_KEY_ID || "").trim() &&
      (process.env.S3_SECRET_ACCESS_KEY || "").trim(),
  );
}

async function putS3(key, body) {
  const forcePathStyle =
    (process.env.S3_FORCE_PATH_STYLE || "true").trim().toLowerCase() !==
    "false";
  const client = new S3Client({
    region: process.env.S3_REGION.trim(),
    endpoint: process.env.S3_ENDPOINT.trim(),
    forcePathStyle,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID.trim(),
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY.trim(),
    },
  });
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET.trim(),
      Key: key,
      Body: body,
      ContentType: "application/zip",
    }),
  );
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env"));

  const inPath = process.argv[2];
  const skipJson = process.argv.includes("--no-json");
  if (!inPath) {
    console.error(
      "Usage: node scripts/apply-crm-dump-to-demo.cjs <anonymized.zip> [--no-json]",
    );
    process.exit(1);
  }
  const abs = path.resolve(inPath);
  if (!fs.existsSync(abs)) {
    console.error("Не найден:", abs);
    process.exit(1);
  }

  const zipBytes = fs.readFileSync(abs);
  const zip = await JSZip.loadAsync(zipBytes);
  const dumpFile = zip.file("dump.json");
  if (!dumpFile) {
    console.error("Нет dump.json в архиве");
    process.exit(1);
  }
  const payload = JSON.parse(await dumpFile.async("string"));
  if (!payload.meta?.anonymizedAt) {
    console.warn(
      "Внимание: dump без anonymizedAt — сначала scripts/anonymize-crm-dump.cjs",
    );
  }

  const month =
    String(payload.meta?.month || "unknown").replace(/[^\d-]/g, "") ||
    "unknown";
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  const fileName = `crm-dump-${month}.anonymized.${stamp}.zip`;

  const demoRoot = path.join(getCrmDumpLocalDir(), "demo", month);
  fs.mkdirSync(demoRoot, { recursive: true });
  const diskPath = path.join(demoRoot, fileName);
  fs.writeFileSync(diskPath, zipBytes);

  // Стабильная копия «текущий демо-дамп» для инстанса
  const currentZip = path.join(getCrmDumpLocalDir(), "demo", "current.anonymized.zip");
  fs.mkdirSync(path.dirname(currentZip), { recursive: true });
  fs.copyFileSync(diskPath, currentZip);

  const currentMeta = {
    kind: "crm-demo-dump-pointer",
    updatedAt: new Date().toISOString(),
    month,
    anonymizedAt: payload.meta?.anonymizedAt ?? null,
    orderCount: payload.meta?.orderCount ?? null,
    diskPath,
    currentZip,
    note: "Демо читает артефакт из хранилища; в прод-БД ничего не пишется.",
  };
  const currentMetaPath = path.join(
    getCrmDumpLocalDir(),
    "demo",
    "CURRENT.json",
  );
  fs.writeFileSync(currentMetaPath, JSON.stringify(currentMeta, null, 2));

  let s3Key = null;
  if (isS3Enabled()) {
    s3Key = `crm-dumps/demo/${month}/${fileName}`;
    await putS3(s3Key, zipBytes);
    const currentKey = "crm-dumps/demo/current.anonymized.zip";
    await putS3(currentKey, zipBytes);
    currentMeta.s3Key = s3Key;
    currentMeta.s3CurrentKey = currentKey;
    fs.writeFileSync(currentMetaPath, JSON.stringify(currentMeta, null, 2));
  }

  let wroteJson = null;
  if (!skipJson) {
    const outDir = path.join(process.cwd(), "data");
    fs.mkdirSync(outDir, { recursive: true });
    wroteJson = path.join(outDir, "demo-from-dump.json");
    fs.writeFileSync(wroteJson, JSON.stringify(payload, null, 2));
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        storage: s3Key ? "s3+disk" : "disk",
        diskPath,
        currentZip,
        currentMetaPath,
        s3Key,
        wroteJson,
        month,
        orders: payload.meta?.orderCount ?? null,
        anonymizedAt: payload.meta?.anonymizedAt ?? null,
        next: "Демо-инстанс использует файл из хранилища (current.anonymized.zip), без записи в прод-БД.",
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
