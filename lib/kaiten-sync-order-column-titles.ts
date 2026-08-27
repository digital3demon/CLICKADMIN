import type { PrismaClient } from "@prisma/client";
import {
  kaitenBlockedMetaFromCard,
  shouldKeepCrmBlockOverKaiten,
} from "@/lib/kaiten-card-block";
import { kaitenColumnTitleFromBoard } from "@/lib/kaiten-column-title";
import { invalidateKaitenSnapshotCache } from "@/lib/kaiten-snapshot-cache";
import { kaitenMembersFingerprint } from "@/lib/kaiten-members-parse";
import {
  type KaitenAuth,
  kaitenGetCard,
  kaitenListBoardColumns,
  kaitenListCardMembers,
  kaitenListComments,
  kaitenMembersFromCardJson,
  trackLaneForBoardId,
} from "@/lib/kaiten-rest";
import { mapKaitenCardMembersToCrm } from "@/lib/kanban/kaiten-members-inbound";
import { loadKaitenUsersDirectory } from "@/lib/kaiten-user-directory";
import { getKaitenEnvConfig } from "@/lib/kaiten-config";
import { withResolvedKaitenBoards } from "@/lib/kaiten-resolve-boards";
import {
  dedupeParsedKaitenComments,
  parseKaitenListComment,
  textIncludesAdminLabMention,
} from "@/lib/kaiten-comment-parse";
import { normalizeKanbanAdminMentionTag } from "@/lib/kanban-admin-mention";
import { kaitenSortOrderFromCard } from "@/lib/kaiten-card-sort-order";
import { mapParsedKaitenCommentsForTriggerSync } from "@/lib/order-chat-trigger-author";
import { ingestKaitenCommentsForOrder } from "@/lib/kanban/kaiten-comments-ingest-server";
import { kaitenUrgentPatchFromCard, kaitenMirrorFieldsFromCard } from "@/lib/kaiten-inbound-order-fields";
import { ymdFromKaitenDueDate } from "@/lib/kanban/kaiten-head-to-kanban-card";
import { persistKaitenStageDueToKanbanState } from "@/lib/kanban/kaiten-inbound-card-head";
import { isKaitenRateLimitedStatus } from "@/lib/kaiten-rate-limit";
import { kaitenLogger } from "@/lib/server/logger";

const MAX_IDS = 10;
/** Параллельные карточки — очередь в kaitenFetch + малый параллелизм снижает 429. */
const CARD_FETCH_CONCURRENCY = 2;
/** С комментариями на карточку — по одной: карта + список комментариев. */
const CARD_FETCH_CONCURRENCY_WITH_COMMENTS = 1;

type BoardColumn = { id: number; title: string; name?: string };

