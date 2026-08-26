import "server-only";

import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";
import { kaitenMembersFingerprint } from "@/lib/kaiten-members-parse";
import { gateKaitenSyncForTenant } from "@/lib/kaiten-integration/sync";
import {
  applyInboundMembersToKanbanCard,
  mapKaitenCardMembersToCrm,
} from "@/lib/kanban/kaiten-members-inbound";
import {
  linkedOrderIdsOnKanbanBoard,
  nextLinkedOrderIdPage,
} from "@/lib/kanban/kanban-linked-order-ids";
import {
  findCardByLinkedOrderId,
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
import { applyKaitenHeadFieldsToKanbanCard } from "@/lib/kanban/kaiten-head-to-kanban-card";
import { loadKaitenUsersDirectory } from "@/lib/kaiten-user-directory";
import {
  applyKaitenPositionToKanbanState,
  sortOrderFromKaitenCard,
} from "@/lib/kanban/kaiten-position-to-kanban";
import { kaitenColumnTitleFromBoard } from "@/lib/kaiten-column-title";
import type { KanbanAppState } from "@/lib/kanban/types";

/** Малый пакет: длинный запрос режет прокси (~5 мин) пустым телом. */
export const KANBAN_MEMBERS_BACKFILL_BATCH_SIZE = 8;

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
  return linkedOrderIdsOnKanbanBoard(state).length;
}

export async function runKanbanMembersBackfillBatch(
  db: PrismaClient,
  auth: KaitenAuth,
  input: {
    tenantId: string;
    afterOrderId?: string | null;
    limit?: number;
  },
): Promise<KanbanMembersBackfillBatchResult> {
  const tenantId = input.tenantId.trim();
  const limit = Math.max(
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
  };

  if (!tenantId) return empty;

  const integrationGate = await gateKaitenSyncForTenant(db, tenantId);
  if (integrationGate.skip) {
    return empty;
  }

  const corePrisma = await getPrisma();
  const state = await loadTenantKanbanState(tenantId);
  const boardOrderIds = linkedOrderIdsOnKanbanBoard(state);
  if (!state || boardOrderIds.length === 0) {
    return { ...empty, total: 0, finished: true };
  }

  const total = boardOrderIds.length;
  const afterOrderId = input.afterOrderId?.trim() || null;
  const { page: pageIds, finished: pageFinished } = nextLinkedOrderIdPage(
    boardOrderIds,
    afterOrderId,
    limit,
  );
  if (pageIds.length === 0) {
    return { ...empty, total, finished: true };
  }

  const orders = await db.order.findMany({
    where: { tenantId, id: { in: pageIds } },
    select: { id: true, kaitenCardId: true, kaitenTrackLane: true },
  });
  const orderById = new Map(orders.map((row) => [row.id, row]));

  let changed = 0;
  let skipped = 0;
  let noCard = 0;
  let unmapped = 0;
  let rateLimited = false;
  let lastOrderId: string | null = afterOrderId;
  let processed = 0;
  const columnsByBoardId = new Map<
    number,
    Array<{ id: number; title: string; name?: string }>
  >();
  const cfg0 = getKaitenEnvConfig();
  const cfg = cfg0 ? await withResolvedKaitenBoards(cfg0) : null;
  const directory = await loadKaitenUsersDirectory(db, tenantId, auth);
  const burst = { burst: true as const };

  for (const pageId of pageIds) {
    lastOrderId = pageId;
    const order = orderById.get(pageId);
    if (
      !order ||
      order.kaitenCardId == null ||
      !Number.isFinite(order.kaitenCardId)
    ) {
      skipped += 1;
      processed += 1;
      continue;
    }

    const loc = findCardByLinkedOrderId(state, order.id);
    if (!loc) {
      noCard += 1;
      skipped += 1;
      processed += 1;
      continue;
    }

    const head = await kaitenGetCard(auth, order.kaitenCardId, burst);
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
      const list = await kaitenListCardMembers(auth, order.kaitenCardId, burst);
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
    if (mapped.unmappedLabels.length > 0) {
      unmapped += 1;
    }
    const card =
      state.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[loc.cardIndex]!;
    const membersChanged = applyInboundMembersToKanbanCard(card, {
      assignees: mapped.assignees,
      participants: mapped.participants,
      fingerprint,
      unmappedLabels: mapped.unmappedLabels,
      forceApply: true,
    });
    const headChanged = head.card
      ? applyKaitenHeadFieldsToKanbanCard(card, head.card)
      : false;

    let positionChanged = false;
    if (head.card) {
      const boardIdRaw = head.card.board_id;
      const boardId = typeof boardIdRaw === "number" ? boardIdRaw : null;
      if (boardId != null) {
        let cols = columnsByBoardId.get(boardId);
        if (!cols) {
          const colRes = await kaitenListBoardColumns(auth, boardId, burst);
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
          const columnTitle = kaitenColumnTitleFromBoard(head.card, cols);
          const sortOrder = sortOrderFromKaitenCard(head.card);
          const inboundLane =
            cfg != null
              ? trackLaneForBoardId(
                  boardId,
                  cfg.boardByLane,
                  order.kaitenTrackLane,
                )
              : null;
          positionChanged = applyKaitenPositionToKanbanState(state, order.id, {
            columnTitle,
            sortOrder,
            trackLane: inboundLane,
          });
          if (inboundLane != null && inboundLane !== order.kaitenTrackLane) {
            try {
              await db.order.update({
                where: { id: order.id },
                data: { kaitenTrackLane: inboundLane },
              });
              positionChanged = true;
            } catch {
              /* колонка в снимке уже обновлена */
            }
          }
        }
      }
    }

    if (membersChanged || headChanged || positionChanged) changed += 1;
    else skipped += 1;
    processed += 1;
  }

  if (changed > 0) {
    await corePrisma.tenantClientState.upsert({
      where: { tenantId_key: { tenantId, key: KANBAN_CHAT_STATE_KEY } },
      create: { tenantId, key: KANBAN_CHAT_STATE_KEY, value: state as never },
      update: { value: state as never },
    });
  }

  const finished = !rateLimited && pageFinished;

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
  };
}
