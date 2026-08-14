import "server-only";

import { getPrisma } from "@/lib/get-prisma";
import type { CardComment } from "@/lib/kanban/types";
import { compactCardComments } from "@/lib/kanban/chat-sync";
import {
  KANBAN_ORDER_COMMENTS_MAX,
  kanbanOrderCommentsStateKey,
  parseStoredKanbanOrderComments,
} from "@/lib/kanban/kanban-order-comments";

export {
  kanbanOrderCommentsStateKey,
  mergeKanbanOrderComments,
  parseStoredKanbanOrderComments,
} from "@/lib/kanban/kanban-order-comments";

export async function loadKanbanOrderComments(
  tenantId: string,
  orderId: string,
): Promise<CardComment[]> {
  const tid = tenantId.trim();
  const oid = orderId.trim();
  if (!tid || !oid) return [];
  const prisma = await getPrisma();
  const row = await prisma.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId: tid, key: kanbanOrderCommentsStateKey(oid) } },
    select: { value: true },
  });
  return parseStoredKanbanOrderComments(row?.value ?? null);
}

export async function saveKanbanOrderComments(
  tenantId: string,
  orderId: string,
  comments: CardComment[],
): Promise<void> {
  const tid = tenantId.trim();
  const oid = orderId.trim();
  if (!tid || !oid) return;
  const compact = compactCardComments(comments).slice(-KANBAN_ORDER_COMMENTS_MAX);
  const prisma = await getPrisma();
  await prisma.tenantClientState.upsert({
    where: { tenantId_key: { tenantId: tid, key: kanbanOrderCommentsStateKey(oid) } },
    create: {
      tenantId: tid,
      key: kanbanOrderCommentsStateKey(oid),
      value: { comments: compact } as never,
    },
    update: { value: { comments: compact } as never },
  });
}
