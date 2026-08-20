/**
 * Единый ingest комментариев Kaiten → БД заказов (корректировки, протетика, @lab mention)
 * и зеркало CRM-канбана. Kanban UI и orders notification читают разные слои, но ingest общий.
 * Свежие внешние @упоминания (не CRM-черновик) → Telegram в этом же проходе.
 */

import type { PrismaClient } from "@prisma/client";
import type { KaitenCommentForSync } from "@/lib/kanban/chat-sync";
import { syncKaitenCommentsIntoKanbanState } from "@/lib/kanban/chat-sync-server";
import { notifyTelegramForKanbanChatMentions } from "@/lib/kanban-chat-mention-telegram.server";
import {
  syncOrderChatCorrectionsFromKaitenComments,
} from "@/lib/order-chat-correction-db";
import {
  syncCrmLabMentionFromCommentText,
  syncKaitenLabMentionFromParsedComments,
} from "@/lib/order-kaiten-lab-mention-db";
import { syncOrderProstheticsRequestsFromKaitenComments } from "@/lib/order-prosthetics-request-db";
import {
  createOrderChatInboxItemsFromCrmComment,
  type KaitenInboxNewPersonalMention,
  syncOrderChatInboxFromKaitenComments,
} from "@/lib/order-chat-inbox-db";
import { mapParsedKaitenCommentsForTriggerSync } from "@/lib/order-chat-trigger-author";

/** Не слать TG по историческому бэкофиллу: только комментарии младше этого окна. */
const KAITEN_MENTION_TG_FRESH_MS = 45 * 60 * 1000;

function isFreshKaitenMentionForTelegram(created?: string): boolean {
  if (!created?.trim()) return false;
  const t = Date.parse(created);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= KAITEN_MENTION_TG_FRESH_MS;
}

async function notifyFreshExternalInboxMentions(opts: {
  prisma: PrismaClient;
  tenantId: string;
  orderId: string;
  mentions: readonly KaitenInboxNewPersonalMention[];
}): Promise<void> {
  const fresh = opts.mentions.filter(
    (m) => !m.isCrm && isFreshKaitenMentionForTelegram(m.created),
  );
  if (fresh.length === 0) return;

  const order = await opts.prisma.order.findFirst({
    where: { id: opts.orderId, tenantId: opts.tenantId },
    select: { orderNumber: true, kaitenCardId: true },
  });
  if (!order) return;

  for (const m of fresh) {
    await notifyTelegramForKanbanChatMentions({
      actorUserId: null,
      tenantId: opts.tenantId,
      orderId: opts.orderId,
      orderNumber: order.orderNumber,
      kaitenCardId: order.kaitenCardId,
      text: m.text,
      siteOrigin: null,
    });
  }
}

export type KaitenParsedCommentForIngest = {
  id: number;
  text: string;
  created?: string;
  authorName?: string | null;
  parentId?: number | null;
  isCrm?: boolean;
  crmDraftId?: string | null;
};

export type IngestKaitenCommentsForOrderInput = {
  prisma: PrismaClient;
  tenantId: string;
  orderId: string;
  parsed: readonly KaitenParsedCommentForIngest[];
  kanbanAdminMentionTag?: string | null;
  /** Пропустить импорт «!!!» (например, если уже создан локально при POST). */
  skipCorrections?: boolean;
  skipProsthetics?: boolean;
  skipLabMention?: boolean;
  skipKanbanMirror?: boolean;
};

export type IngestKaitenCommentsForOrderResult = {
  labMentionDbChanged: boolean;
  kanbanMirrorChanged: boolean;
};

export type IngestCrmKanbanCommentForOrderInput = {
  prisma: PrismaClient;
  tenantId?: string;
  orderId: string;
  commentText: string;
  authorLabel?: string | null;
  kanbanAdminMentionTag?: string | null;
  crmDraftId?: string | null;
  syncState?: "PENDING_EXTERNAL" | "SYNCED_EXTERNAL" | "LOCAL_ONLY" | "FAILED_EXTERNAL";
  /** Id из Kaiten после отправки CRM-комментария — только waterline, без второго bump. */
  kaitenCommentIdForWaterline?: number | null;
};

