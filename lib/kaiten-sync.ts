import { OrderAttachmentScope, type Prisma, type PrismaClient } from "@prisma/client";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { readOrderAttachmentBytes } from "@/lib/order-attachment-storage";
import { isOrderAttachmentEligibleForKaitenPush } from "@/lib/kaiten-attachment-eligibility";
import {
  KAITEN_PUSH_IN_FLIGHT_AT,
  isOrderAttachmentUploadedToKaiten,
} from "@/lib/kaiten-attachment-upload-state";
import { isKaitenRateLimitedStatus } from "@/lib/kaiten-rate-limit";
import {
  enqueueKaitenRequest,
  getKaitenRestAuth,
  kaitenDeleteCardFile,
  kaitenGetCard,
  shouldRetryKaitenStatus,
} from "@/lib/kaiten-rest";
import { kaitenLogger } from "@/lib/server/logger";

export class KaitenRateLimitError extends Error {
  constructor(message = "Kaiten rate limit (429)") {
    super(message);
    this.name = "KaitenRateLimitError";
  }
}

export class KaitenCardNotReadyError extends Error {
  constructor() {
    super("Kaiten card not linked yet");
    this.name = "KaitenCardNotReadyError";
  }
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function tryClaimKaitenPush(
  prisma: PrismaClient,
  orderId: string,
  attachmentId: string,
): Promise<boolean> {
  /** Только null → in-flight: иначе два параллельных push (deferred + sync) грузят один файл дважды. */
  const claimed = await prisma.orderAttachment.updateMany({
    where: {
      id: attachmentId,
      orderId,
      uploadedToKaitenAt: null,
    },
    data: { uploadedToKaitenAt: KAITEN_PUSH_IN_FLIGHT_AT },
  });
  return claimed.count > 0;
}

async function reclaimStaleKaitenPushClaimIfAny(
  prisma: PrismaClient,
  attachmentId: string,
): Promise<void> {
  await prisma.orderAttachment.updateMany({
    where: {
      id: attachmentId,
      uploadedToKaitenAt: KAITEN_PUSH_IN_FLIGHT_AT,
    },
    data: { uploadedToKaitenAt: null },
  });
}

async function waitForPeerKaitenPushComplete(
  prisma: PrismaClient,
  attachmentId: string,
  maxWaitMs: number,
): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    const row = await prisma.orderAttachment.findUnique({
      where: { id: attachmentId },
      select: { uploadedToKaitenAt: true },
    });
    if (isOrderAttachmentUploadedToKaiten(row?.uploadedToKaitenAt)) {
      return true;
    }
    await sleepMs(400);
  }
  return false;
}

const unpushedToKaitenWhere: Prisma.OrderAttachmentWhereInput = {
  OR: [
    { uploadedToKaitenAt: null },
    { uploadedToKaitenAt: KAITEN_PUSH_IN_FLIGHT_AT },
  ],
};

async function releaseKaitenPushClaim(
  prisma: PrismaClient,
  attachmentId: string,
): Promise<void> {
  await prisma.orderAttachment.updateMany({
    where: { id: attachmentId, uploadedToKaitenAt: KAITEN_PUSH_IN_FLIGHT_AT },
    data: { uploadedToKaitenAt: null },
  });
}

function findKaitenFileIdOnCard(
  card: Record<string, unknown>,
  fileName: string,
): number | null {
  const files = card.files;
  if (!Array.isArray(files)) return null;
  const matches: number[] = [];
  for (const f of files) {
    if (!f || typeof f !== "object") continue;
    const o = f as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name : null;
    const id = typeof o.id === "number" && Number.isFinite(o.id) ? o.id : null;
    if (name === fileName && id != null) matches.push(id);
  }
  /* Несколько image.png — не угадываем «тот же» файл по имени. */
  if (matches.length !== 1) return null;
  return matches[0] ?? null;
}

export type OrderAttachmentKaitenHint = {
  orderId: string;
  fileName: string;
  uploadedToKaitenAt: Date | null;
  kaitenFileId: number | null;
};

/**
 * Удаляет файл с карточки Kaiten, если он ранее был выгружен (есть id или совпадение по имени на карточке).
 * Без токена / без kaitenCardId — no-op. 404 от Kaiten считаем успехом (уже удалён).
 */
export async function removeAttachmentFromKaitenIfAny(
  hint: OrderAttachmentKaitenHint,
  db?: PrismaClient,
): Promise<void> {
  const auth = getKaitenRestAuth();
  if (!auth) return;

  const prisma = db ?? (await getOrdersPrisma());
  const order = await prisma.order.findUnique({
    where: { id: hint.orderId },
    select: { kaitenCardId: true },
  });
  const cardId = order?.kaitenCardId;
  if (cardId == null) return;

  if (hint.uploadedToKaitenAt == null && hint.kaitenFileId == null) return;

  let fileId = hint.kaitenFileId;
  if (fileId == null && hint.uploadedToKaitenAt != null) {
    const cardRes = await kaitenGetCard(auth, cardId);
    if (!cardRes.ok || !cardRes.card) return;
    fileId = findKaitenFileIdOnCard(cardRes.card, hint.fileName);
  }
  if (fileId == null) return;

  const del = await kaitenDeleteCardFile(auth, cardId, fileId);
  if (!del.ok && del.status !== 404) {
    throw new Error(
      `Kaiten: не удалось удалить файл с карточки (${del.status}): ${del.error ?? ""}`,
    );
  }
}

