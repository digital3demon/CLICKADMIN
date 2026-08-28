/**
 * Восстановление полного бекапа CRM на новом сервере (без UI).
 * Остановить CRM перед запуском, иначе SQLite может быть занят.
 *
 *   node scripts/crm-restore-from-backup.cjs --file путь/crm-backup-current.zip --confirm ВОССТАНОВИТЬ --write-env
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const CONFIRM = "ВОССТАНОВИТЬ";
const SKIP_REL = /^(crm-dumps\/|logs\/)/;

function parseArgs(argv) {
  const out = { file: "", confirm: "", writeEnv: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--write-env") out.writeEnv = true;
    else if (a === "--file") out.file = String(argv[++i] || "").trim();
    else if (a === "--confirm") out.confirm = String(argv[++i] || "").trim();
  }
  return out;
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim().replace(/^export\s+/, "");
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] != null && process.env[key] !== "") continue;
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

function resolveSqlitePath(url) {
  if (!url.startsWith("file:")) return null;
  const rel = url.slice("file:".length).replace(/^\.?\//, "");
  const prismaDir = path.join(process.cwd(), "prisma");
  return path.isAbsolute(rel) ? rel : path.join(prismaDir, rel);
}

function writeAtomic(dest, bytes) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.restore-tmp`;
  fs.writeFileSync(tmp, bytes);
  fs.copyFileSync(tmp, dest);
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* ignore */
  }
}

function resolveRoot(envName, fallbackParts) {
  const fromEnv = String(process.env[envName] || "").trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  }
  return path.join(process.cwd(), ...fallbackParts);
}

function safeJoin(root, rel) {
  const normalized = rel.replace(/\\/g, "/").trim();
  if (
    !normalized ||
    normalized.includes("\0") ||
    normalized.includes("..") ||
    normalized.startsWith("/")
  ) {
    throw new Error(`Недопустимый путь: ${rel}`);
  }
  const rootAbs = path.resolve(root);
  const abs = path.resolve(rootAbs, ...normalized.split("/").filter(Boolean));
  const prefix = rootAbs.endsWith(path.sep) ? rootAbs : rootAbs + path.sep;
  if (abs !== rootAbs && !abs.startsWith(prefix)) {
    throw new Error(`Недопустимый путь: ${rel}`);
  }
  return abs;
}

function mapS3KeyToDisk(key) {
  const order = /^orders\/([^/]+)\/attachments\/([^/]+)$/.exec(key);
  if (order) {
    return { root: "order-attachments", rel: `orders/${order[1]}/${order[2]}` };
  }
  const mail = /^tenants\/([^/]+)\/mail\/([^/]+)\/attachments\/([^/]+)$/.exec(
    key,
  );
  if (mail) {
    return {
      root: "mail-attachments",
      rel: `tenants/${mail[1]}/mail/${mail[2]}/${mail[3]}`,
    };
  }
  const click = /^clickmig\/([^/]+)\/([^/]+)$/.exec(key);
  if (click) return { root: "clickmig-files", rel: `${click[1]}/${click[2]}` };
  return null;
}

function diskRelFromS3Pointer(p) {
  const raw = String(p || "").trim();
  if (!raw.startsWith("s3:")) return null;
  return mapS3KeyToDisk(raw.slice(3).trim())?.rel ?? null;
}