/**
 * Обновляет в БД `kaitenColumnTitle` и `kaitenTrackLane` по актуальной карточке Kaiten
 * (для списков заказов / отгрузок и зеркала канбана).
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
  /** YYYY-MM-DD или null, только если в ответе Kaiten было поле due_date. */
  stageDueByOrderId: Record<string, string | null>;
  /** CRM user id с карточки Kaiten, если GET /cards отдал members. */
  membersByOrderId: Record<string, { assignees: string[]; participants: string[] }>;
  syncedCount: number;
  errorCount: number;
  /** Есть ли в комментариях упоминание тега лаборатории (Tenant.kanbanAdminMentionTag; подсветка «чат» в списке). */
  clicklabByOrderId: Record<string, boolean>;
  /** Было ли изменение флага упоминания в БД (для router.refresh счётчика «Упоминания»). */
  kaitenLabMentionDbChanged: boolean;
  /** Kaiten вернул 429 — дальнейшие карточки в пакете не опрашиваем. */
  rateLimited: boolean;
}> {
  const uniq = [...new Set(orderIds.map((x) => x.trim()).filter(Boolean))].slice(
    0,
    MAX_IDS,
  );
  const titles: Record<string, string | null> = {};
  const stageDueByOrderId: Record<string, string | null> = {};
  const membersByOrderId: Record<
    string,
    { assignees: string[]; participants: string[] }
  > = {};
  const headByTenant = new Map<
    string,
    Record<
      string,
      {
        stageDue?: string | null;
        urgent?: boolean;
        assignees?: string[];
        participants?: string[];
        fingerprint?: string;
      }
    >
  >();
  const directoryByTenant = new Map<
    string,
    Awaited<ReturnType<typeof loadKaitenUsersDirectory>>
  >();
  const clicklabByOrderId: Record<string, boolean> = {};
  let syncedCount = 0;
  let errorCount = 0;
  let kaitenLabMentionDbChanged = false;
  let rateLimited = false;
  const includeComments = opts?.includeComments === true;
  /** Фон: с паузой в очереди kaitenFetch (~5 req/s). burst не использовать — блокирует сохранение нарядов. */
  const successfullyCheckedOrderIds = new Set<string>();

  const rows = await db.order.findMany({
    where: { id: { in: uniq } },
    select: {
      id: true,
      kaitenCardId: true,
      kaitenColumnTitle: true,
      kaitenTrackLane: true,
      isUrgent: true,
      kaitenCardSortOrder: true,
      kaitenCardDescriptionMirror: true,
      kaitenBlocked: true,
      kaitenBlockReason: true,
      kaitenBlockedAt: true,
      kaitenSyncedAt: true,
      kaitenChatHasLabMention: true,
      tenantId: true,
      tenant: { select: { kanbanAdminMentionTag: true } },
    },
  });

  const withCards = rows.filter(
    (r): r is (typeof r & { kaitenCardId: number }) => r.kaitenCardId != null,
  );

  const cfg0 = getKaitenEnvConfig();
  const cfg = cfg0 ? await withResolvedKaitenBoards(cfg0) : null;

  const columnsCache = new Map<number, BoardColumn[]>();

  async function getCachedColumns(
    boardId: number,
  ): Promise<{ columns: BoardColumn[] | null; rateLimited: boolean }> {
    if (columnsCache.has(boardId)) {
      return { columns: columnsCache.get(boardId)!, rateLimited: false };
    }
    const cols = await kaitenListBoardColumns(auth, boardId);
    if (!cols.ok) {
      return {
        columns: null,
        rateLimited: isKaitenRateLimitedStatus(cols.status),
      };
    }
    columnsCache.set(boardId, cols.columns);
    return { columns: cols.columns, rateLimited: false };
  }

  const chunkSize = includeComments
    ? CARD_FETCH_CONCURRENCY_WITH_COMMENTS
    : CARD_FETCH_CONCURRENCY;

  cardLoop: for (let i = 0; i < withCards.length; i += chunkSize) {
    if (rateLimited) break;
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
      if (rateLimited) break cardLoop;
      if (!cardRes.ok && isKaitenRateLimitedStatus(cardRes.status)) {
        errorCount += 1;
        rateLimited = true;
        break cardLoop;
      }
      if (
        includeComments &&
        commRes &&
        !commRes.ok &&
        isKaitenRateLimitedStatus(commRes.status)
      ) {
        errorCount += 1;
        rateLimited = true;
        break cardLoop;
      }
      let computedLabMention: boolean | undefined;
      if (includeComments && commRes?.ok) {
        try {
          const parsedFull = dedupeParsedKaitenComments(
            commRes.comments
              .map(parseKaitenListComment)
              .filter((x): x is NonNullable<typeof x> => x != null),
          );
          const comments = mapParsedKaitenCommentsForTriggerSync(parsedFull);
          const labTag = normalizeKanbanAdminMentionTag(
            row.tenant?.kanbanAdminMentionTag,
          );
          computedLabMention = comments.some((c) =>
            textIncludesAdminLabMention(c.text, labTag),
          );
          clicklabByOrderId[row.id] = computedLabMention;
          const ingested = await ingestKaitenCommentsForOrder({
            prisma: db,
            tenantId: row.tenantId,
            orderId: row.id,
            parsed: parsedFull,
            kanbanAdminMentionTag: row.tenant?.kanbanAdminMentionTag,
          });
          if (ingested.labMentionDbChanged) kaitenLabMentionDbChanged = true;
          await db.order.update({
            where: { id: row.id },
            data: { kaitenChatSyncedAt: new Date() },
          });
        } catch (e) {
          kaitenLogger.error(
            { err: e, orderId: row.id, msg: "kaiten_titles_sync_chat" },
            "kaiten titles sync chat corrections failed",
          );
        }
      } else if (includeComments && commRes && !commRes.ok) {
        clicklabByOrderId[row.id] = false;
      }
      if (!cardRes.ok || !cardRes.card) {
        errorCount += 1;
        continue;
      }
      const cardObj = cardRes.card as Record<string, unknown>;
      if ("due_date" in cardObj) {
        stageDueByOrderId[row.id] = ymdFromKaitenDueDate(cardObj.due_date);
      }
      const tenantHead = headByTenant.get(row.tenantId) ?? {};
      const dueYmd =
        "due_date" in cardObj ? ymdFromKaitenDueDate(cardObj.due_date) : undefined;
      const dueExplicitEmpty =
        "due_date" in cardObj &&
        (cardObj.due_date == null ||
          cardObj.due_date === false ||
          String(cardObj.due_date).trim() === "");
      tenantHead[row.id] = {
        ...(dueYmd != null || dueExplicitEmpty ? { stageDue: dueYmd ?? null } : {}),
        ...("asap" in cardObj ? { urgent: cardObj.asap === true } : {}),
      };
      let rawMembers = kaitenMembersFromCardJson(cardObj);
      if (rawMembers == null || rawMembers.length === 0) {
        const list = await kaitenListCardMembers(auth, row.kaitenCardId);
        if (isKaitenRateLimitedStatus(list.status)) {
          errorCount += 1;
          rawMembers = rawMembers && rawMembers.length > 0 ? rawMembers : [];
        }
        if (list.ok && list.members.length > 0) {
          rawMembers = list.members;
        }
      }
      if (rawMembers && rawMembers.length > 0) {
        try {
          let directory = directoryByTenant.get(row.tenantId);
          if (!directory) {
            directory = await loadKaitenUsersDirectory(db, row.tenantId, auth);
            directoryByTenant.set(row.tenantId, directory);
          }
          const mapped = await mapKaitenCardMembersToCrm(
            db,
            row.tenantId,
            auth,
            rawMembers,
            directory,
          );
          if (mapped.assignees.length > 0 || mapped.participants.length > 0) {
            tenantHead[row.id] = {
              ...tenantHead[row.id],
              assignees: mapped.assignees,
              participants: mapped.participants,
              fingerprint: kaitenMembersFingerprint(rawMembers),
            };
            membersByOrderId[row.id] = {
              assignees: mapped.assignees,
              participants: mapped.participants,
            };
          }
        } catch (e) {
          kaitenLogger.warn(
            { err: e, orderId: row.id, msg: "kaiten_titles_sync_map_members" },
            "kaiten titles sync map members failed",
          );
        }
      }
      headByTenant.set(row.tenantId, tenantHead);
      const boardIdRaw = cardObj.board_id;
      const boardId = typeof boardIdRaw === "number" ? boardIdRaw : null;
      if (boardId == null) {
        errorCount += 1;
        continue;
      }
      const colFetch = await getCachedColumns(boardId);
      if (colFetch.rateLimited) {
        errorCount += 1;
        rateLimited = true;
        break cardLoop;
      }
      const colList = colFetch.columns;
      if (colList == null) {
        errorCount += 1;
        continue;
      }
      successfullyCheckedOrderIds.add(row.id);
      const columnTitle = kaitenColumnTitleFromBoard(cardObj, colList);
      const meta = kaitenBlockedMetaFromCard(cardObj);
      const blocked = meta.blocked;
      const reasonDb = meta.reason ?? null;
      const blockedAtNext =
        meta.blockedAtIso != null ? new Date(meta.blockedAtIso) : null;
      const sortDb =
        "sort_order" in cardObj ? kaitenSortOrderFromCard(cardObj) : undefined;
      const mirrorFields = kaitenMirrorFieldsFromCard(cardObj);
      const descMirror =
        mirrorFields.kaitenCardDescriptionMirror?.trim() ?? null;
      const sameTitle = columnTitle === row.kaitenColumnTitle;
      const sameDescription = (descMirror ?? "") === (row.kaitenCardDescriptionMirror ?? "");
      const sameBlockedAt =
        (blockedAtNext === null && row.kaitenBlockedAt == null) ||
        (blockedAtNext != null &&
          row.kaitenBlockedAt != null &&
          blockedAtNext.getTime() === row.kaitenBlockedAt.getTime());
      const keepCrmBlock = shouldKeepCrmBlockOverKaiten({
        crmBlocked: row.kaitenBlocked,
        crmReason: row.kaitenBlockReason,
        crmSyncedAt: row.kaitenSyncedAt,
        kaitenBlocked: blocked,
        kaitenReason: reasonDb,
      });
      const sameBlock =
        keepCrmBlock ||
        (blocked === row.kaitenBlocked &&
          (reasonDb ?? "") === (row.kaitenBlockReason ?? "") &&
          sameBlockedAt);
      const sameSort =
        sortDb === undefined || sortDb === row.kaitenCardSortOrder;
      const urgentPatch = kaitenUrgentPatchFromCard(cardObj, row.isUrgent);
      const sameUrgent = urgentPatch.isUrgent === undefined;
      const nextLane =
        cfg != null
          ? trackLaneForBoardId(boardId, cfg.boardByLane, row.kaitenTrackLane)
          : null;
      const sameLane = nextLane == null || nextLane === row.kaitenTrackLane;
      if (
        sameTitle &&
        sameDescription &&
        sameBlock &&
        sameSort &&
        sameUrgent &&
        sameLane
      ) {
        titles[row.id] = columnTitle;
        if (includeComments && clicklabByOrderId[row.id] === undefined) {
          clicklabByOrderId[row.id] = false;
        }
        continue;
      }
      try {
        const blockedAtData =
          keepCrmBlock
            ? {}
            : !blocked
              ? { kaitenBlockedAt: null as Date | null }
              : blockedAtNext != null
                ? { kaitenBlockedAt: blockedAtNext }
                : {};
        await db.order.update({
          where: { id: row.id },
          data: {
            kaitenSyncedAt: new Date(),
            kaitenSyncError: null,
            kaitenColumnTitle: columnTitle,
            ...(descMirror != null ? { kaitenCardDescriptionMirror: descMirror } : {}),
            ...(keepCrmBlock
              ? {}
              : {
                  kaitenBlocked: blocked,
                  kaitenBlockReason: reasonDb,
                }),
            ...blockedAtData,
            ...(sortDb !== undefined ? { kaitenCardSortOrder: sortDb } : {}),
            ...urgentPatch,
            ...(nextLane != null && nextLane !== row.kaitenTrackLane
              ? { kaitenTrackLane: nextLane }
              : {}),
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

  if (successfullyCheckedOrderIds.size > 0) {
    await db.order.updateMany({
      where: { id: { in: [...successfullyCheckedOrderIds] } },
      data: { kaitenSyncedAt: new Date(), kaitenSyncError: null },
    });
  }

  for (const [tenantId, patches] of headByTenant) {
    const nonempty = Object.fromEntries(
      Object.entries(patches).filter(
        ([, p]) =>
          p.stageDue !== undefined ||
          typeof p.urgent === "boolean" ||
          (p.assignees?.length ?? 0) > 0 ||
          (p.participants?.length ?? 0) > 0,
      ),
    );
    if (Object.keys(nonempty).length === 0) continue;
    try {
      await persistKaitenStageDueToKanbanState(tenantId, nonempty);
    } catch (e) {
      kaitenLogger.warn(
        { err: e, tenantId, msg: "kaiten_titles_sync_persist_due" },
        "kaiten titles sync persist stage due failed",
      );
    }
  }

  return {
    titles,
    stageDueByOrderId,
    membersByOrderId,
    syncedCount,
    errorCount,
    clicklabByOrderId,
    kaitenLabMentionDbChanged,
    rateLimited,
  };
}
