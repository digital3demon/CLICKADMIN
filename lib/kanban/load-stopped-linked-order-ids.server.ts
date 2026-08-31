import "server-only";
import { getPrisma } from "@/lib/get-prisma";
import { KANBAN_STATE_KEY } from "@/lib/kanban-tenant-state-snippet-for-order";
import { stoppedLinkedOrderIdsFromKanbanState } from "@/lib/kanban/kanban-linked-order-ids";
import type { KanbanAppState } from "@/lib/kanban/types";

export async function loadStoppedLinkedOrderIdSet(
  tenantId: string,
): Promise<Set<string>> {
  const tid = tenantId.trim();
  if (!tid) return new Set();
  const prisma = await getPrisma();
  const row = await prisma.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId: tid, key: KANBAN_STATE_KEY } },
    select: { value: true },
  });
  return new Set(
    stoppedLinkedOrderIdsFromKanbanState(row?.value as KanbanAppState | null),
  );
}
