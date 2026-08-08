import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { isS3StorageEnabled, putS3ObjectBytes } from "@/lib/s3-client";

export function getCrmDumpLocalDir(): string {
  const raw = process.env.CRM_DUMP_DIR?.trim();
  if (raw) {
    return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  }
  return path.join(process.cwd(), "data", "crm-dumps");
}

/**
 * Сохранить zip дампа: S3 при включённом storage, иначе локальный каталог.
 * Прод-БД не трогает — только запись артефакта.
 */
export async function storeCrmDumpZip(params: {
  tenantId: string;
  monthKey: string;
  fileName: string;
  zipBytes: Buffer;
}): Promise<{ storage: "s3" | "disk"; keyOrPath: string }> {
  const key = `crm-dumps/${params.tenantId}/${params.monthKey}/${params.fileName}`;

  if (isS3StorageEnabled()) {
    await putS3ObjectBytes(key, params.zipBytes, "application/zip");
    return { storage: "s3", keyOrPath: key };
  }

  const dir = path.join(getCrmDumpLocalDir(), params.tenantId, params.monthKey);
  await fs.mkdir(dir, { recursive: true });
  const full = path.join(dir, params.fileName);
  await fs.writeFile(full, params.zipBytes);
  return { storage: "disk", keyOrPath: full };
}
