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
import { restoreCrmBackupSidecarFiles } from "@/lib/crm-backup/restore-files";
import { CRM_BACKUP_CONFIRM_PHRASE } from "@/lib/crm-backup/types";

export async function restoreCrmBackupFromZip(opts: {
  zipBytes: Buffer;
  confirm: string;
}): Promise<{ engine: "sqlite" | "postgres"; localFiles: number; s3Files: number }> {
  if (String(opts.confirm || "").trim() !== CRM_BACKUP_CONFIRM_PHRASE) {
    throw new Error(`Для восстановления введите ${CRM_BACKUP_CONFIRM_PHRASE}`);
  }
  const live = detectBackupEngine();
  if (!live) throw new Error("Неизвестный DATABASE_URL");

  const zip = await JSZip.loadAsync(opts.zipBytes);
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
    return { engine: "sqlite", ...files };
  }

  const file = zip.file("database.sql");
  if (!file) throw new Error("В архиве нет database.sql");
  const sql = Buffer.from(await file.async("nodebuffer"));
  const db = await getPrisma();
  await db.$disconnect();
  await prisma.$disconnect();
  restoreLivePostgresSql(sql);
  const files = await restoreCrmBackupSidecarFiles(zip);
  return { engine: "postgres", ...files };
}
