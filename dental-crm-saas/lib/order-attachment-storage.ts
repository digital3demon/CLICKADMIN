import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";

/** Абсолютный корень хранилища вложений (override: `ORDER_ATTACHMENT_STORAGE_DIR`). */
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
