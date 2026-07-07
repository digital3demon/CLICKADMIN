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
  findCardByLinkedOrderId,
  KANBAN_CHAT_STATE_KEY,
  parseKanbanAppState,
} from "@/lib/kanban/chat-sync";
import {
  kaitenListCardMembers,
  type KaitenAuth,
} from "@/lib/kaiten-rest";
import { isKaitenRateLimitedStatus } from "@/lib/kaiten-rate-limit";

export const KANBAN_MEMBERS_BACKFILL_BATCH_SIZE = 6;

export type KanbanMembersBackfillCountResult = {
  total: number;
};

export type KanbanMembersBackfillBatchResult = {
  total: number;
  processed: number;
  changed: number;
  skipped: number;
  noCard: number;
  rateLimited: boolean;
  finished: boolean;
  afterOrderId: string | null;
};

function membersBackfillOrderWhere(tenantId: string) {
  return {
    tenantId,
    kaitenCardId: { not: null },
  } as const;
}

export async function countKanbanMembersBackfillOrders(
  db: PrismaClient,
  tenantId: string,
): Promise<number> {
  return db.order.count({
    where: membersBackfillOrderWhere(tenantId),
  });
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
  const limit = Math.max(1, Math.min(input.limit ?? KANBAN_MEMBERS_BACKFILL_BATCH_SIZE, 20));
  const empty: KanbanMembersBackfillBatchResult = {
    total: 0,
    processed: 0,
    changed: 0,
    skipped: 0,
    noCard: 0,
    rateLimited: false,
    finished: true,
    afterOrderId: null,
  };

  if (!tenantId) return empty;

  const integrationGate = await gateKaitenSyncForTenant(db, tenantId);
  if (integrationGate.skip) {
    return empty;
  }

  const total = await countKanbanMembersBackfillOrders(db, tenantId);
  if (total === 0) {
    return { ...empty, total: 0, finished: true };
  }

  const afterOrderId = input.afterOrderId?.trim() || null;
  const orders = await db.order.findMany({
    where: membersBackfillOrderWhere(tenantId),
    orderBy: { id: "asc" },
    select: { id: true, kaitenCardId: true },
    ...(afterOrderId ? { cursor: { id: afterOrderId }, skip: 1 } : {}),
    take: limit,
  });

  if (orders.length === 0) {
    return { ...empty, total, finished: true };
  }

  const corePrisma = await getPrisma();
  const row = await corePrisma.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key: KANBAN_CHAT_STATE_KEY } },
    select: { value: true },
  });
  const state = parseKanbanAppState(row?.value ?? null);
  if (!state) {
    return {
      total,
      processed: 0,
      changed: 0,
      skipped: orders.length,
      noCard: orders.length,
      rateLimited: false,
      finished: orders.length < limit,
      afterOrderId,
    };
  }

  let changed = 0;
  let skipped = 0;
  let noCard = 0;
  let rateLimited = false;
  let lastOrderId: string | null = afterOrderId;
  let processed = 0;

  for (const order of orders) {
    if (order.kaitenCardId == null || !Number.isFinite(order.kaitenCardId)) {
      skipped += 1;
      processed += 1;
      lastOrderId = order.id;
      continue;
    }

    const list = await kaitenListCardMembers(auth, order.kaitenCardId, {
      burst: false,
    });
    if (!list.ok) {
      if (isKaitenRateLimitedStatus(list.status)) {
        rateLimited = true;
        break;
      }
      skipped += 1;
      processed += 1;
      lastOrderId = order.id;
      continue;
    }

    const loc = findCardByLinkedOrderId(state, order.id);
    if (!loc) {
      noCard += 1;
      skipped += 1;
      processed += 1;
      lastOrderId = order.id;
      continue;
    }

    const fingerprint = kaitenMembersFingerprint(list.members);
    const mapped = await mapKaitenCardMembersToCrm(db, tenantId, auth, list.members);
    const card =
      state.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[loc.cardIndex]!;
    const didChange = applyInboundMembersToKanbanCard(card, {
      assignees: mapped.assignees,
      participants: mapped.participants,
      fingerprint,
      unmappedLabels: mapped.unmappedLabels,
      forceApply: true,
    });
    if (didChange) changed += 1;
    else skipped += 1;
    processed += 1;
    lastOrderId = order.id;
  }

  if (changed > 0) {
    await corePrisma.tenantClientState.upsert({
      where: { tenantId_key: { tenantId, key: KANBAN_CHAT_STATE_KEY } },
      create: { tenantId, key: KANBAN_CHAT_STATE_KEY, value: state as never },
      update: { value: state as never },
    });
  }

  const finished = !rateLimited && processed >= orders.length && orders.length < limit;

  return {
    total,
    processed,
    changed,
    skipped,
    noCard,
    rateLimited,
    finished,
    afterOrderId: lastOrderId,
  };
}
