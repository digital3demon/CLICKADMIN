import type { OrderChatCorrectionSource, PrismaClient } from "@prisma/client";
import { textIncludesAdminLabMention } from "@/lib/kaiten-comment-parse";
import {
  isKanbanLabMentionNotifyRole,
  normalizeKanbanAdminMentionTag,
} from "@/lib/kanban-admin-mention";
import { parseMentionUserIdsFromText } from "@/lib/kanban-comment-mentions";
import { isOrderChatCorrectionTrigger } from "@/lib/order-chat-correction";
import { orderChatCorrectionTwinTexts } from "@/lib/order-chat-correction-db";
import {
  isOrderProstheticsRequestTrigger,
  normalizeProstheticsTwinKey,
} from "@/lib/order-prosthetics-request";
import { trimOrderChatAuthorLabel } from "@/lib/order-chat-trigger-author";

type ChatInboxType = "CORRECTION" | "PROSTHETICS" | "LAB_MENTION" | "USER_MENTION";
type ChatInboxSyncState = "PENDING_EXTERNAL" | "SYNCED_EXTERNAL" | "LOCAL_ONLY" | "FAILED_EXTERNAL";

type ClosedChatTwinFields = {
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
  rejectedAt: Date | null;
  rejectedByUserId: string | null;
  orderedAt?: Date | null;
  orderedByUserId?: string | null;
  arrivedAt?: Date | null;
  arrivedByUserId?: string | null;
  checkedAt?: Date | null;
  checkedByUserId?: string | null;
  completedAt?: Date | null;
  completedByUserId?: string | null;
};

function isClosedChatTwin(row: {
  resolvedAt: Date | null;
  rejectedAt: Date | null;
  completedAt?: Date | null;
}): boolean {
  return (
    row.resolvedAt != null ||
    row.rejectedAt != null ||
    row.completedAt != null
  );
}

function closedTwinWriteData(row: ClosedChatTwinFields) {
  return {
    resolvedAt: row.resolvedAt,
    resolvedByUserId: row.resolvedByUserId,
    rejectedAt: row.rejectedAt,
    rejectedByUserId: row.rejectedByUserId,
    ...(row.orderedAt !== undefined ? { orderedAt: row.orderedAt } : {}),
    ...(row.orderedByUserId !== undefined
      ? { orderedByUserId: row.orderedByUserId }
      : {}),
    ...(row.arrivedAt !== undefined ? { arrivedAt: row.arrivedAt } : {}),
    ...(row.arrivedByUserId !== undefined
      ? { arrivedByUserId: row.arrivedByUserId }
      : {}),
    ...(row.checkedAt !== undefined ? { checkedAt: row.checkedAt } : {}),
    ...(row.checkedByUserId !== undefined
      ? { checkedByUserId: row.checkedByUserId }
      : {}),
    ...(row.completedAt !== undefined ? { completedAt: row.completedAt } : {}),
    ...(row.completedByUserId !== undefined
      ? { completedByUserId: row.completedByUserId }
      : {}),
  };
}

