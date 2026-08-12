import "server-only";

import { getPrisma } from "@/lib/get-prisma";
import {
  peekLinkedOrderColumnNeighbor,
  type AdvanceLinkedOrderColumnResult,
  type LinkedOrderColumnNeighbor,
} from "@/lib/kanban/advance-linked-order-column";
import { findCardByLinkedOrderId, parseKanbanAppState } from "@/lib/kanban/chat-sync";
import { pushActivity } from "@/lib/kanban/model";
import type { KanbanAppState } from "@/lib/kanban/types";
import { KANBAN_STATE_KEY } from "@/lib/kanban-tenant-state-snippet-for-order";

export type {
  AdvanceLinkedOrderColumnResult,
  LinkedOrderColumnNeighbor,
} from "@/lib/kanban/advance-linked-order-column";
export { peekLinkedOrderColumnNeighbor } from "@/lib/kanban/advance-linked-order-column";

async function loadKanbanState(tenantId: string): Promise<{
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

async function saveKanbanStateWithRetry(
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

export async function getLinkedOrderColumnNeighbor(
  tenantId: string,
  orderId: string,
): Promise<LinkedOrderColumnNeighbor | null> {
  const { state } = await loadKanbanState(tenantId);
  if (!state) return null;
  return peekLinkedOrderColumnNeighbor(state, orderId);
}

/**
 * Перенос карточки связанного наряда на следующую колонку той же доски CRM-канбана.
 * Kaiten sync — на вызывающей стороне (как в KanbanApp).
 */
export async function advanceLinkedOrderToNextColumn(opts: {
  tenantId: string;
  orderId: string;
  actorUserId?: string | null;
  actorLabel?: string | null;
}): Promise<AdvanceLinkedOrderColumnResult> {
  const oid = opts.orderId.trim();
  if (!oid) return { ok: false, error: "Не указан наряд", code: "not_found" };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { state, updatedAt } = await loadKanbanState(opts.tenantId);
    if (!state) {
      return { ok: false, error: "Канбан не найден", code: "not_found" };
    }
    const loc = findCardByLinkedOrderId(state, oid);
    if (!loc) {
      return {
        ok: false,
        error: "Карточка наряда не найдена в канбане",
        code: "not_found",
      };
    }

    const next = structuredClone(state) as KanbanAppState;
    const board = next.boards[loc.boardIndex]!;
    const fromCol = board.columns[loc.columnIndex]!;
    const toCol = board.columns[loc.columnIndex + 1];
    if (!toCol) {
      return {
        ok: false,
        error: "Это последняя колонка",
        code: "last",
      };
    }

    const card = fromCol.cards[loc.cardIndex]!;
    const fromTitle = (fromCol.title || "").trim() || "—";
    const toTitle = (toCol.title || "").trim() || "—";

    fromCol.cards = fromCol.cards.filter((_, i) => i !== loc.cardIndex);
    toCol.cards.push(card);
    const now = new Date().toISOString();
    card.lastMovedAt = now;
    card.updatedAt = now;
    pushActivity(
      card,
      `Перемещена в «${toTitle}»`,
      opts.actorUserId?.trim() || undefined,
      board,
      opts.actorLabel?.trim() || undefined,
    );

    const linkedSorts = toCol.cards
      .filter((c) => c.linkedOrderId)
      .map((c) => c.kaitenCardSortOrder)
      .filter((x): x is number => x != null && Number.isFinite(x));
    const sortOrder = (linkedSorts.length ? Math.max(...linkedSorts) : 0) + 1;
    card.kaitenCardSortOrder = sortOrder;

    const saved = await saveKanbanStateWithRetry(
      opts.tenantId,
      next,
      updatedAt,
    );
    if (!saved) continue;

    const kaitenRaw = card.kaitenCardId;
    return {
      ok: true,
      fromTitle,
      toTitle,
      sortOrder,
      kaitenCardId:
        typeof kaitenRaw === "number" && Number.isFinite(kaitenRaw)
          ? kaitenRaw
          : null,
    };
  }

  return {
    ok: false,
    error: "Конфликт сохранения канбана, повторите",
    code: "conflict",
  };
}
