import type { PrismaClient } from "@prisma/client";
import {
  dedupeParsedKaitenComments,
  parseKaitenListComment,
} from "@/lib/kaiten-comment-parse";
import { isOrderChatCorrectionTrigger } from "@/lib/order-chat-correction";
import { isOrderProstheticsRequestTrigger } from "@/lib/order-prosthetics-request";
import { isKaitenRateLimitedStatus } from "@/lib/kaiten-rate-limit";
import { getKaitenRestAuth, kaitenListComments, type KaitenAuth } from "@/lib/kaiten-rest";
import { invalidateKaitenSnapshotCache } from "@/lib/kaiten-snapshot-cache";
import { ingestKaitenCommentsForOrder } from "@/lib/kanban/kaiten-comments-ingest-server";
import {
  syncOrderChatCorrectionsFromKaitenComments,
} from "@/lib/order-chat-correction-db";
import { syncOrderProstheticsRequestsFromKaitenComments } from "@/lib/order-prosthetics-request-db";
import { mapParsedKaitenCommentsForTriggerSync } from "@/lib/order-chat-trigger-author";
import { kaitenLogger } from "@/lib/server/logger";

export type KaitenChatLiveSyncResult = {
  synced: boolean;
  rateLimited: boolean;
  commentCount: number;
  importedCorrections: number;
  importedProsthetics: number;
  labMentionDbChanged: boolean;
  elapsedMs: number;
};

const EMPTY_LIVE_SYNC = {
  synced: false,
  rateLimited: false,
  commentCount: 0,
  importedCorrections: 0,
  importedProsthetics: 0,
  labMentionDbChanged: false,
} as const;

export type KaitenChatCommentSyncSource =
  | "live"
  | "cron"
  | "list"
  | "titles_sync"
  | "unknown";

function textSnippet(text: string, max = 80): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

async function touchKaitenChatSyncedAt(
  prisma: PrismaClient,
  orderId: string,
): Promise<void> {
  await prisma.order.update({
    where: { id: orderId.trim() },
    data: { kaitenChatSyncedAt: new Date() },
  });
}

async function logNewCorrectionsFromComments(
  prisma: PrismaClient,
  orderId: string,
  comments: ReturnType<typeof mapParsedKaitenCommentsForTriggerSync>,
  corrBefore: number,
): Promise<number> {
  const corrAfter = await prisma.orderChatCorrection.count({
    where: { orderId: orderId.trim(), resolvedAt: null, rejectedAt: null },
  });
  const imported = Math.max(0, corrAfter - corrBefore);
  if (imported > 0) {
    for (const c of comments) {
      if (!isOrderChatCorrectionTrigger(c.text)) continue;
      kaitenLogger.info(
        {
          msg: "kaiten_correction_created",
          orderId: orderId.trim(),
          kaitenCommentId: c.id,
          textSnippet: textSnippet(c.text),
          authorLabel: c.authorName ?? null,
        },
        "kaiten correction imported",
      );
    }
  }
  return imported;
}

async function countNewProstheticsFromComments(
  prisma: PrismaClient,
  orderId: string,
  comments: ReturnType<typeof mapParsedKaitenCommentsForTriggerSync>,
  prosthBefore: number,
): Promise<number> {
  const prosthAfter = await prisma.orderProstheticsRequest.count({
    where: { orderId: orderId.trim(), resolvedAt: null, rejectedAt: null },
  });
  const imported = Math.max(0, prosthAfter - prosthBefore);
  if (imported > 0) {
    for (const c of comments) {
      if (!isOrderProstheticsRequestTrigger(c.text)) continue;
      kaitenLogger.info(
        {
          msg: "kaiten_prosthetics_created",
          orderId: orderId.trim(),
          kaitenCommentId: c.id,
          textSnippet: textSnippet(c.text),
          authorLabel: c.authorName ?? null,
        },
        "kaiten prosthetics imported",
      );
    }
  }
  return imported;
}

/**
 * Тянет комментарии карточки из Kaiten, зеркалит в CRM-канбан и синхронизирует «!!!» / «???» в БД.
 * UI читает ленту из kanban state; путь «???»: Kaiten → канбан → CRM (DEMO_KANBAN).
 */
