/**
 * Tenant kanbanAppStateV3: load + OCC upsert.
 * Inbound / archive / advance — один писатель, не голый upsert поверх чужого PUT.
 */
import "server-only";

import { getPrisma } from "@/lib/get-prisma";
import { parseKanbanAppState } from "@/lib/kanban/chat-sync";
import { removeLinkedOrderCardsFromAppState } from "@/lib/kanban/model";
import type { KanbanAppState } from "@/lib/kanban/types";
import { KANBAN_STATE_KEY } from "@/lib/kanban-tenant-state-snippet-for-order";

export { KANBAN_STATE_KEY };

export async function loadKanbanTenantState(tenantId: string): Promise<{
  state: KanbanAppState | null;
  updatedAt: Date | null;
}> {
  const prisma = await getPrisma();
  const row = await prisma.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key: KANBAN_STATE_KEY } },
    select: { value: true, updatedAt: true },
  });
  return {
    state: parseKanbanAppState(row?.value ?? null),
    updatedAt: row?.updatedAt ?? null,
  };
}

export async function saveKanbanStateWithRetry(
  tenantId: string,
  nextState: KanbanAppState,
  baseUpdatedAt: Date | null,
): Promise<boolean> {
  const prisma = await getPrisma();
  if (!baseUpdatedAt) {
    await prisma.tenantClientState.upsert({
      where: { tenantId_key: { tenantId, key: KANBAN_STATE_KEY } },
      create: { tenantId, key: KANBAN_STATE_KEY, value: nextState as never },
      update: { value: nextState as never },
    });
    return true;
  }
  const updated = await prisma.tenantClientState.updateMany({
    where: {
      tenantId,
      key: KANBAN_STATE_KEY,
      updatedAt: baseUpdatedAt,
    },
    data: { value: nextState as never },
  });
  return updated.count > 0;
}

export type MutateKanbanTenantResult = {
  ok: boolean;
  changed: boolean;
  skipped: boolean;
};

/**
 * Клонирует снимок, мутирует, пишет с CAS (до `attempts` раз).
 * `mutate` возвращает false — не писать.
 */
export async function mutateKanbanTenantState(
  tenantId: string,
  mutate: (state: KanbanAppState) => boolean,
  attempts = 4,
): Promise<MutateKanbanTenantResult> {
  const tid = tenantId.trim();
  if (!tid) return { ok: false, changed: false, skipped: true };

  for (let i = 0; i < attempts; i += 1) {
    const { state, updatedAt } = await loadKanbanTenantState(tid);
    if (!state) return { ok: true, changed: false, skipped: true };
    const next = structuredClone(state);
    const changed = mutate(next);
    if (!changed) return { ok: true, changed: false, skipped: false };
    if (await saveKanbanStateWithRetry(tid, next, updatedAt)) {
      return { ok: true, changed: true, skipped: false };
    }
  }
  return { ok: false, changed: false, skipped: false };
}

/** Архив/отмена наряда: снять linked-карточку с доски, СТОП и архива канбана. */
export async function pruneLinkedOrdersFromKanbanTenantState(
  tenantId: string,
  orderIds: string[],
): Promise<MutateKanbanTenantResult> {
  const ids = orderIds.map((id) => String(id || "").trim()).filter(Boolean);
  if (ids.length === 0) {
    return { ok: true, changed: false, skipped: true };
  }
  return mutateKanbanTenantState(tenantId, (state) => {
    const pruned = removeLinkedOrderCardsFromAppState(state, ids);
    state.boards = pruned.boards;
    state.hiddenLinkedOrderIds = pruned.hiddenLinkedOrderIds;
    return true;
  });
}
