import "server-only";

import type JSZip from "jszip";
import { CRM_BACKUP_S3_DATA_PREFIXES } from "@/lib/crm-backup/file-roots";
import {
  getS3ObjectBytes,
  isS3StorageEnabled,
  listS3ObjectKeys,
} from "@/lib/s3-client";

export async function addS3CrmFilesToZip(zip: JSZip): Promise<{
  fileCount: number;
  bytes: number;
}> {
  if (!isS3StorageEnabled()) return { fileCount: 0, bytes: 0 };
  let fileCount = 0;
  let bytes = 0;
  for (const prefix of CRM_BACKUP_S3_DATA_PREFIXES) {
    const keys = await listS3ObjectKeys(prefix);
    for (const key of keys) {
      if (key.startsWith("crm-dumps/")) continue;
      const buf = await getS3ObjectBytes(key);
      zip.file(`s3/${key}`, buf);
      fileCount += 1;
      bytes += buf.length;
    }
  }
  return { fileCount, bytes };
}
