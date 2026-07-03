/**
 * Догоняющая синхронизация CRM → Kaiten при повторном включении интеграции.
 * CRM — источник истины; обрабатываются только наряды, созданные/изменённые за период disabled.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import type { KanbanAppState } from "@/lib/kanban/types";
import { getKaitenEnvConfig } from "@/lib/kaiten-config";
import { withResolvedKaitenBoards } from "@/lib/kaiten-resolve-boards";
import {
  buildKaitenCommentTextWithCrmAuthor,
} from "@/lib/kaiten-comment-parse";
import { syncNewOrderToKaiten } from "@/lib/kaiten-order-sync";
import { pushKaitenCardTitleForOrderIfLinked } from "@/lib/kaiten-push-order-title";
import {
  getKaitenRestAuth,
  kaitenCreateComment,
  kaitenGetCard,
  kaitenListBoardColumns,
  kaitenPatchCard,
} from "@/lib/kaiten-rest";
import { syncUnpushedOrderAttachmentsToKaiten } from "@/lib/kaiten-sync";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  readKaitenIntegrationBackfillState,
  writeKaitenIntegrationBackfillState,
} from "@/lib/kaiten-integration/settings";
import type { KaitenIntegrationBackfillState } from "@/lib/kaiten-integration/types";
import { ordersChangedDuringDisabledWhere } from "@/lib/kaiten-integration/backfill-query";
import { kaitenColumnTitleFromBoard } from "@/lib/kaiten-column-title";

const KANBAN_STATE_KEY = "kanbanAppStateV3";
const BATCH_SIZE = 3;

export { ordersChangedDuringDisabledWhere } from "@/lib/kaiten-integration/backfill-query";

function parseKanbanState(raw: unknown): KanbanAppState | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Partial<KanbanAppState>;
  if (!Array.isArray(v.boards) || typeof v.activeBoardId !== "string") return null;
  return v as KanbanAppState;
}

function findKanbanCardPlacement(state: KanbanAppState, orderId: string): {
  columnTitle: string;
  sortIndex: number;
} | null {
  const oid = orderId.trim();
  for (const board of state.boards || []) {
    for (const col of board.columns || []) {
      const colTitle =
        typeof col.title === "string" && col.title.trim()
          ? col.title.trim()
          : "";
      for (let i = 0; i < (col.cards || []).length; i++) {
        const card = col.cards[i];
        if (String(card?.linkedOrderId || "").trim() === oid) {
          return { columnTitle: colTitle, sortIndex: i };
        }
      }
    }
  }
  return null;
}

async function pushKanbanPositionToKaiten(
  orderId: string,
  tenantId: string,
  db: PrismaClient,
): Promise<boolean> {
  const auth = getKaitenRestAuth();
  const cfg0 = getKaitenEnvConfig();
  if (!auth || !cfg0) return false;

  const ordersPrisma = await getOrdersPrisma();
  const order = await ordersPrisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: { kaitenCardId: true, kaitenTrackLane: true },
  });
  if (!order?.kaitenCardId) return false;

  const stateRow = await db.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key: KANBAN_STATE_KEY } },
    select: { value: true },
  });
  const state = parseKanbanState(stateRow?.value ?? null);
  if (!state) return false;
  const placement = findKanbanCardPlacement(state, orderId);
  if (!placement?.columnTitle) return false;

  const cfg = await withResolvedKaitenBoards(cfg0);
  const cardRes = await kaitenGetCard(auth, order.kaitenCardId);
  if (!cardRes.ok || !cardRes.card) return false;
  const boardIdRaw = (cardRes.card as Record<string, unknown>).board_id;
  const boardId = typeof boardIdRaw === "number" ? boardIdRaw : null;
  if (boardId == null) return false;

  const cols = await kaitenListBoardColumns(auth, boardId);
  if (!cols.ok) return false;
  const targetCol = cols.columns.find(
    (c) =>
      kaitenColumnTitleFromBoard({ column_id: c.id }, cols.columns) ===
        placement.columnTitle ||
      c.title === placement.columnTitle ||
      c.name === placement.columnTitle,
  );
  if (!targetCol) return false;

  const patch = await kaitenPatchCard(auth, order.kaitenCardId, {
    column_id: targetCol.id,
    sort_order: placement.sortIndex + 1,
  });
  return patch.ok;
}

async function pushPendingKanbanCommentsToKaiten(
  orderId: string,
  tenantId: string,
  db: PrismaClient,
): Promise<number> {
  const auth = getKaitenRestAuth();
  if (!auth) return 0;

  const ordersPrisma = await getOrdersPrisma();
  const order = await ordersPrisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: { kaitenCardId: true },
  });
  if (!order?.kaitenCardId) return 0;

  const stateRow = await db.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key: KANBAN_STATE_KEY } },
    select: { value: true },
  });
  const state = parseKanbanState(stateRow?.value ?? null);
  if (!state) return 0;

  let card: { comments?: Array<{ text?: string; authorLabel?: string; source?: string; syncStatus?: string; externalCommentId?: string }> } | null = null;
  for (const board of state.boards || []) {
    for (const col of board.columns || []) {
      for (const c of col.cards || []) {
        if (String(c.linkedOrderId || "").trim() === orderId.trim()) {
          card = c;
          break;
        }
      }
      if (card) break;
    }
    if (card) break;
  }
  if (!card?.comments?.length) return 0;

  let synced = 0;
  for (const comment of card.comments) {
    if (comment.externalCommentId) continue;
    if (comment.syncStatus === "synced") continue;
    const text = typeof comment.text === "string" ? comment.text.trim() : "";
    if (!text) continue;
    const author =
      typeof comment.authorLabel === "string" ? comment.authorLabel : "CRM";
    const kaitenText = buildKaitenCommentTextWithCrmAuthor(text, author);
    const posted = await kaitenCreateComment(auth, order.kaitenCardId, kaitenText);
    if (posted.ok) {
      synced++;
    }
  }
  return synced;
}

async function syncOneOrderDuringBackfill(
  orderId: string,
  tenantId: string,
  db: PrismaClient,
): Promise<{
  cardsCreated: number;
  commentsSynced: number;
  filesSynced: number;
  positionsSynced: number;
  error: string | null;
}> {
  const ordersPrisma = await getOrdersPrisma();
  let cardsCreated = 0;
  let commentsSynced = 0;
  let filesSynced = 0;
  let positionsSynced = 0;

  const row = await ordersPrisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: { kaitenCardId: true },
  });
  if (!row) {
    return {
      cardsCreated: 0,
      commentsSynced: 0,
      filesSynced: 0,
      positionsSynced: 0,
      error: "Наряд не найден",
    };
  }

  if (row.kaitenCardId == null) {
    const created = await syncNewOrderToKaiten(orderId);
    if (!created.ok) {
      return {
        cardsCreated: 0,
        commentsSynced: 0,
        filesSynced: 0,
        positionsSynced: 0,
        error: created.error,
      };
    }
    cardsCreated = 1;
  }

  const titlePush = await pushKaitenCardTitleForOrderIfLinked(orderId);
  if (!titlePush.ok && titlePush.error) {
    return {
      cardsCreated,
      commentsSynced,
      filesSynced,
      positionsSynced,
      error: titlePush.error,
    };
  }

  try {
    await syncUnpushedOrderAttachmentsToKaiten(orderId, ordersPrisma);
    filesSynced = 1;
  } catch (e) {
    return {
      cardsCreated,
      commentsSynced,
      filesSynced,
      positionsSynced,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  commentsSynced += await pushPendingKanbanCommentsToKaiten(orderId, tenantId, db);

  if (await pushKanbanPositionToKaiten(orderId, tenantId, db)) {
    positionsSynced = 1;
  }

  return {
    cardsCreated,
    commentsSynced,
    filesSynced,
    positionsSynced,
    error: null,
  };
}

export async function startKaitenIntegrationBackfill(
  db: PrismaClient,
  tenantId: string,
  disabledFrom: Date,
): Promise<KaitenIntegrationBackfillState> {
  const { persistent } = await readKaitenIntegrationBackfillState(db, tenantId);
  const total = await db.order.count({
    where: ordersChangedDuringDisabledWhere({ tenantId, disabledFrom }),
  });
  const state: KaitenIntegrationBackfillState = {
    status: "running",
    startedAt: new Date().toISOString(),
    disabledFrom: disabledFrom.toISOString(),
    cursorOrderId: null,
    total,
    processed: 0,
    cardsCreated: 0,
    commentsSynced: 0,
    filesSynced: 0,
    positionsSynced: 0,
    failed: 0,
    lastError: null,
  };
  await writeKaitenIntegrationBackfillState(db, tenantId, state, persistent);
  return state;
}

export async function tickKaitenIntegrationBackfill(
  db: PrismaClient,
  tenantId: string,
): Promise<{
  state: KaitenIntegrationBackfillState;
  done: boolean;
}> {
  const { state: prev, persistent } = await readKaitenIntegrationBackfillState(
    db,
    tenantId,
  );
  if (prev.status !== "running") {
    return { state: prev, done: prev.status === "completed" };
  }
  const disabledFromRaw = prev.disabledFrom;
  if (!disabledFromRaw) {
    const failed: KaitenIntegrationBackfillState = {
      ...prev,
      status: "failed",
      lastError: "Не задан период disabledFrom",
    };
    await writeKaitenIntegrationBackfillState(db, tenantId, failed, persistent);
    return { state: failed, done: false };
  }
  const disabledFrom = new Date(disabledFromRaw);
  if (Number.isNaN(disabledFrom.getTime())) {
    const failed: KaitenIntegrationBackfillState = {
      ...prev,
      status: "failed",
      lastError: "Некорректная дата disabledFrom",
    };
    await writeKaitenIntegrationBackfillState(db, tenantId, failed, persistent);
    return { state: failed, done: false };
  }

  const processed = prev.processed ?? 0;
  const rows = await db.order.findMany({
    where: ordersChangedDuringDisabledWhere({ tenantId, disabledFrom }),
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    skip: processed,
    take: BATCH_SIZE,
    select: { id: true },
  });

  if (rows.length === 0) {
    const completed: KaitenIntegrationBackfillState = {
      ...prev,
      status: "completed",
      finishedAt: new Date().toISOString(),
      lastError: null,
    };
    await writeKaitenIntegrationBackfillState(db, tenantId, completed, persistent);
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        kaitenIntegrationEnabled: true,
        kaitenIntegrationDisabledAt: null,
        kaitenIntegrationDisabledByUserId: null,
      },
    });
    return { state: completed, done: true };
  }

  const batch = rows;
  let next = { ...prev };
  for (const row of batch) {
    const result = await syncOneOrderDuringBackfill(row.id, tenantId, db);
    next = {
      ...next,
      processed: (next.processed ?? 0) + 1,
      cardsCreated: (next.cardsCreated ?? 0) + result.cardsCreated,
      commentsSynced: (next.commentsSynced ?? 0) + result.commentsSynced,
      filesSynced: (next.filesSynced ?? 0) + result.filesSynced,
      positionsSynced: (next.positionsSynced ?? 0) + result.positionsSynced,
      cursorOrderId: row.id,
    };
    if (result.error) {
      next = {
        ...next,
        status: "failed",
        lastError: `Наряд ${row.id}: ${result.error}`,
        failed: (next.failed ?? 0) + 1,
      };
      await writeKaitenIntegrationBackfillState(db, tenantId, next, persistent);
      return { state: next, done: false };
    }
  }

  await writeKaitenIntegrationBackfillState(db, tenantId, next, persistent);
  return { state: next, done: false };
}

export async function retryKaitenIntegrationBackfill(
  db: PrismaClient,
  tenantId: string,
): Promise<KaitenIntegrationBackfillState> {
  const { state, persistent } = await readKaitenIntegrationBackfillState(
    db,
    tenantId,
  );
  if (state.status !== "failed") return state;
  const resumed: KaitenIntegrationBackfillState = {
    ...state,
    status: "running",
    lastError: null,
  };
  await writeKaitenIntegrationBackfillState(db, tenantId, resumed, persistent);
  return resumed;
}
