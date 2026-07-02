import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import type { ClickMigFileKind } from "@prisma/client";
import {
  deleteS3Object,
  getS3ObjectBytes,
  isS3StorageEnabled,
  putS3ObjectBytes,
} from "@/lib/s3-client";

export function getClickMigStorageRoot(): string {
  const fromEnv = process.env.CLICKMIG_STORAGE_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(process.cwd(), "data", "clickmig-files");
}

const S3_REL_PREFIX = "s3:";

function s3RelPathFromKey(key: string): string {
  return `${S3_REL_PREFIX}${key}`;
}

function s3KeyFromRelPath(rel: string): string | null {
  if (!rel.startsWith(S3_REL_PREFIX)) return null;
  const key = rel.slice(S3_REL_PREFIX.length).trim();
  return key || null;
}

export function clickMigS3ObjectKey(
  tenantId: string,
  fileId: string,
): string {
  return `clickmig/${tenantId}/${fileId}`;
}

export function newClickMigFileId(): string {
  return randomUUID();
}

function absolutePathFromRel(rel: string): string {
  const parts = rel.replace(/\\/g, "/").split("/").filter(Boolean);
  return path.join(getClickMigStorageRoot(), ...parts);
}

export function clickMigDiskRelPath(tenantId: string, fileId: string): string {
  return path.posix.join(tenantId, fileId);
}

export async function writeClickMigFileToDisk(
  tenantId: string,
  fileId: string,
  body: Buffer,
): Promise<string> {
  const rel = clickMigDiskRelPath(tenantId, fileId);
  const abs = absolutePathFromRel(rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, body);
  return rel;
}

export async function writeClickMigFileToS3(
  tenantId: string,
  fileId: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const key = clickMigS3ObjectKey(tenantId, fileId);
  await putS3ObjectBytes(key, body, contentType);
  return s3RelPathFromKey(key);
}

export async function readClickMigFileBytes(
  diskRelPath: string | null | undefined,
  data: Buffer | Uint8Array | null | undefined,
): Promise<Buffer | null> {
  if (data && data.length > 0) return Buffer.from(data);
  if (!diskRelPath) return null;
  const s3Key = s3KeyFromRelPath(diskRelPath);
  if (s3Key) {
    const bytes = await getS3ObjectBytes(s3Key);
    return bytes ? Buffer.from(bytes) : null;
  }
  try {
    const abs = absolutePathFromRel(diskRelPath);
    return await fs.readFile(abs);
  } catch {
    return null;
  }
}

export async function deleteClickMigFileStorage(
  diskRelPath: string | null | undefined,
): Promise<void> {
  if (!diskRelPath) return;
  const s3Key = s3KeyFromRelPath(diskRelPath);
  if (s3Key) {
    await deleteS3Object(s3Key);
    return;
  }
  try {
    await fs.unlink(absolutePathFromRel(diskRelPath));
  } catch {
    /* ignore */
  }
}

export function inferClickMigFileKind(
  mimeType: string,
  fileName: string,
): ClickMigFileKind {
  const lower = fileName.toLowerCase();
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("image/")) return "PHOTO";
  if (
    lower.endsWith(".stl") ||
    lower.endsWith(".ply") ||
    lower.endsWith(".obj") ||
    lower.endsWith(".zip")
  ) {
    return "SCAN";
  }
  return "OTHER";
}

export function isClickMigMeshFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith(".stl") ||
    lower.endsWith(".ply") ||
    lower.endsWith(".obj")
  );
}

export function isClickMigS3Enabled(): boolean {
  return isS3StorageEnabled();
}
