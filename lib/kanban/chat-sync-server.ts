import "server-only";

import { getPrisma } from "@/lib/get-prisma";
import type { KaitenCommentForSync } from "@/lib/kanban/chat-sync";
import {
  findCardByLinkedOrderId,
  KANBAN_CHAT_STATE_KEY,
  parseKanbanAppState,
} from "@/lib/kanban/chat-sync";
import {
  loadKanbanOrderComments,
  mergeIncomingKaitenIntoKanbanComments,
  saveKanbanOrderComments,
} from "@/lib/kanban/kanban-order-comments-store";

function isTenantClientStateMissing(err: unknown): boolean {
  if (err == null || typeof err !== "object") return false;
  const obj = err as { code?: string; message?: string; meta?: { table?: string } };
  return (
    obj.code === "P2021" &&
    (obj.meta?.table === "public.TenantClientState" ||
      obj.meta?.table === "TenantClientState" ||
      String(obj.message || "").includes("TenantClientState"))
  );
}

export async function syncKaitenCommentsIntoKanbanState(input: {
  tenantId: string;
  orderId: string;
  comments: KaitenCommentForSync[];
}): Promise<{ changed: boolean; skipped: boolean }> {
  const tenantId = input.tenantId.trim();
  const orderId = input.orderId.trim();
  if (!tenantId || !orderId || input.comments.length === 0) {
    return { changed: false, skipped: true };
  }

  try {
    const existingStore = await loadKanbanOrderComments(tenantId, orderId);
    const corePrisma = await getPrisma();
    let state: ReturnType<typeof parseKanbanAppState> = null;
    try {
      const row = await corePrisma.tenantClientState.findUnique({
        where: { tenantId_key: { tenantId, key: KANBAN_CHAT_STATE_KEY } },
        select: { value: true },
      });
      state = parseKanbanAppState(row?.value ?? null);
    } catch (err) {
      if (!isTenantClientStateMissing(err)) throw err;
    }

    const loc = state ? findCardByLinkedOrderId(state, orderId) : null;
    const cardComments =
      loc && state
        ? state.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[loc.cardIndex]!
            .comments || []
        : [];
    const merged = mergeIncomingKaitenIntoKanbanComments(
      cardComments,
      existingStore,
      input.comments,
    );
    if (!merged.changed) return { changed: false, skipped: false };
    if (merged.next.length === 0 && existingStore.length > 0) {
      return { changed: false, skipped: false };
    }

    try {
      await saveKanbanOrderComments(tenantId, orderId, merged.next);
    } catch (e) {
      console.error("[syncKaitenCommentsIntoKanbanState] comments store", orderId, e);
    }

    if (state && loc) {
      const card =
        state.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[loc.cardIndex]!;
      card.comments = merged.next;
      card.updatedAt = new Date().toISOString();
      await corePrisma.tenantClientState.upsert({
        where: { tenantId_key: { tenantId, key: KANBAN_CHAT_STATE_KEY } },
        create: { tenantId, key: KANBAN_CHAT_STATE_KEY, value: state as never },
        update: { value: state as never },
      });
    }
    return { changed: true, skipped: false };
  } catch (err) {
    if (isTenantClientStateMissing(err)) return { changed: false, skipped: true };
    throw err;
  }
}