async function findClosedLegacyChatTwin(
  db: PrismaClient,
  orderId: string,
  type: "CORRECTION" | "PROSTHETICS",
  text: string,
  kaitenCommentId: number,
): Promise<ClosedChatTwinFields | null> {
  if (type === "CORRECTION") {
    const variants = orderChatCorrectionTwinTexts(text);
    const byKid = await db.orderChatCorrection.findFirst({
      where: {
        orderId,
        kaitenCommentId,
        OR: [{ resolvedAt: { not: null } }, { rejectedAt: { not: null } }],
      },
      select: {
        resolvedAt: true,
        resolvedByUserId: true,
        rejectedAt: true,
        rejectedByUserId: true,
      },
    });
    if (byKid) return byKid;
    return db.orderChatCorrection.findFirst({
      where: {
        orderId,
        text: { in: variants },
        kaitenCommentId: null,
        OR: [{ resolvedAt: { not: null } }, { rejectedAt: { not: null } }],
      },
      orderBy: { createdAt: "asc" },
      select: {
        resolvedAt: true,
        resolvedByUserId: true,
        rejectedAt: true,
        rejectedByUserId: true,
      },
    });
  }

  const key = normalizeProstheticsTwinKey(text);
  const closedWhere = {
    orderId,
    OR: [
      { resolvedAt: { not: null } },
      { rejectedAt: { not: null } },
      { completedAt: { not: null } },
    ],
  };
  const byKid = await db.orderProstheticsRequest.findFirst({
    where: { ...closedWhere, kaitenCommentId },
    select: {
      resolvedAt: true,
      resolvedByUserId: true,
      rejectedAt: true,
      rejectedByUserId: true,
      orderedAt: true,
      orderedByUserId: true,
      arrivedAt: true,
      arrivedByUserId: true,
      checkedAt: true,
      checkedByUserId: true,
      completedAt: true,
      completedByUserId: true,
    },
  });
  if (byKid) return byKid;
  if (!key) return null;
  const rows = await db.orderProstheticsRequest.findMany({
    where: { ...closedWhere, kaitenCommentId: null },
    orderBy: { createdAt: "asc" },
    take: 80,
    select: {
      text: true,
      resolvedAt: true,
      resolvedByUserId: true,
      rejectedAt: true,
      rejectedByUserId: true,
      orderedAt: true,
      orderedByUserId: true,
      arrivedAt: true,
      arrivedByUserId: true,
      checkedAt: true,
      checkedByUserId: true,
      completedAt: true,
      completedByUserId: true,
    },
  });
  return (
    rows.find((r) => normalizeProstheticsTwinKey(r.text) === key) ?? null
  );
}

