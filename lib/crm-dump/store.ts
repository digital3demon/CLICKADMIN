import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { getCrmDumpLocalDir } from "@/lib/crm-dump/local-dir";
import { isS3StorageEnabled, putS3ObjectBytes } from "@/lib/s3-client";

export { getCrmDumpLocalDir };

/**
 * Сохранить zip дампа: S3 при включённом storage, иначе локальный каталог.
 * Прод-БД не трогает — только запись артефакта.
 */
export async function storeCrmDumpZip(params: {
  tenantId: string;
  monthKey: string;
  fileName: string;
  zipBytes: Buffer;
  /** live = прод; demo = выгрузка из демо-БД (отдельный префикс в storage). */
  scope?: "live" | "demo";
}): Promise<{ storage: "s3" | "disk"; keyOrPath: string }> {
  const scope = params.scope === "demo" ? "demo" : "live";
  const key =
    scope === "demo"
      ? `crm-dumps/demo/${params.monthKey}/${params.fileName}`
      : `crm-dumps/${params.tenantId}/${params.monthKey}/${params.fileName}`;

  if (isS3StorageEnabled()) {
    await putS3ObjectBytes(key, params.zipBytes, "application/zip");
    return { storage: "s3", keyOrPath: key };
  }

  const dir =
    scope === "demo"
      ? path.join(getCrmDumpLocalDir(), "demo", params.monthKey)
      : path.join(getCrmDumpLocalDir(), params.tenantId, params.monthKey);
  await fs.mkdir(dir, { recursive: true });
  const full = path.join(dir, params.fileName);
  await fs.writeFile(full, params.zipBytes);
  return { storage: "disk", keyOrPath: full };
}
