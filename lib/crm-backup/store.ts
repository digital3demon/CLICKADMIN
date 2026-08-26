import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import {
  getS3ObjectBytes,
  isS3StorageEnabled,
  putS3ObjectBytes,
} from "@/lib/s3-client";
import { getCrmDumpLocalDir } from "@/lib/crm-dump/store";
import {
  crmDailyBackupMetaObjectKey,
  crmDailyBackupObjectKey,
  parseCrmBackupMeta,
  type CrmBackupMeta,
} from "@/lib/crm-backup/types";

async function writeDisk(relKey: string, bytes: Buffer): Promise<string> {
  const full = path.join(getCrmDumpLocalDir(), ...relKey.split("/").slice(1));
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, bytes);
  return full;
}

async function readDisk(relKey: string): Promise<Buffer | null> {
  const full = path.join(getCrmDumpLocalDir(), ...relKey.split("/").slice(1));
  try {
    return await fs.readFile(full);
  } catch {
    return null;
  }
}

export async function storeCurrentCrmBackup(params: {
  tenantId: string;
  zipBytes: Buffer;
  meta: Omit<CrmBackupMeta, "storage" | "keyOrPath" | "bytes"> & {
    bytes?: number;
  };
}): Promise<CrmBackupMeta> {
  const zipKey = crmDailyBackupObjectKey(params.tenantId);
  const metaKey = crmDailyBackupMetaObjectKey(params.tenantId);
  const bytes = params.zipBytes;
  const base = {
    ...params.meta,
    bytes: bytes.length,
  };

  if (isS3StorageEnabled()) {
    await putS3ObjectBytes(zipKey, bytes, "application/zip");
    const meta: CrmBackupMeta = {
      ...base,
      storage: "s3",
      keyOrPath: zipKey,
    };
    await putS3ObjectBytes(
      metaKey,
      Buffer.from(JSON.stringify(meta), "utf8"),
      "application/json",
    );
    return meta;
  }

  const full = await writeDisk(zipKey, bytes);
  const meta: CrmBackupMeta = {
    ...base,
    storage: "disk",
    keyOrPath: full,
  };
  await writeDisk(metaKey, Buffer.from(JSON.stringify(meta), "utf8"));
  return meta;
}

export async function loadCurrentCrmBackupMeta(
  tenantId: string,
): Promise<CrmBackupMeta | null> {
  const metaKey = crmDailyBackupMetaObjectKey(tenantId);
  if (isS3StorageEnabled()) {
    try {
      const buf = await getS3ObjectBytes(metaKey);
      return parseCrmBackupMeta(JSON.parse(buf.toString("utf8")));
    } catch {
      return null;
    }
  }
  const buf = await readDisk(metaKey);
  if (!buf) return null;
  try {
    return parseCrmBackupMeta(JSON.parse(buf.toString("utf8")));
  } catch {
    return null;
  }
}

export async function loadCurrentCrmBackupZip(
  tenantId: string,
): Promise<Buffer | null> {
  const zipKey = crmDailyBackupObjectKey(tenantId);
  if (isS3StorageEnabled()) {
    try {
      return await getS3ObjectBytes(zipKey);
    } catch {
      return null;
    }
  }
  return readDisk(zipKey);
}