async function findClosedInboxTextTwin(
  db: PrismaClient,
  orderId: string,
  type: "CORRECTION" | "PROSTHETICS",
  text: string,
): Promise<{ id: string } & ClosedChatTwinFields | null> {
  const rows = (await (db as any).orderChatInboxItem.findMany({
    where: {
      orderId,
      type,
      kaitenCommentId: null,
      OR: [
        { resolvedAt: { not: null } },
        { rejectedAt: { not: null } },
        { completedAt: { not: null } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 80,
    select: {
      id: true,
      text: true,
      resolvedAt: true,
      resolvedByUserId: true,
      rejectedAt: true,
      rejectedByUserId: true,
      orderedAt: true,
      orderedByUserId: true,
      arrivedAt: true,
      arrivedByUserId: true,
      checkedAt: true,
      checkedByUserId: true,
      completedAt: true,
      completedByUserId: true,
    },
  })) as Array<{ id: string; text: string } & ClosedChatTwinFields>;
  if (type === "CORRECTION") {
    const variants = new Set(orderChatCorrectionTwinTexts(text));
    return rows.find((r) => variants.has(r.text.trim())) ?? null;
  }
  const key = normalizeProstheticsTwinKey(text);
  if (!key) return null;
  return rows.find((r) => normalizeProstheticsTwinKey(r.text) === key) ?? null;
}

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

/** Строки inbox, привязанные к CRM draft (в т.ч. USER_MENTION с суффиксом @u:). */
function orderChatInboxRowsForCrmDraftWhere(
  orderId: string,
  draft: string,
  extra?: Record<string, unknown>,
) {
  return {
    orderId,
    ...extra,
    OR: [{ crmDraftId: draft }, { crmDraftId: { startsWith: `${draft}@u:` } }],
  };
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
): Promise<{ createdTargetUserIds: string[]; changed: boolean }> {
  const createdTargetUserIds: string[] = [];
  const orderId = input.orderId.trim();
  const tenantId = input.tenantId.trim();
  if (!orderId || !tenantId) return { createdTargetUserIds, changed: false };

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
    .filter((u) => isKanbanLabMentionNotifyRole(u.role))
    .map((u) => u.id);
  const mentionedIds = parseMentionUserIdsFromText(input.text, users, {
    adminMentionTag: adminTag,
    adminUserIds,
  });
  if (mentionedIds.length === 0) return { createdTargetUserIds, changed: false };

  const authorLabel = trimOrderChatAuthorLabel(input.authorLabel);
  let changed = false;
  for (const targetUserId of mentionedIds) {
    const crmDraftFromInput = String(input.crmDraftId || "").trim();
    const kaitenId =
      input.kaitenCommentId != null && Number.isFinite(input.kaitenCommentId)
        ? Math.trunc(input.kaitenCommentId)
        : null;

    // Уже есть строка с этим kaitenCommentId — только обновить, не плодить k:/cm- дубли.
    if (kaitenId != null && kaitenId > 0) {
      const byKaiten = await (db as any).orderChatInboxItem.findFirst({
        where: {
          orderId,
          type: "USER_MENTION",
          targetUserId,
          kaitenCommentId: kaitenId,
        },
        select: { id: true },
      });
      if (byKaiten?.id) {
        await (db as any).orderChatInboxItem.update({
          where: { id: byKaiten.id },
          data: {
            text: input.text,
            authorLabel,
            syncState: input.syncState,
            source: input.source,
            ...(crmDraftFromInput
              ? { crmDraftId: userMentionDraftKey(crmDraftFromInput, targetUserId) }
              : {}),
          },
        });
        changed = true;
        continue;
      }
    }

    if (crmDraftFromInput || (kaitenId != null && kaitenId > 0)) {
      const pending = await (db as any).orderChatInboxItem.findFirst({
        where: {
          orderId,
          type: "USER_MENTION",
          targetUserId,
          kaitenCommentId: null,
          crmDraftId: { endsWith: `@u:${targetUserId}` },
          NOT: { crmDraftId: { startsWith: "k:" } },
        },
        select: { id: true },
      });
      if (pending?.id) {
        await (db as any).orderChatInboxItem.update({
          where: { id: pending.id },
          data: {
            text: input.text,
            authorLabel,
            syncState: input.syncState,
            source: input.source,
            ...(crmDraftFromInput
              ? { crmDraftId: userMentionDraftKey(crmDraftFromInput, targetUserId) }
              : {}),
          },
        });
        changed = true;
        continue;
      }
    }

    const baseDraft =
      crmDraftFromInput || (kaitenId != null && kaitenId > 0 ? `k:${kaitenId}` : "");
    if (!baseDraft) continue;

    const draftKey = userMentionDraftKey(baseDraft, targetUserId);
    const existing = await (db as any).orderChatInboxItem.findUnique({
      where: {
        orderId_type_crmDraftId: {
          orderId,
          type: "USER_MENTION",
          crmDraftId: draftKey,
        },
      },
      select: { id: true },
    });
    try {
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
          // Не пишем kaitenCommentId: unique (orderId, type, kaitenCommentId)
          // иначе второй @ в том же комментарии падает с P2002.
          kaitenCommentId: null,
          syncState: input.syncState,
          targetUserId,
        },
        update: {
          text: input.text,
          authorLabel,
          syncState: input.syncState,
          targetUserId,
        },
      });
      if (!existing?.id) createdTargetUserIds.push(targetUserId);
      changed = true;
    } catch (e) {
      const code = (e as { code?: string } | null)?.code;
      if (code !== "P2002") throw e;
    }
  }
  return { createdTargetUserIds, changed };
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
  return changed || userChanged.changed;
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
      ...orderChatInboxRowsForCrmDraftWhere(orderId, draft, {
        kaitenCommentId: null,
      }),
      NOT: { type: "USER_MENTION" },
    },
    data: {
      kaitenCommentId,
      syncState: "SYNCED_EXTERNAL",
    },
  });
  const mentionUpd = await (db as any).orderChatInboxItem.updateMany({
    where: orderChatInboxRowsForCrmDraftWhere(orderId, draft, {
      type: "USER_MENTION",
    }),
    data: { syncState: "SYNCED_EXTERNAL" },
  });
  return upd.count > 0 || mentionUpd.count > 0;
}

