import type { PrismaClient } from "@prisma/client";
import { invalidateKaitenSnapshotCache } from "@/lib/kaiten-snapshot-cache";
import { syncNewOrderToKaiten } from "@/lib/kaiten-order-sync";
import {
  pushKaitenCardTitleForOrderIfLinked,
  pushKaitenHeadForContinuationParents,
} from "@/lib/kaiten-push-order-title";
import { syncUnpushedOrderAttachmentsToKaiten } from "@/lib/kaiten-sync";
import {
  resolveReplyToSourceEmailId,
} from "@/lib/mail/email-reply-template";
import {
  sendOrderAutoReply,
  type OrderAutoReplyResult,
} from "@/lib/mail/order-auto-reply";
import type { CreateOrderBody } from "@/lib/order-create-service";
import { shouldScheduleKaitenSyncAfterOrderCreate } from "@/lib/order-create-service";
import { gateKaitenSyncForTenant } from "@/lib/kaiten-integration/sync";
import { logger } from "@/lib/server/logger";

export type SyncKaitenAfterCreateResult = {
  kaitenSyncError: string | null;
};

export async function syncKaitenAfterOrderCreate(
  orderId: string,
  prisma: PrismaClient,
): Promise<SyncKaitenAfterCreateResult> {
  const tenantRow = await prisma.order.findUnique({
    where: { id: orderId },
    select: { tenantId: true },
  });
  if (!tenantRow) return { kaitenSyncError: null };
  const integrationGate = await gateKaitenSyncForTenant(prisma, tenantRow.tenantId);
  if (integrationGate.skip) return { kaitenSyncError: null };

  const maxKaitenAttempts = 3;
  let lastError: string | null = null;
  for (let attempt = 0; attempt < maxKaitenAttempts; attempt++) {
    let syncResult: Awaited<ReturnType<typeof syncNewOrderToKaiten>>;
    try {
      syncResult = await syncNewOrderToKaiten(orderId);
    } catch (e) {
      logger.error(
        { err: e, msg: "kaiten_sync_after_create", attempt, orderId },
        "order-post-create-pipeline",
      );
      lastError = e instanceof Error ? e.message : String(e);
      if (attempt === maxKaitenAttempts - 1) break;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      continue;
    }
    if (syncResult.ok) {
      invalidateKaitenSnapshotCache(orderId);
      try {
        const push = await pushKaitenCardTitleForOrderIfLinked(orderId);
        if (!push.ok) {
          logger.error(
            { err: push.error, msg: "kaiten_head_after_create", orderId },
            "order-post-create-pipeline",
          );
        }
      } catch (e) {
        logger.error(
          { err: e, msg: "kaiten_head_after_create", orderId },
          "order-post-create-pipeline",
        );
      }
      try {
        const row = await prisma.order.findUnique({
          where: { id: orderId },
          select: { continuesFromOrderId: true },
        });
        if (row?.continuesFromOrderId) {
          await pushKaitenHeadForContinuationParents([row.continuesFromOrderId]);
        }
      } catch (e) {
        logger.error(
          { err: e, msg: "kaiten_parent_after_child_create", orderId },
          "order-post-create-pipeline",
        );
      }
      try {
        await syncUnpushedOrderAttachmentsToKaiten(orderId, prisma);
      } catch (e) {
        logger.error(
          { err: e, msg: "order_attachments_kaiten_after_create", orderId },
          "order-post-create-pipeline",
        );
      }
      return { kaitenSyncError: null };
    }
    lastError = syncResult.error ?? "Не удалось создать карточку Kaiten";
    logger.info(
      { msg: "kaiten_sync_after_create", attempt, err: syncResult.error, orderId },
      "order-post-create-pipeline",
    );
    if (attempt < maxKaitenAttempts - 1) {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  return { kaitenSyncError: lastError ?? "Не удалось создать карточку Kaiten" };
}

export type RunPostCreateOrderPipelineParams = {
  orderId: string;
  body: CreateOrderBody;
  prisma: PrismaClient;
  tenantId: string;
  actorUserId: string;
  actorRole: string;
};

export type RunPostCreateOrderPipelineResult = {
  kaitenSyncError: string | null;
  autoReply?: OrderAutoReplyResult;
};

export async function runPostCreateOrderPipeline(
  params: RunPostCreateOrderPipelineParams,
): Promise<RunPostCreateOrderPipelineResult> {
  const { orderId, body, prisma, tenantId, actorUserId, actorRole } = params;
  const sendAutoReply = body.sendAutoReply === true;
  const needsKaiten = shouldScheduleKaitenSyncAfterOrderCreate(body);

  let kaitenSyncError: string | null = null;
  if (needsKaiten) {
    const kaiten = await syncKaitenAfterOrderCreate(orderId, prisma);
    kaitenSyncError = kaiten.kaitenSyncError;
  }

  if (!sendAutoReply) {
    return { kaitenSyncError };
  }

  if (needsKaiten && kaitenSyncError) {
    return {
      kaitenSyncError,
      autoReply: {
        ok: false,
        error: `Карточка Kaiten не создана: ${kaitenSyncError}`,
      },
    };
  }

  const sourceEmailIds = Array.isArray(body.sourceEmailIds)
    ? body.sourceEmailIds.map((id) => id.trim()).filter(Boolean)
    : [];
  const replyToSourceEmailId = resolveReplyToSourceEmailId(
    sourceEmailIds,
    body.replyToSourceEmailId,
  );
  if (!replyToSourceEmailId) {
    return {
      kaitenSyncError,
      autoReply: { skipped: true, reason: "Не выбрано письмо для ответа" },
    };
  }

  const subjectOverride = String(body.autoReplySubject ?? "").trim();
  const htmlOverride = String(body.autoReplyHtml ?? "").trim();
  if (!subjectOverride || !htmlOverride) {
    return {
      kaitenSyncError,
      autoReply: { skipped: true, reason: "Пустая тема или текст ответа" },
    };
  }

  const autoReply = await sendOrderAutoReply({
    db: prisma,
    tenantId,
    userId: actorUserId,
    role: actorRole,
    orderId,
    replyToSourceEmailId,
    overrideSubject: subjectOverride,
    overrideHtml: htmlOverride,
  });

  return { kaitenSyncError, autoReply };
}
