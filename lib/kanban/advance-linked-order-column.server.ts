import "server-only";

import { getPrisma } from "@/lib/get-prisma";
import {
  findHandedToAdminsColumnIndex,
  peekLinkedOrderColumnNeighbor,
  type AdvanceLinkedOrderColumnResult,
  type LinkedOrderColumnNeighbor,
} from "@/lib/kanban/advance-linked-order-column";
import { findCardByLinkedOrderId, parseKanbanAppState } from "@/lib/kanban/chat-sync";
import { pushActivity } from "@/lib/kanban/model";
import type { KanbanAppState } from "@/lib/kanban/types";
import { KANBAN_STATE_KEY } from "@/lib/kanban-tenant-state-snippet-for-order";
import { LAB_WORK_STATUS_LABELS } from "@/lib/lab-work-status";

export type {
  AdvanceLinkedOrderColumnResult,
  LinkedOrderColumnNeighbor,
} from "@/lib/kanban/advance-linked-order-column";
export {
  findHandedToAdminsColumnIndex,
  peekLinkedOrderColumnNeighbor,
} from "@/lib/kanban/advance-linked-order-column";

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

/**
 * «Работа отправлена» → колонка «Сдана админам» на той же доске CRM-канбана.
 */
export async function moveLinkedOrderToHandedToAdminsColumn(opts: {
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
    const targetIdx = findHandedToAdminsColumnIndex(board.columns);
    if (targetIdx < 0) {
      return {
        ok: false,
        error: "Колонка «Сдана админам» не найдена на доске",
        code: "no_target",
      };
    }

    const fromCol = board.columns[loc.columnIndex]!;
    const toCol = board.columns[targetIdx]!;
    const card = fromCol.cards[loc.cardIndex]!;
    const fromTitle = (fromCol.title || "").trim() || "—";
    const toTitle =
      (toCol.title || "").trim() || LAB_WORK_STATUS_LABELS.TO_ADMINS;

    if (loc.columnIndex === targetIdx) {
      const kaitenRaw = card.kaitenCardId;
      return {
        ok: true,
        fromTitle,
        toTitle,
        sortOrder:
          typeof card.kaitenCardSortOrder === "number" &&
          Number.isFinite(card.kaitenCardSortOrder)
            ? card.kaitenCardSortOrder
            : 0,
        alreadyThere: true,
        kaitenCardId:
          typeof kaitenRaw === "number" && Number.isFinite(kaitenRaw)
            ? kaitenRaw
            : null,
      };
    }

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

/**
 * После false→true «Работа отправлена»: статус наряда + канбан (+ опционально Kaiten).
 * Ошибки канбана не откатывают отметку отправки.
 */
export async function applyWorkSentKanbanSideEffects(opts: {
  tenantId: string;
  orderId: string;
  actorUserId?: string | null;
  actorLabel?: string | null;
  /** Origin + cookie для зеркала колонки в Kaiten (как kanban-next-column). */
  request?: Request | null;
}): Promise<void> {
  const oid = opts.orderId.trim();
  if (!oid) return;

  const prisma = await getPrisma();
  const toTitle = LAB_WORK_STATUS_LABELS.TO_ADMINS;
  try {
    await prisma.order.update({
      where: { id: oid },
      data: {
        labWorkStatus: "TO_ADMINS",
        kaitenColumnTitle: toTitle,
      },
    });
  } catch (e) {
    console.error("[work-sent] labWorkStatus", oid, e);
  }

  const moved = await moveLinkedOrderToHandedToAdminsColumn({
    tenantId: opts.tenantId,
    orderId: oid,
    actorUserId: opts.actorUserId,
    actorLabel: opts.actorLabel,
  });
  if (!moved.ok) {
    if (moved.code !== "not_found") {
      console.warn("[work-sent] kanban move", oid, moved.error);
    }
    return;
  }
  if (moved.alreadyThere) return;
  if (moved.kaitenCardId == null || !opts.request) return;

  try {
    const origin = new URL(opts.request.url).origin;
    const res = await fetch(
      `${origin}/api/orders/${encodeURIComponent(oid)}/kaiten`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: opts.request.headers.get("cookie") || "",
        },
        body: JSON.stringify({
          columnTitle: moved.toTitle,
          sortOrder: moved.sortOrder,
        }),
      },
    );
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      console.warn(
        "[work-sent] kaiten column",
        oid,
        data.error ?? res.status,
      );
    }
  } catch (e) {
    console.warn("[work-sent] kaiten column network", oid, e);
  }
}
