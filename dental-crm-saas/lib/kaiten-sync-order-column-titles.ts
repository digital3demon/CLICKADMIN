import type { PrismaClient } from "@prisma/client";
import { kaitenBlockStateFromCard } from "@/lib/kaiten-card-block";
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
} from "@/lib/kaiten-comment-parse";
import { kaitenSortOrderFromCard } from "@/lib/kaiten-card-sort-order";
import { syncOrderChatCorrectionsFromKaitenComments } from "@/lib/order-chat-correction-db";
import { syncOrderProstheticsRequestsFromKaitenComments } from "@/lib/order-prosthetics-request-db";

const MAX_IDS = 15;
/** Параллельные GET /cards — без перегруза API Kaiten. */
const CARD_FETCH_CONCURRENCY = 5;

type BoardColumn = { id: number; title: string; name?: string };

/**
 * Обновляет в БД `kaitenColumnTitle` по актуальной карточке Kaiten (для списков заказов / отгрузок).
 * Карточки запрашиваются пачками; колонки доски кэшируются по `board_id`.
 */
export async function syncKaitenColumnTitlesForOrderIds(
  db: PrismaClient,
  auth: KaitenAuth,
  orderIds: string[],
): Promise<{
  titles: Record<string, string | null>;
  syncedCount: number;
  errorCount: number;
}> {
  const uniq = [...new Set(orderIds.map((x) => x.trim()).filter(Boolean))].slice(
    0,
    MAX_IDS,
  );
  const titles: Record<string, string | null> = {};
  let syncedCount = 0;
  let errorCount = 0;
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
    const cols = await kaitenListBoardColumns(auth, boardId, burst);
    if (!cols.ok) {
      return null;
    }
    columnsCache.set(boardId, cols.columns);
    return cols.columns;
  }

  for (let i = 0; i < withCards.length; i += CARD_FETCH_CONCURRENCY) {
    const chunk = withCards.slice(i, i + CARD_FETCH_CONCURRENCY);
    const cardResponses = await Promise.all(
      chunk.map((row) =>
        Promise.all([
          kaitenGetCard(auth, row.kaitenCardId, burst),
          kaitenListComments(auth, row.kaitenCardId, burst),
        ]).then(([cardRes, commRes]) => ({ row, cardRes, commRes })),
      ),
    );

    for (const { row, cardRes, commRes } of cardResponses) {
      if (commRes.ok) {
        try {
          const comments = dedupeParsedKaitenComments(
            commRes.comments
              .map(parseKaitenListComment)
              .filter((x): x is NonNullable<typeof x> => x != null),
          ).map((c) => ({ id: c.id, text: c.text }));
          await syncOrderChatCorrectionsFromKaitenComments(db, row.id, comments);
          await syncOrderProstheticsRequestsFromKaitenComments(db, row.id, comments);
        } catch (e) {
          console.error("[kaiten-titles-sync] chat corrections", row.id, e);
        }
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
      const { blocked, reason } = kaitenBlockStateFromCard(cardObj);
      const reasonDb = reason ?? null;
      const sortDb =
        "sort_order" in cardObj ? kaitenSortOrderFromCard(cardObj) : undefined;
      const sameTitle = columnTitle === row.kaitenColumnTitle;
      const sameBlock =
        blocked === row.kaitenBlocked &&
        (reasonDb ?? "") === (row.kaitenBlockReason ?? "");
      const sameSort =
        sortDb === undefined || sortDb === row.kaitenCardSortOrder;
      if (sameTitle && sameBlock && sameSort) {
        titles[row.id] = columnTitle;
        continue;
      }
      try {
        await db.order.update({
          where: { id: row.id },
          data: {
            kaitenColumnTitle: columnTitle,
            kaitenBlocked: blocked,
            kaitenBlockReason: reasonDb,
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

  return { titles, syncedCount, errorCount };
}
