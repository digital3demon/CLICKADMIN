import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { deleteS3Object, getS3ObjectBytes, isS3StorageEnabled, putS3ObjectBytes } from "@/lib/s3-client";

/**
 * Новые вложения — в БД (`OrderAttachment.data`). Корень на диске нужен только для
 * старых строк с `diskRelPath` (override: `ORDER_ATTACHMENT_STORAGE_DIR`).
 */
export function getOrderAttachmentStorageRoot(): string {
  const fromEnv = process.env.ORDER_ATTACHMENT_STORAGE_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(process.cwd(), "data", "order-attachments");
}

/** Относительный путь внутри корня (всегда POSIX для единообразия в БД). */
export function orderAttachmentDiskRelPath(
  orderId: string,
  attachmentId: string,
): string {
  return path.posix.join("orders", orderId, attachmentId);
}

export function newOrderAttachmentId(): string {
  return randomUUID();
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

export function orderAttachmentS3ObjectKey(
  orderId: string,
  attachmentId: string,
): string {
  return `orders/${orderId}/attachments/${attachmentId}`;
}

export function isOrderAttachmentS3Enabled(): boolean {
  return isS3StorageEnabled();
}

export async function writeOrderAttachmentToS3(
  orderId: string,
  attachmentId: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const key = orderAttachmentS3ObjectKey(orderId, attachmentId);
  await putS3ObjectBytes(key, body, contentType);
  return s3RelPathFromKey(key);
}

function absolutePathFromRel(rel: string): string {
  const parts = rel.replace(/\\/g, "/").split("/").filter(Boolean);
  return path.join(getOrderAttachmentStorageRoot(), ...parts);
}

/** Записывает байты на диск; возвращает `diskRelPath` для поля в БД. */
export async function writeOrderAttachmentToDisk(
  orderId: string,
  attachmentId: string,
  body: Buffer,
): Promise<string> {
  const rel = orderAttachmentDiskRelPath(orderId, attachmentId);
  const abs = absolutePathFromRel(rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, body);
  return rel;
}

export async function readOrderAttachmentBytes(row: {
  data: Uint8Array | Buffer;
  diskRelPath: string | null;
}): Promise<Buffer> {
  if (row.diskRelPath) {
    const s3Key = s3KeyFromRelPath(row.diskRelPath);
    if (s3Key) {
      return await getS3ObjectBytes(s3Key);
    }
    const abs = absolutePathFromRel(row.diskRelPath);
    return await fs.readFile(abs);
  }
  const d = row.data;
  if (d == null || (Buffer.isBuffer(d) ? d.length === 0 : d.byteLength === 0)) {
    throw new Error("Пустые данные вложения");
  }
  return Buffer.isBuffer(d) ? d : Buffer.from(d);
}

export async function deleteOrderAttachmentFile(
  rel: string | null | undefined,
): Promise<void> {
  if (!rel) return;
  const s3Key = s3KeyFromRelPath(rel);
  if (s3Key) {
    await deleteS3Object(s3Key);
    return;
  }
  try {
    await fs.unlink(absolutePathFromRel(rel));
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e
      ? (e as NodeJS.ErrnoException).code
      : undefined;
    if (code === "ENOENT") return;
    throw e;
  }
}
