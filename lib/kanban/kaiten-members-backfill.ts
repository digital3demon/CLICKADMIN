import "server-only";

import type { KaitenTrackLane, PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";
import { kaitenMembersFingerprint } from "@/lib/kaiten-members-parse";
import { gateKaitenSyncForTenant } from "@/lib/kaiten-integration/sync";
import {
  applyInboundMembersToKanbanCard,
  mapKaitenCardMembersToCrm,
} from "@/lib/kanban/kaiten-members-inbound";
import {
  slimKaitenHeadForPatch,
  type KaitenRefreshCardPatch,
} from "@/lib/kanban/apply-kaiten-refresh-patches";
import {
  collectKanbanKaitenRefreshTargets,
  nextLinkedOrderIdPage,
  positiveKaitenCardId,
  type KanbanKaitenRefreshTarget,
} from "@/lib/kanban/kanban-linked-order-ids";
import {
  findKanbanCardsForKaitenRefresh,
  KANBAN_CHAT_STATE_KEY,
  parseKanbanAppState,
} from "@/lib/kanban/chat-sync";
import {
  kaitenGetCard,
  kaitenListBoardColumns,
  kaitenListCardMembers,
  kaitenMembersFromCardJson,
  trackLaneForBoardId,
  type KaitenAuth,
  type KaitenCardMemberRow,
} from "@/lib/kaiten-rest";
import { getKaitenEnvConfig } from "@/lib/kaiten-config";
import { withResolvedKaitenBoards } from "@/lib/kaiten-resolve-boards";
import { isKaitenRateLimitedStatus } from "@/lib/kaiten-rate-limit";
import {
  applyKaitenHeadFieldsToKanbanCard,
  unwrapKaitenCardPayload,
} from "@/lib/kanban/kaiten-head-to-kanban-card";
import { loadKaitenUsersDirectory } from "@/lib/kaiten-user-directory";
import {
  applyKaitenPositionToKanbanState,
  sortOrderFromKaitenCard,
} from "@/lib/kanban/kaiten-position-to-kanban";
import { kaitenColumnTitleFromBoard } from "@/lib/kaiten-column-title";
import type { KanbanAppState } from "@/lib/kanban/types";

/** Полный проход: одна запись снимка в конце, без промежуточных дёрганий доски. */
export const KANBAN_MEMBERS_BACKFILL_BATCH_SIZE = 8;

function sleepMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export type KanbanMembersBackfillCountResult = {
  total: number;
};

export type KanbanMembersBackfillBatchResult = {
  total: number;
  processed: number;
  changed: number;
  skipped: number;
  noCard: number;
  /** Карточки, где в Kaiten есть люди, но email не сопоставился с CRM. */
  unmapped: number;
  rateLimited: boolean;
  finished: boolean;
  afterOrderId: string | null;
  /** Для живой доски: снимок tenant мог не содержать те же cardId. */
  patches: KaitenRefreshCardPatch[];
};

async function loadTenantKanbanState(
  tenantId: string,
): Promise<KanbanAppState | null> {
  const corePrisma = await getPrisma();
  const row = await corePrisma.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key: KANBAN_CHAT_STATE_KEY } },
    select: { value: true },
  });
  return parseKanbanAppState(row?.value ?? null);
}

export async function countKanbanMembersBackfillOrders(
  tenantId: string,
): Promise<number> {
  const tid = tenantId.trim();
  if (!tid) return 0;
  const state = await loadTenantKanbanState(tid);
  return collectKanbanKaitenRefreshTargets(state).length;
}

function parseRefreshTargets(raw: unknown): KanbanKaitenRefreshTarget[] {
  if (!Array.isArray(raw)) return [];
  const out: KanbanKaitenRefreshTarget[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (row == null || typeof row !== "object") continue;
    const r = row as {
      cardId?: unknown;
      kaitenCardId?: unknown;
      linkedOrderId?: unknown;
    };
    const cardId = String(r.cardId ?? "").trim();
    if (!cardId || seen.has(cardId)) continue;
    seen.add(cardId);
    out.push({
      cardId,
      kaitenCardId: positiveKaitenCardId(r.kaitenCardId),
      linkedOrderId: String(r.linkedOrderId ?? "").trim() || null,
    });
  }
  return out;
}

