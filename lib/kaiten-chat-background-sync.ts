import type { Prisma, PrismaClient } from "@prisma/client";
import type { KaitenAuth } from "@/lib/kaiten-rest";
import { syncKaitenChatCommentsForOrderIds } from "@/lib/order-chat-correction-kaiten-sync";
import {
  kaitenChatLowPriorityColumnTitles,
  kaitenChatPriorityColumnTitles,
  shouldIncludeLowPriorityChatSyncCycle,
} from "@/lib/kaiten-chat-priority";
import { syncAllUnpushedAttachmentsInBackground } from "@/lib/kaiten-sync";
import { cronLogger, kaitenLogger } from "@/lib/server/logger";

const CURSOR_KEY = "kaitenChatBackgroundCursorV2";
const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 120;
const DEFAULT_PER_TENANT_LIMIT = 60;

const memoryCursorByTenant = new Map<string, CursorState>();

type CursorState = {
  lastOrderId?: string;
  checkedAt?: string;
  cycle?: number;
};

type CursorReadResult = {
  cursor: CursorState;
  persistent: boolean;
};

export type KaitenChatBackgroundSyncResult = {
  ok: true;
  checked: number;
  tenantCount: number;
  syncedCount: number;
  errorCount: number;
  newCorrectionsImported: number;
  newProstheticsImported: number;
  kaitenLabMentionDbChanged: boolean;
  attachmentsAttempted: number;
  attachmentsPushed: number;
  attachmentsFailed: number;
  elapsedMs: number;
  rateLimited: boolean;
};

function normalizeLimit(value: number | string | null | undefined): number {
  const n = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(n)));
}

function parseCursor(value: Prisma.JsonValue | null | undefined): CursorState {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return { cycle: 0 };
  }
  const obj = value as Record<string, unknown>;
  return {
    lastOrderId: typeof obj.lastOrderId === "string" ? obj.lastOrderId : undefined,
    checkedAt: typeof obj.checkedAt === "string" ? obj.checkedAt : undefined,
    cycle: typeof obj.cycle === "number" && Number.isFinite(obj.cycle) ? obj.cycle : 0,
  };
}

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

async function readTenantCursor(
  db: PrismaClient,
  tenantId: string,
): Promise<CursorReadResult> {
  try {
    const row = await db.tenantClientState.findUnique({
      where: { tenantId_key: { tenantId, key: CURSOR_KEY } },
      select: { value: true },
    });
    return { cursor: parseCursor(row?.value), persistent: true };
  } catch (err) {
    if (!isTenantClientStateMissing(err)) throw err;
    cronLogger.warn(
      { tenantId, channel: "cron" },
      "TenantClientState unavailable; in-memory Kaiten chat cursor",
    );
    return { cursor: memoryCursorByTenant.get(tenantId) ?? { cycle: 0 }, persistent: false };
  }
}

async function writeTenantCursor(
  db: PrismaClient,
  tenantId: string,
  lastOrderId: string,
  cycle: number,
  persistent: boolean,
): Promise<void> {
  const value = { lastOrderId, checkedAt: new Date().toISOString(), cycle };
  if (!persistent) {
    memoryCursorByTenant.set(tenantId, value);
    return;
  }
  await db.tenantClientState.upsert({
    where: { tenantId_key: { tenantId, key: CURSOR_KEY } },
    create: { tenantId, key: CURSOR_KEY, value },
    update: { value },
  });
}

async function listTenantIdsWithKaitenOrders(db: PrismaClient): Promise<string[]> {
  const rows = await db.order.findMany({
    where: { archivedAt: null, kaitenCardId: { not: null } },
    distinct: ["tenantId"],
    orderBy: { tenantId: "asc" },
    select: { tenantId: true },
  });
  return rows.map((r) => r.tenantId);
}