export async function markOrderChatInboxDraftSyncFailed(
  db: PrismaClient,
  input: { orderId: string; crmDraftId: string },
): Promise<boolean> {
  const orderId = input.orderId.trim();
  const draft = String(input.crmDraftId || "").trim();
  if (!orderId || !draft) return false;
  const upd = await (db as any).orderChatInboxItem.updateMany({
    where: orderChatInboxRowsForCrmDraftWhere(orderId, draft, {
      syncState: "PENDING_EXTERNAL",
      kaitenCommentId: null,
    }),
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
  const r = await createUserMentionInboxItems(db, input);
  return r.changed;
}

export type KaitenInboxNewPersonalMention = {
  text: string;
  created?: string;
  isCrm: boolean;
  targetUserIds: string[];
};

export async function syncOrderChatInboxFromKaitenComments(
  db: PrismaClient,
  input: {
    tenantId: string;
    orderId: string;
    comments: ReadonlyArray<{
      id: number;
      text: string;
      created?: string;
      authorName?: string | null;
      crmDraftId?: string | null;
      isCrm?: boolean;
    }>;
    kanbanAdminMentionTag?: string | null;
  },
): Promise<{ changed: boolean; newPersonalMentions: KaitenInboxNewPersonalMention[] }> {
  const tenantId = input.tenantId.trim();
  const orderId = input.orderId.trim();
  if (!tenantId || !orderId || input.comments.length === 0) {
    return { changed: false, newPersonalMentions: [] };
  }
  let changed = false;
  const newPersonalMentions: KaitenInboxNewPersonalMention[] = [];

  for (const c of input.comments) {
    const kaitenCommentId = Math.trunc(c.id);
    if (!Number.isFinite(kaitenCommentId) || kaitenCommentId <= 0) continue;
    const authorLabel = trimOrderChatAuthorLabel(c.authorName);
    const crmDraftId = String(c.crmDraftId || "").trim() || null;

    const userMention = await createUserMentionInboxItems(db, {
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
    if (userMention.changed) changed = true;
    if (userMention.createdTargetUserIds.length > 0) {
      newPersonalMentions.push({
        text: c.text,
        created: c.created,
        isCrm: c.isCrm === true,
        targetUserIds: userMention.createdTargetUserIds,
      });
    }

    const types = detectChatInboxTypes(c.text, input.kanbanAdminMentionTag);
    if (types.length === 0) continue;

    for (const type of types) {
      // «???» в CRM — всегда Канбан (Kaiten→канбан→CRM); !!! / @лаб остаются KAITEN.
      const rowSource =
        type === "PROSTHETICS" ? ("DEMO_KANBAN" as const) : ("KAITEN" as const);
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
            ...(type === "PROSTHETICS" ? { source: "DEMO_KANBAN" } : {}),
          },
        });
        if (bound.count > 0) {
          changed = true;
          continue;
        }
      }

      if (type === "CORRECTION" || type === "PROSTHETICS") {
        const existingByKid = (await (db as any).orderChatInboxItem.findFirst({
          where: { orderId, type, kaitenCommentId },
          select: {
            id: true,
            resolvedAt: true,
            rejectedAt: true,
            completedAt: true,
          },
        })) as {
          id: string;
          resolvedAt: Date | null;
          rejectedAt: Date | null;
          completedAt: Date | null;
        } | null;
        const closedLegacy = await findClosedLegacyChatTwin(
          db,
          orderId,
          type,
          c.text,
          kaitenCommentId,
        );
        if (existingByKid && !isClosedChatTwin(existingByKid) && closedLegacy) {
          await (db as any).orderChatInboxItem.update({
            where: { id: existingByKid.id },
            data: {
              ...closedTwinWriteData(closedLegacy),
              text: c.text,
              authorLabel,
              crmDraftId,
              syncState: "SYNCED_EXTERNAL",
              ...(type === "PROSTHETICS" ? { source: "DEMO_KANBAN" } : {}),
            },
          });
          changed = true;
          continue;
        }
        if (!existingByKid) {
          const closedInbox = await findClosedInboxTextTwin(
            db,
            orderId,
            type,
            c.text,
          );
          if (closedInbox) {
            await (db as any).orderChatInboxItem.update({
              where: { id: closedInbox.id },
              data: {
                kaitenCommentId,
                text: c.text,
                authorLabel,
                crmDraftId,
                syncState: "SYNCED_EXTERNAL",
                ...(type === "PROSTHETICS" ? { source: "DEMO_KANBAN" } : {}),
              },
            });
            changed = true;
            continue;
          }
          if (closedLegacy) {
            await (db as any).orderChatInboxItem.create({
              data: {
                tenantId,
                orderId,
                type,
                source: rowSource,
                text: c.text,
                authorLabel,
                kaitenCommentId,
                crmDraftId,
                syncState: "SYNCED_EXTERNAL",
                ...closedTwinWriteData(closedLegacy),
              },
            });
            changed = true;
            continue;
          }
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
          source: rowSource,
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
          ...(type === "PROSTHETICS" ? { source: "DEMO_KANBAN" } : {}),
        },
      });
      changed = true;
    }
  }

  return { changed, newPersonalMentions };
}