/**
 * Загружает вложение в карточку Kaiten: PUT /api/v1/cards/{card_id}/files
 * При успехе выставляет uploadedToKaitenAt и kaitenFileId (если id есть в ответе).
 */
export async function pushAttachmentToKaiten(
  orderId: string,
  attachmentId: string,
  db?: PrismaClient,
): Promise<void> {
  const auth = getKaitenRestAuth();
  if (!auth) {
    return;
  }

  const prisma = db ?? (await getOrdersPrisma());
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { kaitenCardId: true },
  });
  if (!order?.kaitenCardId) {
    throw new KaitenCardNotReadyError();
  }

  const existing = await prisma.orderAttachment.findUnique({
    where: { id: attachmentId },
    select: { uploadedToKaitenAt: true },
  });
  if (isOrderAttachmentUploadedToKaiten(existing?.uploadedToKaitenAt)) {
    return;
  }

  let claimed = await tryClaimKaitenPush(prisma, orderId, attachmentId);
  if (!claimed) {
    const done = await waitForPeerKaitenPushComplete(prisma, attachmentId, 25_000);
    if (done) return;
    await reclaimStaleKaitenPushClaimIfAny(prisma, attachmentId);
    claimed = await tryClaimKaitenPush(prisma, orderId, attachmentId);
    if (!claimed) {
      const again = await prisma.orderAttachment.findUnique({
        where: { id: attachmentId },
        select: { uploadedToKaitenAt: true },
      });
      if (isOrderAttachmentUploadedToKaiten(again?.uploadedToKaitenAt)) {
        return;
      }
      throw new Error(
        "Не удалось начать выгрузку в Kaiten — повторите или дождитесь фоновой синхронизации",
      );
    }
  }

  try {
  const att = await prisma.orderAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      fileName: true,
      mimeType: true,
      data: true,
      diskRelPath: true,
    },
  });
  if (!att) {
    throw new Error("Вложение не найдено");
  }

  const bytes = await readOrderAttachmentBytes(att);

  const mime = att.mimeType || "application/octet-stream";

  const url = `${auth.apiBase}/cards/${order.kaitenCardId}/files`;
  /** Несколько попыток: каждый раз новый FormData/File — тело multipart одноразовое. */
  const maxAttempts = 6;
  let lastText = "";
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const file = new File([new Uint8Array(bytes)], att.fileName, { type: mime });
    const form = new FormData();
    form.append("file", file);
    const res = await enqueueKaitenRequest(() =>
      fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: form,
      }),
    );
    lastText = await res.text();
    if (res.ok) {
      let kaitenFileId: number | null = null;
      if (lastText.trim()) {
        try {
          const j = JSON.parse(lastText) as { id?: unknown };
          if (typeof j.id === "number" && Number.isFinite(j.id)) {
            kaitenFileId = j.id;
          }
        } catch {
          /* ответ без JSON */
        }
      }
      await prisma.orderAttachment.update({
        where: { id: attachmentId },
        data: {
          uploadedToKaitenAt: new Date(),
          ...(kaitenFileId != null ? { kaitenFileId } : {}),
        },
      });
      return;
    }
    if (!shouldRetryKaitenStatus(res.status) || attempt === maxAttempts - 1) {
      const tail = lastText.length > 400 ? "…" : "";
      const msg = `Kaiten ${res.status}: ${lastText.slice(0, 400)}${tail}`;
      if (isKaitenRateLimitedStatus(res.status)) {
        throw new KaitenRateLimitError(msg);
      }
      throw new Error(msg);
    }
    const ra = res.headers.get("retry-after");
    let wait = 500 * (attempt + 1) ** 2;
    if (ra != null && ra.trim()) {
      const sec = Number.parseInt(ra.trim(), 10);
      if (Number.isFinite(sec) && sec >= 0) {
        wait = Math.min(120_000, sec * 1000);
      }
    }
    await sleepMs(Math.max(300, wait));
  }
  } catch (e) {
    await releaseKaitenPushClaim(prisma, attachmentId);
    throw e;
  }
}

/**
 * Ждёт появления kaitenCardId (файлы часто приходят раньше карточки) и пушит вложение.
 */
export async function pushAttachmentToKaitenWithCardWait(
  orderId: string,
  attachmentId: string,
  db?: PrismaClient,
  options?: { maxWaitMs?: number },
): Promise<void> {
  const maxWaitMs = options?.maxWaitMs ?? 90_000;
  const started = Date.now();
  let delayMs = 400;
  while (true) {
    try {
      await pushAttachmentToKaiten(orderId, attachmentId, db);
      return;
    } catch (e) {
      if (!(e instanceof KaitenCardNotReadyError)) throw e;
      if (Date.now() - started >= maxWaitMs) return;
      await sleepMs(delayMs);
      delayMs = Math.min(Math.round(delayMs * 1.45), 5000);
    }
  }
}