async function selectTenantOrderBatch(
  db: PrismaClient,
  tenantId: string,
  take: number,
  cycle: number,
): Promise<{ rows: Array<{ id: string }>; persistentCursor: boolean; nextCycle: number }> {
  const { cursor, persistent } = await readTenantCursor(db, tenantId);
  const nextCycle = (cursor.cycle ?? 0) + 1;
  const baseWhere = {
    tenantId,
    archivedAt: null,
    kaitenCardId: { not: null },
  } satisfies Prisma.OrderWhereInput;

  const includeLowPriority = shouldIncludeLowPriorityChatSyncCycle(cycle);
  const lowPriority = kaitenChatLowPriorityColumnTitles();
  const priority = kaitenChatPriorityColumnTitles();

  const columnWhere: Prisma.OrderWhereInput = includeLowPriority
    ? {}
    : {
        OR: [
          { kaitenColumnTitle: { in: priority } },
          { kaitenColumnTitle: null },
          { kaitenColumnTitle: { notIn: lowPriority } },
        ],
      };

  const picked: Array<{ id: string }> = [];
  const pickedIds = new Set<string>();

  const pushUnique = (rows: Array<{ id: string }>) => {
    for (const r of rows) {
      if (pickedIds.has(r.id)) continue;
      picked.push(r);
      pickedIds.add(r.id);
      if (picked.length >= take) break;
    }
  };

  if (priority.length > 0 && picked.length < take) {
    const priorityRows = await db.order.findMany({
      where: {
        ...baseWhere,
        ...columnWhere,
        kaitenColumnTitle: { in: priority },
      },
      orderBy: [{ kaitenChatSyncedAt: "asc" }, { id: "asc" }],
      take,
      select: { id: true },
    });
    pushUnique(priorityRows);
  }

  if (picked.length < take) {
    const staleRows = await db.order.findMany({
      where: {
        ...baseWhere,
        ...columnWhere,
        ...(pickedIds.size > 0 ? { id: { notIn: [...pickedIds] } } : {}),
      },
      orderBy: [{ kaitenChatSyncedAt: "asc" }, { id: "asc" }],
      take: take - picked.length,
      select: { id: true },
    });
    pushUnique(staleRows);
  }

  if (picked.length > 0) {
    return { rows: picked, persistentCursor: persistent, nextCycle };
  }

  const afterCursor = cursor.lastOrderId
    ? await db.order.findMany({
        where: { ...baseWhere, id: { gt: cursor.lastOrderId } },
        orderBy: { id: "asc" },
        take,
        select: { id: true },
      })
    : [];
  if (afterCursor.length >= take || !cursor.lastOrderId) {
    if (afterCursor.length > 0) {
      return { rows: afterCursor, persistentCursor: persistent, nextCycle };
    }
    const rows = await db.order.findMany({
      where: baseWhere,
      orderBy: { id: "asc" },
      take,
      select: { id: true },
    });
    return { rows, persistentCursor: persistent, nextCycle };
  }
  const wrapped = await db.order.findMany({
    where: baseWhere,
    orderBy: { id: "asc" },
    take: take - afterCursor.length,
    select: { id: true },
  });
  const seen = new Set(afterCursor.map((r) => r.id));
  return {
    rows: [
      ...afterCursor,
      ...wrapped.filter((r) => r.id !== cursor.lastOrderId && !seen.has(r.id)),
    ],
    persistentCursor: persistent,
    nextCycle,
  };
}

export async function syncKaitenChatsInBackground(
  db: PrismaClient,
  auth: KaitenAuth,
  opts?: { limit?: number | string | null; perTenantLimit?: number | string | null },
): Promise<KaitenChatBackgroundSyncResult> {
  const startedAt = Date.now();
  const limit = normalizeLimit(opts?.limit);
  const perTenantLimit = normalizeLimit(opts?.perTenantLimit ?? DEFAULT_PER_TENANT_LIMIT);
  const tenants = await listTenantIdsWithKaitenOrders(db);

  cronLogger.info(
    { msg: "kaiten_chat_background_tick_start", limit, tenantCount: tenants.length },
    "kaiten chat background tick start",
  );

  const corrBefore = await db.orderChatCorrection.count({
    where: { resolvedAt: null, rejectedAt: null },
  });
  const prosthBefore = await db.orderProstheticsRequest.count({
    where: { resolvedAt: null, rejectedAt: null },
  });

  let checked = 0;
  let syncedCount = 0;
  let errorCount = 0;
  let rateLimited = false;

  for (const tenantId of tenants) {
    if (checked >= limit || rateLimited) break;
    const take = Math.min(perTenantLimit, limit - checked);
    const { cursor } = await readTenantCursor(db, tenantId);
    const cycle = cursor.cycle ?? 0;
    const { rows: batch, persistentCursor, nextCycle } = await selectTenantOrderBatch(
      db,
      tenantId,
      take,
      cycle,
    );
    const orderIds = batch.map((r) => r.id);
    if (orderIds.length === 0) continue;
    try {
      const res = await syncKaitenChatCommentsForOrderIds(db, auth, orderIds, {
        source: "cron",
      });
      syncedCount += res.syncedCount;
      errorCount += res.errorCount;
      checked += res.checkedCount;
      if (res.rateLimited) {
        rateLimited = true;
        break;
      }
    } catch (err) {
      checked += orderIds.length;
      errorCount += orderIds.length;
      kaitenLogger.warn({ err, tenantId, orderIds }, "background Kaiten chat sync batch failed");
    } finally {
      const lastOrderId = orderIds.at(-1);
      if (lastOrderId) {
        await writeTenantCursor(db, tenantId, lastOrderId, nextCycle, persistentCursor);
      }
    }
  }

  const corrAfter = await db.orderChatCorrection.count({
    where: { resolvedAt: null, rejectedAt: null },
  });
  const prosthAfter = await db.orderProstheticsRequest.count({
    where: { resolvedAt: null, rejectedAt: null },
  });

  let attachmentsAttempted = 0;
  let attachmentsPushed = 0;
  let attachmentsFailed = 0;
  if (!rateLimited) {
    try {
      const att = await syncAllUnpushedAttachmentsInBackground(db);
      attachmentsAttempted = att.attempted;
      attachmentsPushed = att.pushed;
      attachmentsFailed = att.failed;
      if (att.rateLimited) rateLimited = true;
    } catch (err) {
      kaitenLogger.warn({ err }, "background Kaiten attachment sync failed");
    }
  }

  const result: KaitenChatBackgroundSyncResult = {
    ok: true,
    checked,
    tenantCount: tenants.length,
    syncedCount,
    errorCount,
    newCorrectionsImported: Math.max(0, corrAfter - corrBefore),
    newProstheticsImported: Math.max(0, prosthAfter - prosthBefore),
    kaitenLabMentionDbChanged: false,
    attachmentsAttempted,
    attachmentsPushed,
    attachmentsFailed,
    elapsedMs: Date.now() - startedAt,
    rateLimited,
  };

  cronLogger.info(
    { msg: "kaiten_chat_background_tick_done", ...result },
    "kaiten chat background tick done",
  );
  return result;
}
