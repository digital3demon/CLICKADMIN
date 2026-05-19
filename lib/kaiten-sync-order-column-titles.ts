import type { PrismaClient } from "@prisma/client";
import { kaitenBlockedMetaFromCard } from "@/lib/kaiten-card-block";
import { kaitenColumnTitleFromBoard } from "@/lib/kaiten-column-title";
import { invalidateKaitenSnapshotCache } from "@/lib/kaiten-snapshot-cache";
import {
  type KaitenAuth,
  kaitenGetCard,
  kaitenListBoardColumns,
  kaitenListComments,
} from "@/lib/kaiten-rest";
import {
  dedupeParsedKaitenComments,
  parseKaitenListComment,
  textIncludesAdminLabMention,
} from "@/lib/kaiten-comment-parse";
import { normalizeKanbanAdminMentionTag } from "@/lib/kanban-admin-mention";
import { kaitenSortOrderFromCard } from "@/lib/kaiten-card-sort-order";
import { syncOrderChatCorrectionsFromKaitenComments } from "@/lib/order-chat-correction-db";
import { syncOrderProstheticsRequestsFromKaitenComments } from "@/lib/order-prosthetics-request-db";
import { syncKaitenLabMentionFromParsedComments } from "@/lib/order-kaiten-lab-mention-db";
import { syncKaitenCommentsIntoKanbanState } from "@/lib/kanban/chat-sync-server";

const MAX_IDS = 10;
/** Параллельные карточки — очередь в kaitenFetch + малый параллелизм снижает 429. */
const CARD_FETCH_CONCURRENCY = 2;
/** С комментариями на карточку — по одной: карта + список комментариев. */
const CARD_FETCH_CONCURRENCY_WITH_COMMENTS = 1;

type BoardColumn = { id: number; title: string; name?: string };

/**
 * Обновляет в БД `kaitenColumnTitle` по актуальной карточке Kaiten (для списков заказов / отгрузок).
 * Карточки запрашиваются пачками; колонки доски кэшируются по `board_id`.
 *
 * `includeComments: false` — только карточка (быстро): без чата, без метки «упомянули лабораторию», без синка корректировок из комментариев.
 */
