import "server-only";

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { deleteS3Object, getS3ObjectBytes, isS3StorageEnabled, putS3ObjectBytes } from "@/lib/s3-client";
import { resolvePathUnderRoot } from "@/lib/storage-path-safe";

/**
 * Upload: лимит 25 МБ, таймаут тела у роута, SQLITE_BUSY — повтор на уровне Prisma.
 * Путь: work-examples/{exampleId}/{fileId}
 */
export function getWorkExampleStorageRoot(): string {
  const fromEnv = process.env.WORK_EXAMPLE_STORAGE_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(process.cwd(), "data", "work-examples");
}

const S3_REL_PREFIX = "s3:";

export function workExampleDiskRelPath(exampleId: string, fileId: string): string {
  return path.posix.join("work-examples", exampleId, fileId);
}

export function newWorkExampleFileId(): string {
  return randomUUID();
}

function s3RelPathFromKey(key: string): string {
  return `${S3_REL_PREFIX}${key}`;
}

function s3KeyFromRelPath(rel: string): string | null {
  if (!rel.startsWith(S3_REL_PREFIX)) return null;
  const key = rel.slice(S3_REL_PREFIX.length).trim();
  return key || null;
}

function absolutePathFromRel(rel: string): string {
  return resolvePathUnderRoot(getWorkExampleStorageRoot(), rel);
}

export async function writeWorkExampleFile(
  exampleId: string,
  fileId: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  if (isS3StorageEnabled()) {
    const key = `work-examples/${exampleId}/${fileId}`;
    await putS3ObjectBytes(key, body, contentType);
    return s3RelPathFromKey(key);
  }
  const rel = workExampleDiskRelPath(exampleId, fileId);
  const abs = absolutePathFromRel(rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, body);
  return rel;
}

export async function readWorkExampleFileBytes(
  diskRelPath: string,
): Promise<Buffer | null> {
  const rel = String(diskRelPath || "").trim();
  if (!rel) return null;
  const s3Key = s3KeyFromRelPath(rel);
  if (s3Key) {
    try {
      return await getS3ObjectBytes(s3Key);
    } catch {
      return null;
    }
  }
  try {
    return await fs.readFile(absolutePathFromRel(rel));
  } catch {
    return null;
  }
}

export async function deleteWorkExampleFileBytes(diskRelPath: string | null): Promise<void> {
  const rel = String(diskRelPath || "").trim();
  if (!rel) return;
  const s3Key = s3KeyFromRelPath(rel);
  if (s3Key) {
    await deleteS3Object(s3Key);
    return;
  }
  try {
    await fs.unlink(absolutePathFromRel(rel));
  } catch {
    /* already gone */
  }
}
