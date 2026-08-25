/**
 * Тянет файлы с карточки Kaiten в OrderAttachment, если их ещё нет в наряде.
 * По kaitenFileId, не по имени (несколько image.png).
 */
import "server-only";

import { OrderAttachmentScope, type PrismaClient } from "@prisma/client";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  collectKaitenRemoteFiles,
  filesMissingFromOrder,
  resolveKaitenFileUrl,
  type KaitenRemoteFile,
} from "@/lib/kaiten-card-files";
import {
  getKaitenRestAuth,
  kaitenGetCard,
  kaitenListComments,
  type KaitenAuth,
} from "@/lib/kaiten-rest";
import {
  isOrderAttachmentS3Enabled,
  newOrderAttachmentId,
  writeOrderAttachmentToDisk,
  writeOrderAttachmentToS3,
} from "@/lib/order-attachment-storage";
import { kaitenLogger } from "@/lib/server/logger";

const IMPORT_MAX_BYTES = 40 * 1024 * 1024;
const IMPORT_LIMIT = 8;
const COOLDOWN_MS = 15_000;

const lastImportAt = new Map<string, number>();

async function downloadKaitenBytes(
  auth: KaitenAuth,
  file: KaitenRemoteFile,
): Promise<{ buf: Buffer; mime: string } | null> {
  if (!file.url) return null;
  const url = resolveKaitenFileUrl(file.url, auth.apiBase);
  let res = await fetch(url);
  if (res.status === 401 || res.status === 403) {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
  }
  if (!res.ok) return null;
  const mime =
    res.headers.get("content-type")?.split(";")[0]?.trim() ||
    file.mime ||
    "application/octet-stream";
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength === 0 || buf.byteLength > IMPORT_MAX_BYTES) return null;
  return { buf, mime };
}

function normalizeAttachName(name: string): string {
  return String(name || "")
    .replace(/\uFEFF/g, "")
    .trim()
    .toLowerCase();
}

/**
 * CRM уже сохранил файл, Kaiten ещё не проставил kaitenFileId.
 * Не плодим второе вложение с тем же именем и размером.
 */
async function bindImportedFileToCrmTwin(
  prisma: PrismaClient,
  orderId: string,
  file: KaitenRemoteFile,
  byteLength: number,
): Promise<boolean> {
  const want = normalizeAttachName(file.name);
  if (!want || byteLength <= 0) return false;
  const orphans = await prisma.orderAttachment.findMany({
    where: { orderId, kaitenFileId: null, size: byteLength },
    orderBy: { createdAt: "desc" },
    take: 24,
    select: { id: true, fileName: true },
  });
  const match = orphans.find((row) => normalizeAttachName(row.fileName) === want);
  if (!match) return false;
  await prisma.orderAttachment.update({
    where: { id: match.id },
    data: {
      kaitenFileId: file.kaitenFileId,
      uploadedToKaitenAt: new Date(),
    },
  });
  return true;
}

async function storeImportedFile(
  prisma: PrismaClient,
  orderId: string,
  file: KaitenRemoteFile,
  buf: Buffer,
  mime: string,
): Promise<void> {
  const attachmentId = newOrderAttachmentId();
  let diskRelPath: string | null = null;
  let dataForDb = buf;
  if (isOrderAttachmentS3Enabled()) {
    try {
      diskRelPath = await writeOrderAttachmentToS3(orderId, attachmentId, buf, mime);
      dataForDb = Buffer.alloc(0);
    } catch {
      diskRelPath = await writeOrderAttachmentToDisk(orderId, attachmentId, buf);
      dataForDb = Buffer.alloc(0);
    }
  } else {
    diskRelPath = await writeOrderAttachmentToDisk(orderId, attachmentId, buf);
    dataForDb = Buffer.alloc(0);
  }
  const safeName = String(file.name || "file").replace(/[\r\n"]/g, "").slice(0, 180);
  await prisma.orderAttachment.create({
    data: {
      id: attachmentId,
      orderId,
      scope: OrderAttachmentScope.GENERAL,
      fileName: safeName || "file",
      mimeType: mime,
      size: buf.byteLength,
      data: new Uint8Array(dataForDb),
      diskRelPath,
      kaitenFileId: file.kaitenFileId,
      uploadedToKaitenAt: new Date(),
    },
  });
}

export async function importMissingKaitenFilesForOrder(
  orderIdRaw: string,
  opts?: { prisma?: PrismaClient; limit?: number; force?: boolean },
): Promise<{ imported: number }> {
  const orderId = String(orderIdRaw || "").trim();
  if (!orderId) return { imported: 0 };
  const now = Date.now();
  if (!opts?.force) {
    const prev = lastImportAt.get(orderId) ?? 0;
    if (now - prev < COOLDOWN_MS) return { imported: 0 };
  }
  lastImportAt.set(orderId, now);

  const auth = getKaitenRestAuth();
  if (!auth) return { imported: 0 };
  const prisma = opts?.prisma ?? (await getOrdersPrisma());
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { kaitenCardId: true },
  });
  const cardId = order?.kaitenCardId;
  if (cardId == null) return { imported: 0 };

  const cardRes = await kaitenGetCard(auth, cardId);
  if (!cardRes.ok || !cardRes.card) return { imported: 0 };
  const comments = await kaitenListComments(auth, cardId);
  const commentRecords = comments.ok
    ? comments.comments.filter(
        (c): c is Record<string, unknown> =>
          c != null && typeof c === "object" && !Array.isArray(c),
      )
    : [];
  const remote = collectKaitenRemoteFiles([cardRes.card, ...commentRecords]);
  if (remote.length === 0) return { imported: 0 };

  const existing = await prisma.orderAttachment.findMany({
    where: { orderId, kaitenFileId: { not: null } },
    select: { kaitenFileId: true },
  });
  const missing = filesMissingFromOrder(
    remote,
    existing
      .map((r) => r.kaitenFileId)
      .filter((id): id is number => id != null),
  );
  const cap = Math.min(Math.max(1, opts?.limit ?? IMPORT_LIMIT), IMPORT_LIMIT);
  let imported = 0;
  for (const file of missing.slice(0, cap)) {
    try {
      const downloaded = await downloadKaitenBytes(auth, file);
      if (!downloaded) continue;
      const bound = await bindImportedFileToCrmTwin(
        prisma,
        orderId,
        file,
        downloaded.buf.byteLength,
      );
      if (bound) continue;
      await storeImportedFile(prisma, orderId, file, downloaded.buf, downloaded.mime);
      imported += 1;
    } catch (e) {
      kaitenLogger.warn(
        { err: e, orderId, kaitenFileId: file.kaitenFileId, msg: "kaiten_file_import_failed" },
        "kaiten file import failed",
      );
    }
  }
  return { imported };
}
