import "server-only";

import { getPrisma } from "@/lib/get-prisma";
import {
  columnTitleAfterWorkUnsent,
  findHandedToAdminsColumnIndex,
  findKanbanColumnIndexByTitle,
  findLinkedOrderCardOnSourceBoard,
  peekLinkedOrderColumnNeighbor,
  snapshotColumnBeforeWorkSent,
  type AdvanceLinkedOrderColumnResult,
  type LinkedOrderColumnNeighbor,
} from "@/lib/kanban/advance-linked-order-column";
import { findCardByLinkedOrderId } from "@/lib/kanban/chat-sync";
import { labWorkStatusFromColumnTitle } from "@/lib/order-status-display";
import {
  loadKanbanTenantState,
  saveKanbanStateWithRetry,
} from "@/lib/kanban/kanban-tenant-state-write.server";
import { pushActivity } from "@/lib/kanban/model";
import type { KanbanAppState } from "@/lib/kanban/types";
import { LAB_WORK_STATUS_LABELS } from "@/lib/lab-work-status";

export type {
  AdvanceLinkedOrderColumnResult,
  LinkedOrderColumnNeighbor,
} from "@/lib/kanban/advance-linked-order-column";
export {
  columnTitleAfterWorkUnsent,
  findHandedToAdminsColumnIndex,
  findKanbanColumnIndexByTitle,
  findLinkedOrderCardOnSourceBoard,
  peekLinkedOrderColumnNeighbor,
  snapshotColumnBeforeWorkSent,
} from "@/lib/kanban/advance-linked-order-column";

