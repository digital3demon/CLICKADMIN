import "server-only";

import { getPrisma } from "@/lib/get-prisma";
import type { KaitenCommentForSync } from "@/lib/kanban/chat-sync";
import {
  findCardByLinkedOrderId,
  KANBAN_CHAT_STATE_KEY,
  parseKanbanAppState,
  upsertKaitenCommentsToCard,
} from "@/lib/kanban/chat-sync";

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
    const corePrisma = await getPrisma();
    const row = await corePrisma.tenantClientState.findUnique({
      where: { tenantId_key: { tenantId, key: KANBAN_CHAT_STATE_KEY } },
      select: { value: true },
    });
    const state = parseKanbanAppState(row?.value ?? null);
    if (!state) return { changed: false, skipped: true };

    const loc = findCardByLinkedOrderId(state, orderId);
    if (!loc) return { changed: false, skipped: true };

    const card =
      state.boards[loc.boardIndex]!.columns[loc.columnIndex]!.cards[loc.cardIndex]!;
    const merged = upsertKaitenCommentsToCard(card.comments || [], input.comments);
    if (!merged.changed) return { changed: false, skipped: false };

    card.comments = merged.next;
    card.updatedAt = new Date().toISOString();
    await corePrisma.tenantClientState.upsert({
      where: { tenantId_key: { tenantId, key: KANBAN_CHAT_STATE_KEY } },
      create: { tenantId, key: KANBAN_CHAT_STATE_KEY, value: state as never },
      update: { value: state as never },
    });
    return { changed: true, skipped: false };
  } catch (err) {
    if (isTenantClientStateMissing(err)) return { changed: false, skipped: true };
    throw err;
  }
}
