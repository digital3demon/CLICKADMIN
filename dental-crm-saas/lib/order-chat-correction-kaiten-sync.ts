import type { PrismaClient } from "@prisma/client";
import {
  dedupeParsedKaitenComments,
  parseKaitenListComment,
} from "@/lib/kaiten-comment-parse";
import { getKaitenRestAuth, kaitenListComments } from "@/lib/kaiten-rest";
import { invalidateKaitenSnapshotCache } from "@/lib/kaiten-snapshot-cache";
import { syncOrderChatCorrectionsFromKaitenComments } from "@/lib/order-chat-correction-db";
import { syncOrderProstheticsRequestsFromKaitenComments } from "@/lib/order-prosthetics-request-db";

/**
 * Тянет комментарии карточки из Kaiten и синхронизирует «!!!» в OrderChatCorrection.
 * @returns true если запрос к Kaiten успешен.
 * По умолчанию инвалидирует кэш GET /kaiten; для фонового пакета со списком нарядов
 * можно отключить, чтобы не сбрасывать снимок на каждом тике.
 */
export async function syncOrderChatCorrectionsFromKaitenLive(
  prisma: PrismaClient,
  orderId: string,
  kaitenCardId: number,
  opts?: { invalidateSnapshot?: boolean },
): Promise<boolean> {
  const auth = getKaitenRestAuth();
  if (!auth) return false;

  const comm = await kaitenListComments(auth, kaitenCardId);
  if (!comm.ok) return false;

  const comments = dedupeParsedKaitenComments(
    comm.comments
      .map(parseKaitenListComment)
      .filter((x): x is NonNullable<typeof x> => x != null),
  ).map((c) => ({ id: c.id, text: c.text }));

  await syncOrderChatCorrectionsFromKaitenComments(prisma, orderId.trim(), comments);
  await syncOrderProstheticsRequestsFromKaitenComments(
    prisma,
    orderId.trim(),
    comments,
  );
  if (opts?.invalidateSnapshot !== false) {
    invalidateKaitenSnapshotCache(orderId.trim());
  }
  return true;
}
