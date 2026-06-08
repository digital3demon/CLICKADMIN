import type { PrismaClient } from "@prisma/client";
import {
  dedupeParsedKaitenComments,
  parseKaitenListComment,
} from "@/lib/kaiten-comment-parse";
import { isKaitenRateLimitedStatus } from "@/lib/kaiten-rate-limit";
import { getKaitenRestAuth, kaitenListComments } from "@/lib/kaiten-rest";
import { invalidateKaitenSnapshotCache } from "@/lib/kaiten-snapshot-cache";
import { syncOrderChatCorrectionsFromKaitenComments } from "@/lib/order-chat-correction-db";
import { syncOrderProstheticsRequestsFromKaitenComments } from "@/lib/order-prosthetics-request-db";

/**
 * Тянет комментарии карточки из Kaiten и синхронизирует «!!!» в OrderChatCorrection.
 * По умолчанию инвалидирует кэш GET /kaiten; для фонового пакета со списком нарядов
 * можно отключить, чтобы не сбрасывать снимок на каждом тике.
 */
export async function syncOrderChatCorrectionsFromKaitenLive(
  prisma: PrismaClient,
  orderId: string,
  kaitenCardId: number,
  opts?: { invalidateSnapshot?: boolean },
): Promise<{ synced: boolean; rateLimited: boolean }> {
  const auth = getKaitenRestAuth();
  if (!auth) return { synced: false, rateLimited: false };

  const comm = await kaitenListComments(auth, kaitenCardId);
  if (!comm.ok) {
    return {
      synced: false,
      rateLimited: isKaitenRateLimitedStatus(comm.status),
    };
  }

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
  return { synced: true, rateLimited: false };
}
