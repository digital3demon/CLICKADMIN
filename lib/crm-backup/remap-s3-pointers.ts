import "server-only";

import type { PrismaClient } from "@prisma/client";
import { diskRelFromS3Pointer } from "@/lib/crm-backup/s3-key-to-disk";
import { isS3StorageEnabled } from "@/lib/s3-client";

/** На новом сервере без S3 ссылки s3:… должны стать путями на диске. */
export async function remapS3PointersToDiskIfNeeded(
  db: PrismaClient,
): Promise<number> {
  if (isS3StorageEnabled()) return 0;
  let changed = 0;
  const orders = await db.orderAttachment.findMany({
    where: { diskRelPath: { startsWith: "s3:" } },
    select: { id: true, diskRelPath: true },
  });
  for (const row of orders) {
    const next = diskRelFromS3Pointer(row.diskRelPath ?? "");
    if (!next) continue;
    await db.orderAttachment.update({
      where: { id: row.id },
      data: { diskRelPath: next },
    });
    changed += 1;
  }
  const mail = await db.emailAttachment.findMany({
    where: { diskRelPath: { startsWith: "s3:" } },
    select: { id: true, diskRelPath: true },
  });
  for (const row of mail) {
    const next = diskRelFromS3Pointer(row.diskRelPath ?? "");
    if (!next) continue;
    await db.emailAttachment.update({
      where: { id: row.id },
      data: { diskRelPath: next },
    });
    changed += 1;
  }
  const click = await db.clickMigFile.findMany({
    where: { diskRelPath: { startsWith: "s3:" } },
    select: { id: true, diskRelPath: true },
  });
  for (const row of click) {
    const next = diskRelFromS3Pointer(row.diskRelPath ?? "");
    if (!next) continue;
    await db.clickMigFile.update({
      where: { id: row.id },
      data: { diskRelPath: next },
    });
    changed += 1;
  }
  return changed;
}