export async function getLinkedOrderColumnNeighbor(
  tenantId: string,
  orderId: string,
): Promise<LinkedOrderColumnNeighbor | null> {
  const { state } = await loadKanbanTenantState(tenantId);
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
    const { state, updatedAt } = await loadKanbanTenantState(opts.tenantId);
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
    const { state, updatedAt } = await loadKanbanTenantState(opts.tenantId);
    if (!state) {
      return { ok: false, error: "Канбан не найден", code: "not_found" };
    }
    const loc = findLinkedOrderCardOnSourceBoard(state, oid);
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

/** Вернуть leftover JSON-карточку в колонку по подписи (после снятия отправки). */
export async function moveLinkedOrderToColumnTitle(opts: {
  tenantId: string;
  orderId: string;
  columnTitle: string;
  actorUserId?: string | null;
  actorLabel?: string | null;
}): Promise<AdvanceLinkedOrderColumnResult> {
  const oid = opts.orderId.trim();
  const wantTitle = opts.columnTitle.trim();
  if (!oid) return { ok: false, error: "Не указан наряд", code: "not_found" };
  if (!wantTitle) return { ok: false, error: "Не указана колонка", code: "no_target" };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { state, updatedAt } = await loadKanbanTenantState(opts.tenantId);
    if (!state) {
      return { ok: false, error: "Канбан не найден", code: "not_found" };
    }
    const loc = findLinkedOrderCardOnSourceBoard(state, oid);
    if (!loc) {
      return {
        ok: false,
        error: "Карточка наряда не найдена в канбане",
        code: "not_found",
      };
    }

    const next = structuredClone(state) as KanbanAppState;
    const board = next.boards[loc.boardIndex]!;
    const targetIdx = findKanbanColumnIndexByTitle(board.columns, wantTitle);
    if (targetIdx < 0) {
      return {
        ok: false,
        error: `Колонка «${wantTitle}» не найдена на доске`,
        code: "no_target",
      };
    }

    const fromCol = board.columns[loc.columnIndex]!;
    const toCol = board.columns[targetIdx]!;
    const card = fromCol.cards[loc.cardIndex]!;
    const fromTitle = (fromCol.title || "").trim() || "—";
    const toTitle = (toCol.title || "").trim() || wantTitle;

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

async function syncKaitenColumnAfterWorkSentMove(opts: {
  orderId: string;
  columnTitle: string;
  sortOrder: number;
  request?: Request | null;
}): Promise<void> {
  if (!opts.request) return;
  const prisma = await getPrisma();
  try {
    const origin = new URL(opts.request.url).origin;
    const res = await fetch(
      `${origin}/api/orders/${encodeURIComponent(opts.orderId)}/kaiten`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: opts.request.headers.get("cookie") || "",
        },
        body: JSON.stringify({
          columnTitle: opts.columnTitle,
          sortOrder: opts.sortOrder,
        }),
      },
    );
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      const err = data.error ?? `Kaiten HTTP ${res.status}`;
      console.warn("[work-sent] kaiten column", opts.orderId, err);
      try {
        await prisma.order.update({
          where: { id: opts.orderId },
          data: { kaitenSyncError: err },
        });
      } catch {
        /* CRM-колонка уже записана */
      }
    } else {
      try {
        await prisma.order.update({
          where: { id: opts.orderId },
          data: { kaitenSyncError: null, kaitenSyncedAt: new Date() },
        });
      } catch {
        /* ignore */
      }
    }
  } catch (e) {
    console.warn("[work-sent] kaiten column network", opts.orderId, e);
  }
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
  const existing = await prisma.order.findUnique({
    where: { id: oid },
    select: {
      kaitenColumnTitle: true,
      kanbanColumnBeforeShipped: true,
      kaitenCardId: true,
    },
  });
  const snapshot = snapshotColumnBeforeWorkSent(
    existing?.kaitenColumnTitle,
    existing?.kanbanColumnBeforeShipped,
  );
  try {
    await prisma.order.update({
      where: { id: oid },
      data: {
        labWorkStatus: "TO_ADMINS",
        kaitenColumnTitle: toTitle,
        kanbanColumnBeforeShipped: snapshot,
        kanbanBoardUpdatedAt: new Date(),
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
  if (!moved.ok && moved.code !== "not_found") {
    console.warn("[work-sent] kanban move", oid, moved.error);
  }
  const alreadyThere = moved.ok && moved.alreadyThere;
  if (alreadyThere) return;
  const hasKaiten =
    (moved.ok && moved.kaitenCardId != null) ||
    (typeof existing?.kaitenCardId === "number" &&
      Number.isFinite(existing.kaitenCardId));
  if (!hasKaiten || !opts.request) return;
  await syncKaitenColumnAfterWorkSentMove({
    orderId: oid,
    columnTitle: moved.ok ? moved.toTitle : toTitle,
    sortOrder: moved.ok ? moved.sortOrder : 0,
    request: opts.request,
  });
}

/**
 * После true→false «Работа отправлена»: вернуть карточку в колонку до отметки.
 */
export async function applyWorkUnsentKanbanSideEffects(opts: {
  tenantId: string;
  orderId: string;
  actorUserId?: string | null;
  actorLabel?: string | null;
  request?: Request | null;
}): Promise<{ restoredTitle: string }> {
  const oid = opts.orderId.trim();
  const fallback = LAB_WORK_STATUS_LABELS.TO_EXECUTION;
  if (!oid) return { restoredTitle: fallback };

  const prisma = await getPrisma();
  const existing = await prisma.order.findUnique({
    where: { id: oid },
    select: {
      kaitenColumnTitle: true,
      kanbanColumnBeforeShipped: true,
      kaitenCardId: true,
    },
  });
  const restoredTitle = columnTitleAfterWorkUnsent(
    existing?.kanbanColumnBeforeShipped,
    existing?.kaitenColumnTitle,
  );
  const labWorkStatus =
    labWorkStatusFromColumnTitle(restoredTitle) ?? "TO_EXECUTION";
  try {
    await prisma.order.update({
      where: { id: oid },
      data: {
        labWorkStatus,
        kaitenColumnTitle: restoredTitle,
        kanbanColumnBeforeShipped: null,
        kanbanBoardUpdatedAt: new Date(),
      },
    });
  } catch (e) {
    console.error("[work-unsent] labWorkStatus", oid, e);
  }

  const moved = await moveLinkedOrderToColumnTitle({
    tenantId: opts.tenantId,
    orderId: oid,
    columnTitle: restoredTitle,
    actorUserId: opts.actorUserId,
    actorLabel: opts.actorLabel,
  });
  if (!moved.ok && moved.code !== "not_found") {
    console.warn("[work-unsent] kanban move", oid, moved.error);
  }
  const alreadyThere = moved.ok && moved.alreadyThere;
  if (alreadyThere) return { restoredTitle };
  const hasKaiten =
    (moved.ok && moved.kaitenCardId != null) ||
    (typeof existing?.kaitenCardId === "number" &&
      Number.isFinite(existing.kaitenCardId));
  if (hasKaiten && opts.request) {
    await syncKaitenColumnAfterWorkSentMove({
      orderId: oid,
      columnTitle: moved.ok ? moved.toTitle : restoredTitle,
      sortOrder: moved.ok ? moved.sortOrder : 0,
      request: opts.request,
    });
  }
  return { restoredTitle };
}