/**
 * Повторная выгрузка в Kaiten для вложений без uploadedToKaitenAt (карта уже есть).
 * Нужен после сценария «сначала файлы, карточка ещё не создалась» или сбоев/429.
 */
/** После тяжёлого cron-синка — меньше файлов за проход, чтобы не добить лимит. */
const DEFAULT_BACKGROUND_ATTACHMENT_PUSH_LIMIT = 5;

/**
 * Фоновая догрузка вложений без uploadedToKaitenAt (счета и платёжки пропускаются).
 */
export async function syncAllUnpushedAttachmentsInBackground(
  db?: PrismaClient,
  limit = DEFAULT_BACKGROUND_ATTACHMENT_PUSH_LIMIT,
): Promise<{
  attempted: number;
  pushed: number;
  failed: number;
  rateLimited: boolean;
}> {
  const auth = getKaitenRestAuth();
  if (!auth) {
    return { attempted: 0, pushed: 0, failed: 0, rateLimited: false };
  }

  const prisma = db ?? (await getOrdersPrisma());
  const cap = Math.min(Math.max(1, Math.trunc(limit)), 20);
  const rows = await prisma.orderAttachment.findMany({
    where: {
      ...unpushedToKaitenWhere,
      scope: {
        notIn: [
          OrderAttachmentScope.PAYMENT_SLIP,
          OrderAttachmentScope.SCANNER,
        ],
      },
      order: { kaitenCardId: { not: null } },
    },
    select: {
      id: true,
      orderId: true,
      scope: true,
      order: { select: { invoiceAttachmentId: true } },
    },
    orderBy: { createdAt: "asc" },
    take: cap * 3,
  });

  const eligible = rows
    .filter((r) => isOrderAttachmentEligibleForKaitenPush(r))
    .slice(0, cap);

  let pushed = 0;
  let failed = 0;
  let rateLimited = false;
  for (const r of eligible) {
    try {
      await pushAttachmentToKaiten(r.orderId, r.id, prisma);
      pushed += 1;
    } catch (e) {
      failed += 1;
      if (e instanceof KaitenRateLimitError) {
        rateLimited = true;
        kaitenLogger.warn(
          { msg: "kaiten_attachment_bg_rate_limited", orderId: r.orderId, attachmentId: r.id },
          "background attachment sync rate limited",
        );
        break;
      }
      kaitenLogger.error(
        { err: e, orderId: r.orderId, attachmentId: r.id, msg: "kaiten_attachment_bg_failed" },
        "background attachment sync failed",
      );
    }
  }
  return { attempted: eligible.length, pushed, failed, rateLimited };
}

/** Два вложения с одним kaitenFileId — лишние снова выгружаем (баг image.png). */
export async function clearDuplicateKaitenFileIdClaims(
  orderId: string,
  db?: PrismaClient,
): Promise<number> {
  const prisma = db ?? (await getOrdersPrisma());
  const rows = await prisma.orderAttachment.findMany({
    where: { orderId, kaitenFileId: { not: null } },
    select: { id: true, kaitenFileId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const seen = new Set<number>();
  const clearIds: string[] = [];
  for (const r of rows) {
    if (r.kaitenFileId == null) continue;
    if (seen.has(r.kaitenFileId)) clearIds.push(r.id);
    else seen.add(r.kaitenFileId);
  }
  if (clearIds.length === 0) return 0;
  await prisma.orderAttachment.updateMany({
    where: { id: { in: clearIds } },
    data: { uploadedToKaitenAt: null, kaitenFileId: null },
  });
  return clearIds.length;
}

export async function syncUnpushedOrderAttachmentsToKaiten(
  orderId: string,
  db?: PrismaClient,
): Promise<void> {
  const prisma = db ?? (await getOrdersPrisma());
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { kaitenCardId: true },
  });
  if (!order?.kaitenCardId) return;

  await clearDuplicateKaitenFileIdClaims(orderId, prisma);

  const rows = await prisma.orderAttachment.findMany({
    where: { orderId, ...unpushedToKaitenWhere },
    select: {
      id: true,
      scope: true,
      order: { select: { invoiceAttachmentId: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  for (const r of rows) {
    if (!isOrderAttachmentEligibleForKaitenPush(r)) continue;
    try {
      await pushAttachmentToKaiten(orderId, r.id, prisma);
    } catch (e) {
      if (e instanceof KaitenRateLimitError) {
        kaitenLogger.warn(
          { msg: "kaiten_attachment_order_rate_limited", orderId },
          "order attachment sync rate limited",
        );
        break;
      }
      kaitenLogger.error(
        { err: e, orderId, attachmentId: r.id, msg: "kaiten_attachment_order_failed" },
        "order attachment sync failed",
      );
    }
  }
}