function resolvePgTool(name) {
  const envKey = name === "pg_dump" ? "PG_DUMP_PATH" : "PSQL_PATH";
  const fromEnv = String(process.env[envKey] || "").trim();
  if (fromEnv) return fromEnv;
  const linux = [
    `/usr/local/bin/${name}`,
    `/usr/bin/${name}`,
    `/bin/${name}`,
  ];
  for (let v = 18; v >= 13; v -= 1) {
    linux.push(`/usr/lib/postgresql/${v}/bin/${name}`);
  }
  for (const candidate of linux) {
    if (fs.existsSync(candidate)) return candidate;
  }
  if (process.platform === "win32") {
    for (let v = 18; v >= 10; v -= 1) {
      const candidate = `C:\\Program Files\\PostgreSQL\\${v}\\bin\\${name}.exe`;
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return name;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.confirm !== CONFIRM) {
    console.error(`Нужно --confirm ${CONFIRM}`);
    process.exit(1);
  }
  if (!args.file || !fs.existsSync(args.file)) {
    console.error("Нужен существующий --file путь/к/crm-backup-current.zip");
    process.exit(1);
  }

  const JSZip = require("jszip");
  const zip = await JSZip.loadAsync(fs.readFileSync(args.file));
  const envEntry = zip.file("config/.env");
  const envDest = path.join(process.cwd(), ".env");
  if (envEntry && (args.writeEnv || !fs.existsSync(envDest))) {
    fs.writeFileSync(envDest, Buffer.from(await envEntry.async("nodebuffer")));
    console.log("Записан .env из архива");
  }
  loadDotEnv(envDest);

  const progressPath = path.join(
    process.cwd(),
    "data",
    "crm-dumps",
    "_progress.json",
  );
  fs.mkdirSync(path.dirname(progressPath), { recursive: true });
  fs.writeFileSync(
    progressPath,
    JSON.stringify({
      phase: "restore",
      startedAt: new Date().toISOString(),
    }),
  );

  const url = String(process.env.DATABASE_URL || "").trim();
  if (url.startsWith("file:")) {
    const dest = resolveSqlitePath(url);
    const main = zip.file("database.sqlite");
    if (!main || !dest) {
      console.error("В архиве нет database.sqlite или DATABASE_URL не SQLite");
      process.exit(1);
    }
    const bytes = Buffer.from(await main.async("nodebuffer"));
    if (bytes.subarray(0, 15).toString("utf8") !== "SQLite format 3") {
      console.error("Файл не похож на SQLite");
      process.exit(1);
    }
    writeAtomic(dest, bytes);
    const wal = zip.file("database.sqlite-wal");
    const shm = zip.file("database.sqlite-shm");
    if (wal) writeAtomic(`${dest}-wal`, Buffer.from(await wal.async("nodebuffer")));
    else {
      try {
        fs.unlinkSync(`${dest}-wal`);
      } catch {
        /* ignore */
      }
    }
    if (shm) writeAtomic(`${dest}-shm`, Buffer.from(await shm.async("nodebuffer")));
    else {
      try {
        fs.unlinkSync(`${dest}-shm`);
      } catch {
        /* ignore */
      }
    }
    console.log("База SQLite записана:", dest);
  } else if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
    const sqlFile = zip.file("database.sql");
    if (!sqlFile) {
      console.error("В архиве нет database.sql");
      process.exit(1);
    }
    const tmp = path.join(process.cwd(), "data", "crm-dumps", `_pg-restore-${Date.now()}.sql`);
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    fs.writeFileSync(tmp, Buffer.from(await sqlFile.async("nodebuffer")));
    let dbUrl = url;
    try {
      const u = new URL(url);
      u.searchParams.delete("schema");
      dbUrl = u.toString();
    } catch {
      /* keep */
    }
    const psql = resolvePgTool("psql");
    const cmd = spawnSync(psql, ["--dbname", dbUrl, "--file", tmp], {
      encoding: "utf8",
      env: process.env,
    });
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    if (cmd.status !== 0) {
      console.error(cmd.stderr || "psql не смог восстановить базу");
      process.exit(1);
    }
    console.log("База PostgreSQL восстановлена");
  } else {
    console.error("Задайте DATABASE_URL (file: или postgres) в .env");
    process.exit(1);
  }

  const roots = {
    "order-attachments": resolveRoot("ORDER_ATTACHMENT_STORAGE_DIR", [
      "data",
      "order-attachments",
    ]),
    "mail-attachments": resolveRoot("MAIL_ATTACHMENT_STORAGE_DIR", [
      "data",
      "mail-attachments",
    ]),
    "clickmig-files": resolveRoot("CLICKMIG_STORAGE_DIR", ["data", "clickmig-files"]),
    "user-avatars": path.join(process.cwd(), "data", "user-avatars"),
    "ai-dataset": resolveRoot("AI_DATASET_DIR", ["data", "ai-dataset"]),
    templates: path.join(process.cwd(), "data", "templates"),
  };
  const dataRoot = path.join(process.cwd(), "data");
  let files = 0;
  for (const name of Object.keys(zip.files)) {
    const entry = zip.files[name];
    if (!entry || entry.dir) continue;
    if (name.startsWith("files/data/")) {
      const rel = name.slice("files/data/".length);
      if (!rel || SKIP_REL.test(rel)) continue;
      const dest = safeJoin(dataRoot, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, Buffer.from(await entry.async("nodebuffer")));
      files += 1;
      continue;
    }
    if (name.startsWith("files/")) {
      const rest = name.slice("files/".length);
      const slash = rest.indexOf("/");
      if (slash <= 0) continue;
      const rootId = rest.slice(0, slash);
      const rel = rest.slice(slash + 1);
      const root = roots[rootId];
      if (!root || !rel) continue;
      const dest = safeJoin(root, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, Buffer.from(await entry.async("nodebuffer")));
      files += 1;
      continue;
    }
    if (name.startsWith("s3/")) {
      const key = name.slice("s3/".length);
      const mapped = mapS3KeyToDisk(key);
      if (!mapped) continue;
      const root = roots[mapped.root];
      const dest = safeJoin(root, mapped.rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, Buffer.from(await entry.async("nodebuffer")));
      files += 1;
    }
  }
  console.log("Файлы восстановлены:", files);

  const s3On =
    String(process.env.S3_ENABLED || "").trim().toLowerCase() === "true" &&
    Boolean(process.env.S3_ENDPOINT?.trim()) &&
    Boolean(process.env.S3_BUCKET?.trim()) &&
    Boolean(process.env.S3_ACCESS_KEY_ID?.trim()) &&
    Boolean(process.env.S3_SECRET_ACCESS_KEY?.trim());
  if (!s3On) {
    try {
      const { PrismaClient } = require("@prisma/client");
      const db = new PrismaClient();
      let remapped = 0;
      const rows = await db.orderAttachment.findMany({
        where: { diskRelPath: { startsWith: "s3:" } },
        select: { id: true, diskRelPath: true },
      });
      for (const row of rows) {
        const next = diskRelFromS3Pointer(row.diskRelPath);
        if (!next) continue;
        await db.orderAttachment.update({
          where: { id: row.id },
          data: { diskRelPath: next },
        });
        remapped += 1;
      }
      const mail = await db.emailAttachment.findMany({
        where: { diskRelPath: { startsWith: "s3:" } },
        select: { id: true, diskRelPath: true },
      });
      for (const row of mail) {
        const next = diskRelFromS3Pointer(row.diskRelPath);
        if (!next) continue;
        await db.emailAttachment.update({
          where: { id: row.id },
          data: { diskRelPath: next },
        });
        remapped += 1;
      }
      const click = await db.clickMigFile.findMany({
        where: { diskRelPath: { startsWith: "s3:" } },
        select: { id: true, diskRelPath: true },
      });
      for (const row of click) {
        const next = diskRelFromS3Pointer(row.diskRelPath);
        if (!next) continue;
        await db.clickMigFile.update({
          where: { id: row.id },
          data: { diskRelPath: next },
        });
        remapped += 1;
      }
      await db.$disconnect();
      console.log("Ссылки S3 переведены на диск:", remapped);
    } catch (e) {
      console.warn(
        "Не удалось поправить ссылки S3 (нужен prisma generate):",
        e instanceof Error ? e.message : e,
      );
    }
  }

  console.log("Готово. Дальше: npm run db:migrate:deploy и запуск CRM.");
  try {
    fs.unlinkSync(progressPath);
  } catch {
    /* ignore */
  }
}

main().catch((e) => {
  try {
    fs.unlinkSync(
      path.join(process.cwd(), "data", "crm-dumps", "_progress.json"),
    );
  } catch {
    /* ignore */
  }
  console.error(e);
  process.exit(1);
});