export async function runKanbanMembersBackfillBatch(
  db: PrismaClient,
  auth: KaitenAuth,
  input: {
    tenantId: string;
    afterOrderId?: string | null;
    limit?: number;
    targets?: unknown;
    clientTotal?: number;
    /** Все карточки в одном запросе, снимок пишем один раз. */
    all?: boolean;
  },
): Promise<KanbanMembersBackfillBatchResult> {
  const tenantId = input.tenantId.trim();
  const allAtOnce = input.all === true;
  const limit = allAtOnce
    ? 10_000
    : Math.max(
        1,
        Math.min(input.limit ?? KANBAN_MEMBERS_BACKFILL_BATCH_SIZE, 40),
      );
  const empty: KanbanMembersBackfillBatchResult = {
    total: 0,
    processed: 0,
    changed: 0,
    skipped: 0,
    noCard: 0,
    unmapped: 0,
    rateLimited: false,
    finished: true,
    afterOrderId: null,
    patches: [],
  };

  if (!tenantId) return empty;

  const integrationGate = await gateKaitenSyncForTenant(db, tenantId);
  if (integrationGate.skip) {
    return empty;
  }

  const corePrisma = await getPrisma();
  const state = await loadTenantKanbanState(tenantId);
  if (!state) {
    return { ...empty, total: 0, finished: true };
  }

  const fromClient = parseRefreshTargets(input.targets);
  const allFromState = collectKanbanKaitenRefreshTargets(state);
  const work =
    fromClient.length > 0
      ? fromClient
      : allAtOnce
        ? allFromState
        : (() => {
            const after = input.afterOrderId?.trim() || null;
            const { page } = nextLinkedOrderIdPage(
              allFromState.map((t) => t.cardId),
              after,
              limit,
            );
            const byId = new Map(allFromState.map((t) => [t.cardId, t]));
            return page.map((id) => byId.get(id)!).filter(Boolean);
          })();

  const clientTotal =
    typeof input.clientTotal === "number" &&
    Number.isFinite(input.clientTotal) &&
    input.clientTotal > 0
      ? Math.floor(input.clientTotal)
      : 0;
  const total = Math.max(clientTotal, allFromState.length, fromClient.length);

  if (work.length === 0) {
    return { ...empty, total, finished: true };
  }

  const orderIds = [
    ...new Set(work.map((t) => t.linkedOrderId).filter((x): x is string => Boolean(x))),
  ];
  const orders = orderIds.length
    ? await db.order.findMany({
        where: { tenantId, id: { in: orderIds } },
        select: { id: true, kaitenCardId: true, kaitenTrackLane: true },
      })
    : [];
  const orderById = new Map(orders.map((row) => [row.id, row]));

  let changed = 0;
  let snapshotDirty = false;
  let skipped = 0;
  let noCard = 0;
  let unmapped = 0;
  let rateLimited = false;
  let lastOrderId: string | null = input.afterOrderId?.trim() || null;
  let processed = 0;
  const columnsByBoardId = new Map<
    number,
    Array<{ id: number; title: string; name?: string }>
  >();
  const cfg0 = getKaitenEnvConfig();
  const cfg = cfg0 ? await withResolvedKaitenBoards(cfg0) : null;
  const directory = await loadKaitenUsersDirectory(db, tenantId, auth);
  const burst = { burst: true as const };
  const pendingLaneByOrderId = new Map<string, KaitenTrackLane>();
  const patches: KaitenRefreshCardPatch[] = [];
  type FetchedKaiten = {
    headCard: Record<string, unknown> | null;
    patchHead: Record<string, unknown> | null;
    assignees: string[];
    participants: string[];
    fingerprint: string;
    unmappedLabels: string[];
  };
  const fetchedByKaitenId = new Map<number, FetchedKaiten>();

  for (const target of work) {
    lastOrderId = target.cardId;
    const order = target.linkedOrderId
      ? orderById.get(target.linkedOrderId)
      : undefined;
    const kaitenId =
      positiveKaitenCardId(target.kaitenCardId) ??
      positiveKaitenCardId(order?.kaitenCardId);

    const hits = findKanbanCardsForKaitenRefresh(state, {
      cardId: target.cardId,
      linkedOrderId: target.linkedOrderId,
      kaitenCardId: kaitenId,
    });
    if (kaitenId == null) {
      if (hits.length === 0) noCard += 1;
      skipped += 1;
      processed += 1;
      continue;
    }

    let fetched = fetchedByKaitenId.get(kaitenId);
    if (!fetched) {
      let head = await kaitenGetCard(auth, kaitenId, burst);
      let rateRetries = 0;
      while (
        !head.ok &&
        isKaitenRateLimitedStatus(head.status) &&
        allAtOnce &&
        rateRetries < 10
      ) {
        rateRetries += 1;
        await sleepMs(2500);
        head = await kaitenGetCard(auth, kaitenId, burst);
      }
      if (!head.ok) {
        if (isKaitenRateLimitedStatus(head.status)) {
          rateLimited = true;
          break;
        }
        skipped += 1;
        processed += 1;
        continue;
      }

      let members: KaitenCardMemberRow[] | null = kaitenMembersFromCardJson(
        head.card,
      );
      if (members == null) {
        let list = await kaitenListCardMembers(auth, kaitenId, burst);
        while (
          !list.ok &&
          isKaitenRateLimitedStatus(list.status) &&
          allAtOnce &&
          rateRetries < 10
        ) {
          rateRetries += 1;
          await sleepMs(2500);
          list = await kaitenListCardMembers(auth, kaitenId, burst);
        }
        if (!list.ok) {
          if (isKaitenRateLimitedStatus(list.status)) {
            rateLimited = true;
            break;
          }
          members = [];
        } else {
          members = list.members;
        }
      }

      const fingerprint = kaitenMembersFingerprint(members);
      const mapped = await mapKaitenCardMembersToCrm(
        db,
        tenantId,
        auth,
        members,
        directory,
      );
      const fullHead =
        head.card && typeof head.card === "object"
          ? unwrapKaitenCardPayload(head.card as Record<string, unknown>)
          : null;
      const patchHead = slimKaitenHeadForPatch(fullHead);
      fetched = {
        headCard: fullHead,
        patchHead,
        assignees: mapped.assignees,
        participants: mapped.participants,
        fingerprint,
        unmappedLabels: mapped.unmappedLabels,
      };
      fetchedByKaitenId.set(kaitenId, fetched);
      if (mapped.unmappedLabels.length > 0) {
        unmapped += 1;
      }
    }

    patches.push({
      cardId: target.cardId,
      linkedOrderId: target.linkedOrderId,
      kaitenCardId: kaitenId,
      assignees: fetched.assignees,
      participants: fetched.participants,
      fingerprint: fetched.fingerprint,
      unmappedLabels: fetched.unmappedLabels,
      kaitenHead: fetched.patchHead,
    });

    let membersChanged = false;
    let headChanged = false;
    for (const hit of hits) {
      const card = hit.card;
      if (card.kaitenCardId == null) {
        card.kaitenCardId = kaitenId;
      }
      if (
        applyInboundMembersToKanbanCard(card, {
          assignees: fetched.assignees,
          participants: fetched.participants,
          fingerprint: fetched.fingerprint,
          unmappedLabels: fetched.unmappedLabels,
          forceApply: true,
        })
      ) {
        membersChanged = true;
      }
      const headForDue = fetched.patchHead ?? fetched.headCard;
      if (headForDue && applyKaitenHeadFieldsToKanbanCard(card, headForDue)) {
        headChanged = true;
      }
    }

    let positionChanged = false;
    if (fetched.headCard && hits.some((h) => h.colLoc)) {
      const boardIdRaw = fetched.headCard.board_id;
      const boardId = typeof boardIdRaw === "number" ? boardIdRaw : null;
      if (boardId != null) {
        let cols = columnsByBoardId.get(boardId);
        if (!cols) {
          let colRes = await kaitenListBoardColumns(auth, boardId, burst);
          let rateRetries = 0;
          while (
            !colRes.ok &&
            isKaitenRateLimitedStatus(colRes.status) &&
            allAtOnce &&
            rateRetries < 10
          ) {
            rateRetries += 1;
            await sleepMs(2500);
            colRes = await kaitenListBoardColumns(auth, boardId, burst);
          }
          if (!colRes.ok) {
            if (isKaitenRateLimitedStatus(colRes.status)) {
              rateLimited = true;
              break;
            }
          } else {
            cols = colRes.columns;
            columnsByBoardId.set(boardId, cols);
          }
        }
        if (cols) {
          const columnTitle = kaitenColumnTitleFromBoard(fetched.headCard, cols);
          const sortOrder = sortOrderFromKaitenCard(fetched.headCard);
          const inboundLane =
            cfg != null
              ? trackLaneForBoardId(
                  boardId,
                  cfg.boardByLane,
                  order?.kaitenTrackLane,
                )
              : null;
          const colHit = hits.find((h) => h.colLoc);
          if (colHit) {
            positionChanged = applyKaitenPositionToKanbanState(
              state,
              String(colHit.card.linkedOrderId || target.linkedOrderId || ""),
              {
                columnTitle,
                sortOrder,
                trackLane: inboundLane,
                cardId: colHit.card.id,
              },
            );
          }
          if (
            order &&
            inboundLane != null &&
            inboundLane !== order.kaitenTrackLane
          ) {
            pendingLaneByOrderId.set(order.id, inboundLane);
            positionChanged = true;
          }
        }
      }
    }

    const inboundUseful =
      fetched.assignees.length > 0 ||
      fetched.participants.length > 0 ||
      (fetched.headCard != null &&
        (fetched.headCard.asap === true ||
          (fetched.headCard.due_date != null &&
            fetched.headCard.due_date !== false &&
            String(fetched.headCard.due_date).trim() !== "")));
    if (membersChanged || headChanged || positionChanged) {
      snapshotDirty = true;
    }
    if (membersChanged || headChanged || positionChanged || inboundUseful) {
      changed += 1;
    } else {
      skipped += 1;
    }
    processed += 1;
  }

  const finished =
    allAtOnce
      ? !rateLimited && processed === work.length
      : !rateLimited &&
        fromClient.length === 0 &&
        work.length > 0 &&
        lastOrderId != null &&
        nextLinkedOrderIdPage(
          allFromState.map((t) => t.cardId),
          lastOrderId,
          1,
        ).page.length === 0;

  if (finished || allAtOnce) {
    for (const [orderId, lane] of pendingLaneByOrderId) {
      try {
        await db.order.update({
          where: { id: orderId },
          data: { kaitenTrackLane: lane },
        });
      } catch {
        /* снимок канбана уже обновлён */
      }
    }
    if (snapshotDirty) {
      try {
        await corePrisma.tenantClientState.upsert({
          where: { tenantId_key: { tenantId, key: KANBAN_CHAT_STATE_KEY } },
          create: { tenantId, key: KANBAN_CHAT_STATE_KEY, value: state as never },
          update: { value: state as never },
        });
      } catch {
        /* клиент всё равно применит patches */
      }
    }
  }

  return {
    total,
    processed,
    changed,
    skipped,
    noCard,
    unmapped,
    rateLimited,
    finished,
    afterOrderId: lastOrderId,
    patches,
  };
}