export type IngestCrmKanbanCommentForOrderResult = {
  labMentionDbChanged: boolean;
  waterlineAdvanced: boolean;
};

export function kaitenParsedCommentsToKanbanSyncRows(
  parsed: readonly KaitenParsedCommentForIngest[],
): KaitenCommentForSync[] {
  return parsed.map((c) => ({
    id: c.id,
    text: c.text,
    created: c.created,
    authorName: c.authorName ?? undefined,
    parentId: c.parentId ?? null,
    isCrm: c.isCrm === true,
    crmDraftId: c.crmDraftId ?? null,
  }));
}

/** Kaiten REST → корректировки/протетика/упоминание лаборатории в заказах + mirror в tenant kanban state. */
export async function ingestKaitenCommentsForOrder(
  input: IngestKaitenCommentsForOrderInput,
): Promise<IngestKaitenCommentsForOrderResult> {
  const orderId = input.orderId.trim();
  const tenantId = input.tenantId.trim();
  if (!orderId || !tenantId || input.parsed.length === 0) {
    return { labMentionDbChanged: false, kanbanMirrorChanged: false };
  }

  const triggerComments = mapParsedKaitenCommentsForTriggerSync(input.parsed);

  if (!input.skipCorrections) {
    await syncOrderChatCorrectionsFromKaitenComments(
      input.prisma,
      orderId,
      triggerComments,
    );
  }
  if (!input.skipProsthetics) {
    await syncOrderProstheticsRequestsFromKaitenComments(
      input.prisma,
      orderId,
      triggerComments,
    );
  }

  let labMentionDbChanged = false;
  if (!input.skipLabMention) {
    labMentionDbChanged = await syncKaitenLabMentionFromParsedComments(
      input.prisma,
      orderId,
      triggerComments,
      input.kanbanAdminMentionTag,
    );
  }

  const inbox = await syncOrderChatInboxFromKaitenComments(input.prisma, {
    tenantId,
    orderId,
    comments: input.parsed,
    kanbanAdminMentionTag: input.kanbanAdminMentionTag,
  });
  try {
    await notifyFreshExternalInboxMentions({
      prisma: input.prisma,
      tenantId,
      orderId,
      mentions: inbox?.newPersonalMentions ?? [],
    });
  } catch (e) {
    console.error("[kaiten-comments-ingest] mention tg", orderId, e);
  }

  let kanbanMirrorChanged = false;
  if (!input.skipKanbanMirror) {
    const mirror = await syncKaitenCommentsIntoKanbanState({
      tenantId,
      orderId,
      comments: kaitenParsedCommentsToKanbanSyncRows(input.parsed),
    });
    kanbanMirrorChanged = mirror.changed;
  }

  return { labMentionDbChanged, kanbanMirrorChanged };
}

/** CRM POST канбана: немедленный сигнал @lab в заказах; waterline — после id Kaiten. */
export async function ingestCrmKanbanCommentForOrder(
  input: IngestCrmKanbanCommentForOrderInput,
): Promise<IngestCrmKanbanCommentForOrderResult> {
  const orderId = input.orderId.trim();
  if (!orderId) {
    return { labMentionDbChanged: false, waterlineAdvanced: false };
  }

  const labMentionDbChanged = await syncCrmLabMentionFromCommentText(
    input.prisma,
    orderId,
    input.commentText,
    input.authorLabel,
    input.kanbanAdminMentionTag,
  );

  const tenantId = String(input.tenantId || "").trim();
  const crmDraftId = String(input.crmDraftId || "").trim();
  if (tenantId && crmDraftId) {
    await createOrderChatInboxItemsFromCrmComment(input.prisma, {
      tenantId,
      orderId,
      text: input.commentText,
      authorLabel: input.authorLabel,
      kanbanAdminMentionTag: input.kanbanAdminMentionTag,
      crmDraftId,
      syncState: input.syncState ?? "PENDING_EXTERNAL",
      source: "DEMO_KANBAN",
    });
  }

  let waterlineAdvanced = false;
  // Waterline больше не двигаем при отправке из CRM, чтобы не пропустить
  // более старые комментарии Kaiten, которые еще не были считаны поллером.
  // Waterline будет обновлен при следующем чтении из Kaiten (readback).

  return { labMentionDbChanged, waterlineAdvanced };
}
