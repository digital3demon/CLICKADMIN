import type { PrismaClient } from "@prisma/client";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { readOrderAttachmentBytes } from "@/lib/order-attachment-storage";
import {
  enqueueKaitenRequest,
  getKaitenRestAuth,
  kaitenDeleteCardFile,
  kaitenGetCard,
  shouldRetryKaitenStatus,
} from "@/lib/kaiten-rest";

function sleepMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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
  if (matches.length === 0) return null;
  return Math.max(...matches);
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
    return;
  }

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
  const file = new File([new Uint8Array(bytes)], att.fileName, { type: mime });
  const form = new FormData();
  form.append("file", file);

  const url = `${auth.apiBase}/cards/${order.kaitenCardId}/files`;
  const maxAttempts = 4;
  let lastText = "";
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
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
      throw new Error(
        `Kaiten ${res.status}: ${lastText.slice(0, 400)}${tail}`,
      );
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
}

/**
 * Повторная выгрузка в Kaiten для вложений без uploadedToKaitenAt (карта уже есть).
 * Нужен после сценария «сначала файлы, карточка ещё не создалась» или сбоев/429.
 */
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

  const rows = await prisma.orderAttachment.findMany({
    where: { orderId, uploadedToKaitenAt: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  for (const r of rows) {
    try {
      await pushAttachmentToKaiten(orderId, r.id, prisma);
    } catch (e) {
      console.error(
        "[kaiten-sync] syncUnpushedOrderAttachmentsToKaiten",
        orderId,
        r.id,
        e,
      );
    }
  }
}