export async function syncKaitenColumnTitlesForOrderIds(
  db: PrismaClient,
  auth: KaitenAuth,
  orderIds: string[],
  opts?: { includeComments?: boolean },
): Promise<{
  titles: Record<string, string | null>;
  syncedCount: number;
  errorCount: number;
  /** Есть ли в комментариях упоминание тега лаборатории (Tenant.kanbanAdminMentionTag; подсветка «чат» в списке). */
  clicklabByOrderId: Record<string, boolean>;
  /** Было ли изменение флага упоминания в БД (для router.refresh счётчика «Упоминания»). */
  kaitenLabMentionDbChanged: boolean;
}> {
  const uniq = [...new Set(orderIds.map((x) => x.trim()).filter(Boolean))].slice(
    0,
    MAX_IDS,
  );
  const titles: Record<string, string | null> = {};
  const clicklabByOrderId: Record<string, boolean> = {};
  let syncedCount = 0;
  let errorCount = 0;
  let kaitenLabMentionDbChanged = false;
  const includeComments = opts?.includeComments === true;
  /** Без очереди 90ms между запросами — иначе фоновый опрос списка растягивается на десятки секунд. 429 обрабатывается в kaitenFetch. */
  const burst = { burst: true } as const;

  const rows = await db.order.findMany({
    where: { id: { in: uniq } },
    select: {
      id: true,
      kaitenCardId: true,
      kaitenColumnTitle: true,
      kaitenCardSortOrder: true,
      kaitenBlocked: true,
      kaitenBlockReason: true,
      kaitenBlockedAt: true,
      kaitenChatHasLabMention: true,
      tenantId: true,
      tenant: { select: { kanbanAdminMentionTag: true } },
    },
  });

  const withCards = rows.filter(
    (r): r is (typeof r & { kaitenCardId: number }) => r.kaitenCardId != null,
  );

  const columnsCache = new Map<number, BoardColumn[]>();

  async function getCachedColumns(boardId: number): Promise<BoardColumn[] | null> {
    if (columnsCache.has(boardId)) {
      return columnsCache.get(boardId)!;
    }
    const cols = await kaitenListBoardColumns(auth, boardId);
    if (!cols.ok) {
      return null;
    }
    columnsCache.set(boardId, cols.columns);
    return cols.columns;
  }

  const chunkSize = includeComments
    ? CARD_FETCH_CONCURRENCY_WITH_COMMENTS
    : CARD_FETCH_CONCURRENCY;

  for (let i = 0; i < withCards.length; i += chunkSize) {
    const chunk = withCards.slice(i, i + chunkSize);
    const cardResponses = await Promise.all(
      chunk.map((row) =>
        includeComments
          ? Promise.all([
              kaitenGetCard(auth, row.kaitenCardId),
              kaitenListComments(auth, row.kaitenCardId),
            ]).then(([cardRes, commRes]) => ({ row, cardRes, commRes }))
          : kaitenGetCard(auth, row.kaitenCardId).then((cardRes) => ({
              row,
              cardRes,
              commRes: null as Awaited<ReturnType<typeof kaitenListComments>> | null,
            })),
      ),
    );

    for (const { row, cardRes, commRes } of cardResponses) {
      let computedLabMention: boolean | undefined;
      if (includeComments && commRes?.ok) {
        try {
          const parsedFull = dedupeParsedKaitenComments(
            commRes.comments
              .map(parseKaitenListComment)
              .filter((x): x is NonNullable<typeof x> => x != null),
          );
          const comments = parsedFull.map((c) => ({ id: c.id, text: c.text }));
          const labTag = normalizeKanbanAdminMentionTag(
            row.tenant?.kanbanAdminMentionTag,
          );
          computedLabMention = comments.some((c) =>
            textIncludesAdminLabMention(c.text, labTag),
          );
          clicklabByOrderId[row.id] = computedLabMention;
          await syncOrderChatCorrectionsFromKaitenComments(db, row.id, comments);
          await syncOrderProstheticsRequestsFromKaitenComments(db, row.id, comments);
          const labChanged = await syncKaitenLabMentionFromParsedComments(
            db,
            row.id,
            comments,
            row.tenant?.kanbanAdminMentionTag,
          );
          if (labChanged) kaitenLabMentionDbChanged = true;
          await syncKaitenCommentsIntoKanbanState({
            tenantId: row.tenantId,
            orderId: row.id,
            comments: parsedFull.map((c) => ({
              id: c.id,
              text: c.text,
              created: c.created,
              authorName: c.authorName,
              parentId: c.parentId,
            })),
          });
        } catch (e) {
          console.error("[kaiten-titles-sync] chat corrections", row.id, e);
        }
      } else if (includeComments && commRes && !commRes.ok) {
        clicklabByOrderId[row.id] = false;
      }
      if (!cardRes.ok || !cardRes.card) {
        errorCount += 1;
        continue;
      }
      const cardObj = cardRes.card as Record<string, unknown>;
      const boardIdRaw = cardObj.board_id;
      const boardId = typeof boardIdRaw === "number" ? boardIdRaw : null;
      if (boardId == null) {
        errorCount += 1;
        continue;
      }
      const colList = await getCachedColumns(boardId);
      if (colList == null) {
        errorCount += 1;
        continue;
      }
      const columnTitle = kaitenColumnTitleFromBoard(cardObj, colList);
      const meta = kaitenBlockedMetaFromCard(cardObj);
      const blocked = meta.blocked;
      const reasonDb = meta.reason ?? null;
      const blockedAtNext =
        meta.blockedAtIso != null ? new Date(meta.blockedAtIso) : null;
      const sortDb =
        "sort_order" in cardObj ? kaitenSortOrderFromCard(cardObj) : undefined;
      const sameTitle = columnTitle === row.kaitenColumnTitle;
      const sameBlockedAt =
        (blockedAtNext === null && row.kaitenBlockedAt == null) ||
        (blockedAtNext != null &&
          row.kaitenBlockedAt != null &&
          blockedAtNext.getTime() === row.kaitenBlockedAt.getTime());
      const sameBlock =
        blocked === row.kaitenBlocked &&
        (reasonDb ?? "") === (row.kaitenBlockReason ?? "") &&
        sameBlockedAt;
      const sameSort =
        sortDb === undefined || sortDb === row.kaitenCardSortOrder;
      if (sameTitle && sameBlock && sameSort) {
        titles[row.id] = columnTitle;
        if (includeComments && clicklabByOrderId[row.id] === undefined) {
          clicklabByOrderId[row.id] = false;
        }
        continue;
      }
      try {
        const blockedAtData =
          !blocked
            ? { kaitenBlockedAt: null as Date | null }
            : blockedAtNext != null
              ? { kaitenBlockedAt: blockedAtNext }
              : {};
        await db.order.update({
          where: { id: row.id },
          data: {
            kaitenColumnTitle: columnTitle,
            kaitenBlocked: blocked,
            kaitenBlockReason: reasonDb,
            ...blockedAtData,
            ...(sortDb !== undefined ? { kaitenCardSortOrder: sortDb } : {}),
          },
        });
      } catch {
        errorCount += 1;
        continue;
      }
      invalidateKaitenSnapshotCache(row.id);
      titles[row.id] = columnTitle;
      syncedCount += 1;
    }
  }

  if (includeComments) {
    for (const r of rows) {
      if (r.kaitenCardId == null) {
        clicklabByOrderId[r.id] = false;
      } else if (clicklabByOrderId[r.id] === undefined) {
        clicklabByOrderId[r.id] = false;
      }
    }
  }

  return {
    titles,
    syncedCount,
    errorCount,
    clicklabByOrderId,
    kaitenLabMentionDbChanged,
  };
}