export async function syncOrderChatCorrectionsFromKaitenLive(
  prisma: PrismaClient,
  orderId: string,
  kaitenCardId: number,
  opts?: {
    invalidateSnapshot?: boolean;
    source?: KaitenChatCommentSyncSource;
  },
): Promise<KaitenChatLiveSyncResult> {
  const startedAt = Date.now();
  const source = opts?.source ?? "live";
  const oid = orderId.trim();

  kaitenLogger.debug(
    { msg: "kaiten_list_comments_start", orderId: oid, kaitenCardId, source },
    "kaiten list comments start",
  );

  const auth = getKaitenRestAuth();
  if (!auth) {
    kaitenLogger.warn(
      { msg: "kaiten_list_comments_skip", orderId: oid, source, reason: "no_auth" },
      "kaiten list comments skipped",
    );
    return { ...EMPTY_LIVE_SYNC, elapsedMs: Date.now() - startedAt };
  }

  const [corrBefore, prosthBefore, orderMeta] = await Promise.all([
    prisma.orderChatCorrection.count({
      where: { orderId: oid, resolvedAt: null, rejectedAt: null },
    }),
    prisma.orderProstheticsRequest.count({
      where: { orderId: oid, resolvedAt: null, rejectedAt: null },
    }),
    prisma.order.findUnique({
      where: { id: oid },
      select: {
        tenantId: true,
        tenant: { select: { kanbanAdminMentionTag: true } },
      },
    }),
  ]);

  const comm = await kaitenListComments(auth, kaitenCardId);
  if (!comm.ok) {
    const rateLimited = isKaitenRateLimitedStatus(comm.status);
    kaitenLogger.warn(
      {
        msg: "kaiten_list_comments_done",
        orderId: oid,
        kaitenCardId,
        source,
        status: comm.status,
        rateLimited,
        commentCount: 0,
        importedCorrections: 0,
        importedProsthetics: 0,
        elapsedMs: Date.now() - startedAt,
      },
      "kaiten list comments failed",
    );
    return {
      ...EMPTY_LIVE_SYNC,
      rateLimited,
      elapsedMs: Date.now() - startedAt,
    };
  }

  const parsedFull = dedupeParsedKaitenComments(
    comm.comments
      .map(parseKaitenListComment)
      .filter((x): x is NonNullable<typeof x> => x != null),
  );
  const comments = mapParsedKaitenCommentsForTriggerSync(parsedFull);

  let labMentionDbChanged = false;
  const tenantId = orderMeta?.tenantId?.trim();
  if (tenantId && parsedFull.length > 0) {
    try {
      const ingested = await ingestKaitenCommentsForOrder({
        prisma,
        tenantId,
        orderId: oid,
        parsed: parsedFull,
        kanbanAdminMentionTag: orderMeta?.tenant?.kanbanAdminMentionTag,
      });
      labMentionDbChanged = ingested.labMentionDbChanged;
    } catch (err) {
      kaitenLogger.error(
        { err, orderId: oid, source, msg: "kaiten_comments_ingest" },
        "kaiten comments ingest failed",
      );
    }
  } else if (parsedFull.length > 0) {
    await syncOrderChatCorrectionsFromKaitenComments(prisma, oid, comments);
    await syncOrderProstheticsRequestsFromKaitenComments(prisma, oid, comments);
  }
  const [importedCorrections, importedProsthetics] = await Promise.all([
    logNewCorrectionsFromComments(prisma, oid, comments, corrBefore),
    countNewProstheticsFromComments(prisma, oid, comments, prosthBefore),
  ]);
  await touchKaitenChatSyncedAt(prisma, oid);

  if (opts?.invalidateSnapshot !== false) {
    invalidateKaitenSnapshotCache(oid);
  }

  const elapsedMs = Date.now() - startedAt;
  kaitenLogger.info(
    {
      msg: "kaiten_list_comments_done",
      orderId: oid,
      kaitenCardId,
      source,
      commentCount: comments.length,
      importedCorrections,
      importedProsthetics,
      labMentionDbChanged,
      rateLimited: false,
      elapsedMs,
    },
    "kaiten list comments done",
  );

  return {
    synced: true,
    rateLimited: false,
    commentCount: comments.length,
    importedCorrections,
    importedProsthetics,
    labMentionDbChanged,
    elapsedMs,
  };
}

export type KaitenChatCommentsBatchResult = {
  syncedCount: number;
  errorCount: number;
  rateLimited: boolean;
  checkedCount: number;
};

/**
 * Фоновый пакет: только комментарии (1 req/наряд), без карточки и колонок.
 */
export async function syncKaitenChatCommentsForOrderIds(
  db: PrismaClient,
  _auth: KaitenAuth,
  orderIds: string[],
  opts?: { source?: KaitenChatCommentSyncSource },
): Promise<KaitenChatCommentsBatchResult> {
  const source = opts?.source ?? "cron";
  const uniq = [...new Set(orderIds.map((x) => x.trim()).filter(Boolean))];
  if (uniq.length === 0) {
    return { syncedCount: 0, errorCount: 0, rateLimited: false, checkedCount: 0 };
  }

  const rows = await db.order.findMany({
    where: { id: { in: uniq } },
    select: { id: true, kaitenCardId: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));

  let syncedCount = 0;
  let errorCount = 0;
  let rateLimited = false;
  let checkedCount = 0;

  for (const orderId of uniq) {
    if (rateLimited) break;
    const row = byId.get(orderId);
    if (row?.kaitenCardId == null) {
      errorCount += 1;
      continue;
    }
    checkedCount += 1;
    try {
      const res = await syncOrderChatCorrectionsFromKaitenLive(
        db,
        row.id,
        row.kaitenCardId,
        { invalidateSnapshot: false, source },
      );
      if (res.rateLimited) {
        rateLimited = true;
        kaitenLogger.warn(
          {
            msg: "kaiten_chat_background_rate_limited",
            orderId: row.id,
            checkedSoFar: checkedCount,
            source,
          },
          "kaiten chat background rate limited",
        );
        break;
      }
      if (res.synced) syncedCount += 1;
      else errorCount += 1;
    } catch (err) {
      errorCount += 1;
      kaitenLogger.error(
        { err, orderId: row.id, source },
        "kaiten chat comments batch item failed",
      );
    }
  }

  return { syncedCount, errorCount, rateLimited, checkedCount };
}
