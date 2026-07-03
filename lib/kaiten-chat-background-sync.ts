import type { PrismaClient } from "@prisma/client";
import type { KaitenAuth } from "@/lib/kaiten-rest";
import {
  maybeRunActiveInboundKaitenSync,
} from "@/lib/kaiten-inbound-active-sync";
import { syncKaitenChatCommentsForOrderIds } from "@/lib/order-chat-correction-kaiten-sync";
import { syncAllUnpushedAttachmentsInBackground } from "@/lib/kaiten-sync";
import { cronLogger, kaitenLogger } from "@/lib/server/logger";

const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 120;
const DEFAULT_PER_TENANT_LIMIT = 20;

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

async function listTenantIdsWithActiveKaitenOrders(
  db: PrismaClient,
): Promise<string[]> {
  const rows = await db.order.findMany({
    where: {
      archivedAt: null,
      kaitenCardId: { not: null },
      adminShippedOtpr: false,
    },
    distinct: ["tenantId"],
    orderBy: { tenantId: "asc" },
    select: { tenantId: true },
  });
  return rows.map((r) => r.tenantId);
}

export async function syncKaitenChatsInBackground(
  db: PrismaClient,
  auth: KaitenAuth,
  opts?: { limit?: number | string | null; perTenantLimit?: number | string | null },
): Promise<KaitenChatBackgroundSyncResult> {
  const startedAt = Date.now();
  const limit = normalizeLimit(opts?.limit);
  const perTenantLimit = normalizeLimit(
    opts?.perTenantLimit ?? DEFAULT_PER_TENANT_LIMIT,
  );
  const tenants = await listTenantIdsWithActiveKaitenOrders(db);

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
    const remaining = limit - checked;
    const maxTake = Math.min(perTenantLimit, remaining);
    if (maxTake <= 0) break;

    try {
      const result = await maybeRunActiveInboundKaitenSync(
        db,
        tenantId,
        "cron",
        async (orderIds) => {
          const res = await syncKaitenChatCommentsForOrderIds(db, auth, orderIds, {
            source: "cron",
          });
          checked += res.checkedCount;
          syncedCount += res.syncedCount;
          errorCount += res.errorCount;
          return { rateLimited: res.rateLimited };
        },
        { maxTake },
      );

      if (result.skippedReason === "urgent_backlog" || result.skippedReason === "cron_defer_urgent") {
        cronLogger.info(
          { tenantId, skippedReason: result.skippedReason },
          "kaiten chat background deferred for urgent backlog",
        );
        break;
      }
      if (result.rateLimited) {
        rateLimited = true;
        break;
      }
    } catch (err) {
      errorCount += 1;
      kaitenLogger.warn({ err, tenantId }, "background Kaiten chat sync batch failed");
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
