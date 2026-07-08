import type {
  OrderChatCorrectionSource,
  PrismaClient,
  UserRole,
} from "@prisma/client";
import { textIncludesAdminLabMention } from "@/lib/kaiten-comment-parse";
import { normalizeKanbanAdminMentionTag } from "@/lib/kanban-admin-mention";
import { parseMentionUserIdsFromText } from "@/lib/kanban-comment-mentions";
import { isOrderChatCorrectionTrigger } from "@/lib/order-chat-correction";
import { isOrderProstheticsRequestTrigger } from "@/lib/order-prosthetics-request";
import { trimOrderChatAuthorLabel } from "@/lib/order-chat-trigger-author";

type ChatInboxType = "CORRECTION" | "PROSTHETICS" | "LAB_MENTION" | "USER_MENTION";
type ChatInboxSyncState = "PENDING_EXTERNAL" | "SYNCED_EXTERNAL" | "LOCAL_ONLY" | "FAILED_EXTERNAL";

const ADMIN_ROLES: UserRole[] = ["ADMINISTRATOR", "SENIOR_ADMINISTRATOR"];

function detectChatInboxTypes(
  text: string,
  kanbanAdminMentionTag: string | null | undefined,
): ChatInboxType[] {
  const out: ChatInboxType[] = [];
  if (isOrderChatCorrectionTrigger(text)) out.push("CORRECTION");
  if (isOrderProstheticsRequestTrigger(text)) out.push("PROSTHETICS");
  const labTag = normalizeKanbanAdminMentionTag(kanbanAdminMentionTag);
  if (textIncludesAdminLabMention(text, labTag)) out.push("LAB_MENTION");
  return out;
}

function userMentionDraftKey(
  baseDraft: string,
  targetUserId: string,
): string {
  return `${baseDraft}@u:${targetUserId}`;
}

async function createUserMentionInboxItems(
  db: PrismaClient,
  input: {
    tenantId: string;
    orderId: string;
    text: string;
    authorLabel?: string | null;
    crmDraftId?: string | null;
    kaitenCommentId?: number | null;
    syncState: ChatInboxSyncState;
    source: OrderChatCorrectionSource;
    kanbanAdminMentionTag?: string | null;
  },
): Promise<boolean> {
  const orderId = input.orderId.trim();
  const tenantId = input.tenantId.trim();
  if (!orderId || !tenantId) return false;

  const users = await db.user.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      mentionHandle: true,
      email: true,
      displayName: true,
      role: true,
    },
  });
  const adminTag = normalizeKanbanAdminMentionTag(input.kanbanAdminMentionTag);
  const adminUserIds = users
    .filter((u) => ADMIN_ROLES.includes(u.role))
    .map((u) => u.id);
  const mentionedIds = parseMentionUserIdsFromText(input.text, users, {
    adminMentionTag: adminTag,
    adminUserIds,
  });
  if (mentionedIds.length === 0) return false;

  const baseDraft =
    String(input.crmDraftId || "").trim() ||
    (input.kaitenCommentId != null
      ? `k:${Math.trunc(input.kaitenCommentId)}`
      : "");
  if (!baseDraft) return false;

  const authorLabel = trimOrderChatAuthorLabel(input.authorLabel);
  let changed = false;
  for (const targetUserId of mentionedIds) {
    const draftKey = userMentionDraftKey(baseDraft, targetUserId);
    await (db as any).orderChatInboxItem.upsert({
      where: {
        orderId_type_crmDraftId: {
          orderId,
          type: "USER_MENTION",
          crmDraftId: draftKey,
        },
      },
      create: {
        tenantId,
        orderId,
        type: "USER_MENTION",
        source: input.source,
        text: input.text,
        authorLabel,
        crmDraftId: draftKey,
        kaitenCommentId: input.kaitenCommentId ?? null,
        syncState: input.syncState,
        targetUserId,
      },
      update: {
        text: input.text,
        authorLabel,
        syncState: input.syncState,
        targetUserId,
        kaitenCommentId: input.kaitenCommentId ?? null,
      },
    });
    changed = true;
  }
  return changed;
}

export async function createOrderChatInboxItemsFromCrmComment(
  db: PrismaClient,
  input: {
    tenantId: string;
    orderId: string;
    text: string;
    authorLabel?: string | null;
    kanbanAdminMentionTag?: string | null;
    crmDraftId: string;
    syncState: ChatInboxSyncState;
    source?: OrderChatCorrectionSource;
  },
): Promise<boolean> {
  const orderId = input.orderId.trim();
  const tenantId = input.tenantId.trim();
  const crmDraftId = String(input.crmDraftId || "").trim();
  if (!orderId || !tenantId || !crmDraftId) return false;
  const types = detectChatInboxTypes(input.text, input.kanbanAdminMentionTag);
  const authorLabel = trimOrderChatAuthorLabel(input.authorLabel);
  const source = input.source ?? "DEMO_KANBAN";
  let changed = false;
  for (const type of types) {
    await (db as any).orderChatInboxItem.upsert({
      where: {
        orderId_type_crmDraftId: { orderId, type, crmDraftId },
      },
      create: {
        tenantId,
        orderId,
        type,
        source,
        text: input.text,
        authorLabel,
        crmDraftId,
        syncState: input.syncState,
      },
      update: {
        text: input.text,
        authorLabel,
        syncState: input.syncState,
      },
    });
    changed = true;
  }
  const userChanged = await createUserMentionInboxItems(db, {
    tenantId,
    orderId,
    text: input.text,
    authorLabel,
    crmDraftId,
    syncState: input.syncState,
    source,
    kanbanAdminMentionTag: input.kanbanAdminMentionTag,
  });
  return changed || userChanged;
}

