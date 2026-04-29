import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";
import { readOrderAttachmentBytes } from "@/lib/order-attachment-storage";
import {
  getKaitenRestAuth,
  kaitenDeleteCardFile,
  kaitenGetCard,
} from "@/lib/kaiten-rest";

function getKaitenApiAuth(): { apiBase: string; token: string } | null {
  const token = process.env.KAITEN_API_TOKEN?.trim();
  if (!token) return null;
  const apiBase = (
    process.env.KAITEN_API_BASE_URL?.trim() || "https://clicklab.kaiten.ru/api/v1"
  ).replace(/\/+$/, "");
  return { apiBase, token };
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

  const prisma = db ?? (await getPrisma());
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
  const auth = getKaitenApiAuth();
  if (!auth) {
    return;
  }

  const prisma = db ?? (await getPrisma());
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
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${auth.token}`,
    },
    body: form,
  });

  const text = await res.text();
  if (!res.ok) {
    const tail = text.length > 400 ? "…" : "";
    throw new Error(`Kaiten ${res.status}: ${text.slice(0, 400)}${tail}`);
  }

  let kaitenFileId: number | null = null;
  if (text.trim()) {
    try {
      const j = JSON.parse(text) as { id?: unknown };
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
}
