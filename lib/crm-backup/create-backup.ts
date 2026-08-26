/**
 * Полный бекап: живая БД + все файлы CRM (диск и S3, кроме логов и crm-dumps).
 * Пишется в S3 или data/crm-dumps/{tenant}/daily/crm-backup-current.zip — overwrite.
 * Даты в meta — ISO UTC; слот cron — полночь Europe/Moscow.
 */
import "server-only";

import JSZip from "jszip";
import {
  detectBackupEngine,
  dumpLivePostgresSql,
  readLiveSqliteParts,
} from "@/lib/crm-backup/db-file";
import { addLocalCrmFilesToZip } from "@/lib/crm-backup/pack-local-files";
import { addS3CrmFilesToZip } from "@/lib/crm-backup/pack-s3-files";
import { storeCurrentCrmBackup } from "@/lib/crm-backup/store";
import { withCrmMaintenance } from "@/lib/crm-backup/progress-lock";
import {
  CRM_FULL_BACKUP_KIND,
  CRM_FULL_BACKUP_VERSION,
  type CrmBackupMeta,
  type CrmBackupSource,
} from "@/lib/crm-backup/types";

export async function createAndStoreCrmBackup(opts: {
  tenantId: string;
  source: CrmBackupSource;
}): Promise<CrmBackupMeta> {
  return withCrmMaintenance("backup", () => createAndStoreCrmBackupUnlocked(opts));
}

async function createAndStoreCrmBackupUnlocked(opts: {
  tenantId: string;
  source: CrmBackupSource;
}): Promise<CrmBackupMeta> {
  const engine = detectBackupEngine();
  if (!engine) {
    throw new Error("Неизвестный DATABASE_URL: нужен SQLite или PostgreSQL");
  }
  const zip = new JSZip();
  let payloadBytes = 0;
  if (engine === "sqlite") {
    const parts = readLiveSqliteParts();
    zip.file("database.sqlite", parts.main);
    payloadBytes += parts.main.length;
    if (parts.wal) zip.file("database.sqlite-wal", parts.wal);
    if (parts.shm) zip.file("database.sqlite-shm", parts.shm);
  } else {
    const sql = dumpLivePostgresSql();
    zip.file("database.sql", sql);
    payloadBytes += sql.length;
  }
  const local = addLocalCrmFilesToZip(zip);
  const remote = await addS3CrmFilesToZip(zip);
  payloadBytes += local.bytes + remote.bytes;
  zip.file(
    "HOW_TO_RESTORE.txt",
    [
      "Перенос CRM на новый сервер из этого архива.",
      "",
      "1) Поставьте тот же релиз CRM (код + npm ci + сборка), сервер не запускайте.",
      "2) Скопируйте архив в каталог проекта.",
      "3) Linux:",
      "   cd /home/ВАШ_ПУТЬ",
      "   node scripts/crm-restore-from-backup.cjs --file /home/ВАШ_ПУТЬ/crm-backup-current.zip --confirm ВОССТАНОВИТЬ --write-env",
      "   npm run db:migrate:deploy",
      "   npm start",
      "4) Windows (PowerShell):",
      "   cd C:\\Users\\sevas\\Documents\\Курсор проекты\\dental-lab-crm",
      "   node scripts/crm-restore-from-backup.cjs --file C:\\путь\\crm-backup-current.zip --confirm ВОССТАНОВИТЬ --write-env",
      "   npm run db:migrate:deploy",
      "   npm start",
      "",
      "Архив: база, папка data (кроме логов/дампов), файлы вне data, .env, объекты S3.",
      "",
    ].join("\n"),
  );
  zip.file(
    "meta.json",
    JSON.stringify(
      {
        kind: CRM_FULL_BACKUP_KIND,
        version: CRM_FULL_BACKUP_VERSION,
        engine,
        createdAt: new Date().toISOString(),
        source: opts.source,
        tenantId: opts.tenantId,
        bytes: payloadBytes,
        localFileCount: local.fileCount,
        s3FileCount: remote.fileCount,
        envFiles: local.envFiles,
        portable: true,
      },
      null,
      2,
    ),
  );
  const zipBytes = Buffer.from(
    await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 1 },
    }),
  );
  return storeCurrentCrmBackup({
    tenantId: opts.tenantId,
    zipBytes,
    meta: {
      kind: CRM_FULL_BACKUP_KIND,
      version: CRM_FULL_BACKUP_VERSION,
      engine,
      createdAt: new Date().toISOString(),
      source: opts.source,
      tenantId: opts.tenantId,
    },
  });
}
