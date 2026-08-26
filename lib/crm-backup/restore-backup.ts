import "server-only";

import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { getPrisma } from "@/lib/get-prisma";
import {
  detectBackupEngine,
  isSqliteFileBuffer,
  restoreLivePostgresSql,
  writeLiveSqliteParts,
} from "@/lib/crm-backup/db-file";
import {
  refreshCrmAfterRestore,
  type PostRestoreRefreshResult,
} from "@/lib/crm-backup/post-restore-refresh";
import { withCrmMaintenance } from "@/lib/crm-backup/progress-lock";
import { remapS3PointersToDiskIfNeeded } from "@/lib/crm-backup/remap-s3-pointers";
import { restoreCrmBackupSidecarFiles } from "@/lib/crm-backup/restore-files";
import { CRM_BACKUP_CONFIRM_PHRASE } from "@/lib/crm-backup/types";

export async function restoreCrmBackupFromZip(opts: {
  zipBytes: Buffer;
  confirm: string;
}): Promise<{
  engine: "sqlite" | "postgres";
  localFiles: number;
  s3Files: number;
  remappedS3Pointers: number;
  refresh: PostRestoreRefreshResult;
}> {
  if (String(opts.confirm || "").trim() !== CRM_BACKUP_CONFIRM_PHRASE) {
    throw new Error(`Для восстановления введите ${CRM_BACKUP_CONFIRM_PHRASE}`);
  }
  return withCrmMaintenance("restore", () =>
    restoreCrmBackupFromZipUnlocked(opts.zipBytes),
  );
}

async function restoreCrmBackupFromZipUnlocked(zipBytes: Buffer): Promise<{
  engine: "sqlite" | "postgres";
  localFiles: number;
  s3Files: number;
  remappedS3Pointers: number;
  refresh: PostRestoreRefreshResult;
}> {
  const live = detectBackupEngine();
  if (!live) throw new Error("Неизвестный DATABASE_URL");

  const zip = await JSZip.loadAsync(zipBytes);
  if (live === "sqlite") {
    const file = zip.file("database.sqlite");
    if (!file) throw new Error("В архиве нет database.sqlite");
    const bytes = Buffer.from(await file.async("nodebuffer"));
    if (!isSqliteFileBuffer(bytes)) {
      throw new Error("Файл не похож на SQLite");
    }
    const walFile = zip.file("database.sqlite-wal");
    const shmFile = zip.file("database.sqlite-shm");
    const wal = walFile
      ? Buffer.from(await walFile.async("nodebuffer"))
      : undefined;
    const shm = shmFile
      ? Buffer.from(await shmFile.async("nodebuffer"))
      : undefined;
    const db = await getPrisma();
    await db.$disconnect();
    await prisma.$disconnect();
    writeLiveSqliteParts({ main: bytes, wal, shm });
    const files = await restoreCrmBackupSidecarFiles(zip);
    const remappedS3Pointers = await remapS3PointersToDiskIfNeeded(prisma);
    const refresh = await refreshCrmAfterRestore();
    return { engine: "sqlite", remappedS3Pointers, refresh, ...files };
  }

  const file = zip.file("database.sql");
  if (!file) throw new Error("В архиве нет database.sql");
  const sql = Buffer.from(await file.async("nodebuffer"));
  const db = await getPrisma();
  await db.$disconnect();
  await prisma.$disconnect();
  restoreLivePostgresSql(sql);
  const files = await restoreCrmBackupSidecarFiles(zip);
  const remappedS3Pointers = await remapS3PointersToDiskIfNeeded(prisma);
  const refresh = await refreshCrmAfterRestore();
  return { engine: "postgres", remappedS3Pointers, refresh, ...files };
}
