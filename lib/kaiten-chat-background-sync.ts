import type { Prisma, PrismaClient } from "@prisma/client";
import type { KaitenAuth } from "@/lib/kaiten-rest";
import { syncAllUnpushedAttachmentsInBackground } from "@/lib/kaiten-sync";
import { syncKaitenColumnTitlesForOrderIds } from "@/lib/kaiten-sync-order-column-titles";
import { logger } from "@/lib/server/logger";

const CURSOR_KEY = "kaitenChatBackgroundCursorV1";
const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 120;
const DEFAULT_PER_TENANT_LIMIT = 40;
const SYNC_HELPER_CHUNK_SIZE = 10;
const memoryCursorByTenant = new Map<string, CursorState>();

type CursorState = {
  lastOrderId?: string;
  checkedAt?: string;
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
};

function normalizeLimit(value: number | string | null | undefined): number {
  const n = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(n)));
}

function parseCursor(value: Prisma.JsonValue | null | undefined): CursorState {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const obj = value as Record<string, unknown>;
  return {
    lastOrderId: typeof obj.lastOrderId === "string" ? obj.lastOrderId : undefined,
    checkedAt: typeof obj.checkedAt === "string" ? obj.checkedAt : undefined,
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
    logger.warn(
      { tenantId },
      "TenantClientState is unavailable; using in-memory Kaiten chat sync cursor",
    );
    return { cursor: memoryCursorByTenant.get(tenantId) ?? {}, persistent: false };
  }
}

async function writeTenantCursor(
  db: PrismaClient,
  tenantId: string,
  lastOrderId: string,
  persistent: boolean,
): Promise<void> {
  const value = { lastOrderId, checkedAt: new Date().toISOString() };
  if (!persistent) {
    memoryCursorByTenant.set(tenantId, value);
    return;
  }
  await db.tenantClientState.upsert({
    where: { tenantId_key: { tenantId, key: CURSOR_KEY } },
    create: {
      tenantId,
      key: CURSOR_KEY,
      value,
    },
    update: {
      value,
    },
  });
}

async function listTenantIdsWithKaitenOrders(db: PrismaClient): Promise<string[]> {
  const rows = await db.order.findMany({
    where: {
      archivedAt: null,
      kaitenCardId: { not: null },
    },
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
): Promise<{ rows: Array<{ id: string }>; persistentCursor: boolean }> {
  const { cursor, persistent } = await readTenantCursor(db, tenantId);
  const baseWhere = {
    tenantId,
    archivedAt: null,
    kaitenCardId: { not: null },
  } satisfies Prisma.OrderWhereInput;
  const staleFirst = await db.order.findMany({
    where: baseWhere,
    orderBy: [{ kaitenSyncedAt: "asc" }, { id: "asc" }],
    take,
    select: { id: true },
  });
  if (staleFirst.length > 0) {
    return { rows: staleFirst, persistentCursor: persistent };
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
      return { rows: afterCursor, persistentCursor: persistent };
    }
    const rows = await db.order.findMany({
      where: baseWhere,
      orderBy: { id: "asc" },
      take,
      select: { id: true },
    });
    return { rows, persistentCursor: persistent };
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
  const corrBefore = await db.orderChatCorrection.count({
    where: { resolvedAt: null, rejectedAt: null },
  });
  const prosthBefore = await db.orderProstheticsRequest.count({
    where: { resolvedAt: null, rejectedAt: null },
  });

  let checked = 0;
  let syncedCount = 0;
  let errorCount = 0;
  let kaitenLabMentionDbChanged = false;
  let columnSyncRateLimited = false;

  for (const tenantId of tenants) {
    if (checked >= limit || columnSyncRateLimited) break;
    const take = Math.min(perTenantLimit, limit - checked);
    const { rows: batch, persistentCursor } = await selectTenantOrderBatch(
      db,
      tenantId,
      take,
    );
    const orderIds = batch.map((r) => r.id);
    if (orderIds.length === 0) continue;
    try {
      for (let i = 0; i < orderIds.length; i += SYNC_HELPER_CHUNK_SIZE) {
        const chunk = orderIds.slice(i, i + SYNC_HELPER_CHUNK_SIZE);
        const res = await syncKaitenColumnTitlesForOrderIds(db, auth, chunk, {
          includeComments: true,
        });
        syncedCount += res.syncedCount;
        errorCount += res.errorCount;
        if (res.kaitenLabMentionDbChanged) kaitenLabMentionDbChanged = true;
        if (res.rateLimited) {
          columnSyncRateLimited = true;
          break;
        }
      }
      if (columnSyncRateLimited) break;
      checked += orderIds.length;
    } catch (err) {
      checked += orderIds.length;
      errorCount += orderIds.length;
      logger.warn({ err, tenantId, orderIds }, "background Kaiten chat sync batch failed");
    } finally {
      const lastOrderId = orderIds.at(-1);
      if (lastOrderId) {
        await writeTenantCursor(db, tenantId, lastOrderId, persistentCursor);
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
  if (!columnSyncRateLimited) {
    try {
      const att = await syncAllUnpushedAttachmentsInBackground(db);
      attachmentsAttempted = att.attempted;
      attachmentsPushed = att.pushed;
      attachmentsFailed = att.failed;
      if (att.rateLimited) columnSyncRateLimited = true;
    } catch (err) {
      logger.warn({ err }, "background Kaiten attachment sync failed");
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
    kaitenLabMentionDbChanged,
    attachmentsAttempted,
    attachmentsPushed,
    attachmentsFailed,
    elapsedMs: Date.now() - startedAt,
  };
  logger.info(result, "background Kaiten chat sync completed");
  return result;
}