export async function bindOrderChatInboxItemsByCrmDraft(
  db: PrismaClient,
  input: {
    orderId: string;
    crmDraftId: string;
    kaitenCommentId: number;
  },
): Promise<boolean> {
  const orderId = input.orderId.trim();
  const draft = String(input.crmDraftId || "").trim();
  const kaitenCommentId = Math.trunc(input.kaitenCommentId);
  if (!orderId || !draft || !Number.isFinite(kaitenCommentId) || kaitenCommentId <= 0) {
    return false;
  }
  const upd = await (db as any).orderChatInboxItem.updateMany({
    where: {
      orderId,
      crmDraftId: draft,
      kaitenCommentId: null,
    },
    data: {
      kaitenCommentId,
      syncState: "SYNCED_EXTERNAL",
    },
  });
  return upd.count > 0;
}

export async function markOrderChatInboxDraftSyncFailed(
  db: PrismaClient,
  input: { orderId: string; crmDraftId: string },
): Promise<boolean> {
  const orderId = input.orderId.trim();
  const draft = String(input.crmDraftId || "").trim();
  if (!orderId || !draft) return false;
  const upd = await (db as any).orderChatInboxItem.updateMany({
    where: {
      orderId,
      crmDraftId: draft,
      syncState: "PENDING_EXTERNAL",
      kaitenCommentId: null,
    },
    data: { syncState: "FAILED_EXTERNAL" },
  });
  return upd.count > 0;
}

/** Записать персональные USER_MENTION при отправке комментария (триггер POST, не фон). */
export async function recordUserMentionsFromOrderComment(
  db: PrismaClient,
  input: {
    tenantId: string;
    orderId: string;
    text: string;
    authorLabel?: string | null;
    crmDraftId?: string | null;
    kaitenCommentId?: number | null;
    syncState: ChatInboxSyncState;
    source: OrderChatCorrectionSource;
    kanbanAdminMentionTag?: string | null;
  },
): Promise<boolean> {
  return createUserMentionInboxItems(db, input);
}

export async function syncOrderChatInboxFromKaitenComments(
  db: PrismaClient,
  input: {
    tenantId: string;
    orderId: string;
    comments: ReadonlyArray<{
      id: number;
      text: string;
      authorName?: string | null;
      crmDraftId?: string | null;
    }>;
    kanbanAdminMentionTag?: string | null;
  },
): Promise<boolean> {
  const tenantId = input.tenantId.trim();
  const orderId = input.orderId.trim();
  if (!tenantId || !orderId || input.comments.length === 0) return false;
  let changed = false;

  for (const c of input.comments) {
    const kaitenCommentId = Math.trunc(c.id);
    if (!Number.isFinite(kaitenCommentId) || kaitenCommentId <= 0) continue;
    const authorLabel = trimOrderChatAuthorLabel(c.authorName);
    const crmDraftId = String(c.crmDraftId || "").trim() || null;

    const userMentionChanged = await createUserMentionInboxItems(db, {
      tenantId,
      orderId,
      text: c.text,
      authorLabel,
      crmDraftId: crmDraftId ?? undefined,
      kaitenCommentId,
      syncState: "SYNCED_EXTERNAL",
      source: "KAITEN",
      kanbanAdminMentionTag: input.kanbanAdminMentionTag,
    });
    if (userMentionChanged) changed = true;

    const types = detectChatInboxTypes(c.text, input.kanbanAdminMentionTag);
    if (types.length === 0) continue;

    for (const type of types) {
      if (crmDraftId) {
        const bound = await (db as any).orderChatInboxItem.updateMany({
          where: {
            orderId,
            type,
            crmDraftId,
            kaitenCommentId: null,
          },
          data: {
            kaitenCommentId,
            syncState: "SYNCED_EXTERNAL",
            text: c.text,
            authorLabel,
          },
        });
        if (bound.count > 0) {
          changed = true;
          continue;
        }
      }

      await (db as any).orderChatInboxItem.upsert({
        where: {
          orderId_type_kaitenCommentId: { orderId, type, kaitenCommentId },
        },
        create: {
          tenantId,
          orderId,
          type,
          source: "KAITEN",
          text: c.text,
          authorLabel,
          kaitenCommentId,
          crmDraftId,
          syncState: "SYNCED_EXTERNAL",
        },
        update: {
          text: c.text,
          authorLabel,
          crmDraftId,
          syncState: "SYNCED_EXTERNAL",
        },
      });
      changed = true;
    }
  }

  return changed;
}
