import "server-only";

import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { deleteS3Object, getS3ObjectBytes, isS3StorageEnabled, putS3ObjectBytes } from "@/lib/s3-client";

const S3_REL_PREFIX = "s3:";

export type StoredMailAttachment = {
  diskRelPath: string;
  checksumSha256: string;
};

export function getMailAttachmentStorageRoot(): string {
  const fromEnv = process.env.MAIL_ATTACHMENT_STORAGE_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(process.cwd(), "data", "mail-attachments");
}

export function newMailAttachmentId(): string {
  return randomUUID();
}

export function mailAttachmentDiskRelPath(
  tenantId: string,
  emailId: string,
  attachmentId: string,
): string {
  return path.posix.join("tenants", tenantId, "mail", emailId, attachmentId);
}

export function mailAttachmentS3ObjectKey(
  tenantId: string,
  emailId: string,
  attachmentId: string,
): string {
  return `tenants/${tenantId}/mail/${emailId}/attachments/${attachmentId}`;
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
  const parts = rel.replace(/\\/g, "/").split("/").filter(Boolean);
  return path.join(getMailAttachmentStorageRoot(), ...parts);
}

export function sha256Hex(body: Buffer): string {
  return createHash("sha256").update(body).digest("hex");
}

export async function writeMailAttachmentBytes(input: {
  tenantId: string;
  emailId: string;
  attachmentId: string;
  body: Buffer;
  contentType: string;
}): Promise<StoredMailAttachment> {
  const checksumSha256 = sha256Hex(input.body);
  if (isS3StorageEnabled()) {
    const key = mailAttachmentS3ObjectKey(input.tenantId, input.emailId, input.attachmentId);
    await putS3ObjectBytes(key, input.body, input.contentType);
    return { diskRelPath: s3RelPathFromKey(key), checksumSha256 };
  }

  const rel = mailAttachmentDiskRelPath(input.tenantId, input.emailId, input.attachmentId);
  const abs = absolutePathFromRel(rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, input.body);
  return { diskRelPath: rel, checksumSha256 };
}

export async function readMailAttachmentBytes(row: {
  data: Uint8Array | Buffer | null;
  diskRelPath: string | null;
}): Promise<Buffer> {
  if (row.diskRelPath) {
    const s3Key = s3KeyFromRelPath(row.diskRelPath);
    if (s3Key) return getS3ObjectBytes(s3Key);
    return fs.readFile(absolutePathFromRel(row.diskRelPath));
  }

  if (!row.data || row.data.byteLength === 0) {
    throw new Error("Пустые данные вложения");
  }

  return Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data);
}

export async function deleteMailAttachmentBytes(rel: string | null | undefined): Promise<void> {
  if (!rel) return;
  const s3Key = s3KeyFromRelPath(rel);
  if (s3Key) {
    await deleteS3Object(s3Key);
    return;
  }

  try {
    await fs.unlink(absolutePathFromRel(rel));
  } catch (e) {
    const code =
      e && typeof e === "object" && "code" in e
        ? (e as NodeJS.ErrnoException).code
        : undefined;
    if (code === "ENOENT") return;
    throw e;
  }
}
