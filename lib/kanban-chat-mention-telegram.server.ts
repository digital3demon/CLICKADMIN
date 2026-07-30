import "server-only";

import {
  parseMentionUserIdsFromText,
  textIncludesMentionToken,
} from "@/lib/kanban-comment-mentions";
import {
  isKanbanAdminGroupRole,
  normalizeKanbanAdminMentionTag,
} from "@/lib/kanban-admin-mention";
import { buildKanbanMentionInCommentTelegramHtmlLine } from "@/lib/kanban-mention-telegram-html";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { normalizeProductionMentionTag } from "@/lib/kanban-production-mention-tag";
import { crmPublicBaseUrl } from "@/lib/crm-public-base-url";
import { getPrisma } from "@/lib/get-prisma";
import { notifyKanbanTelegramTargetUsers } from "@/lib/telegram-kanban-notify";
import { userPersonDisplayName } from "@/lib/user-activity-display-label";

function resolveNotifySiteOrigin(primary: string | null | undefined): string {
  const fromRequest = primary?.trim();
  if (fromRequest) return fromRequest.replace(/\/+$/, "");
  const fromEnv =
    process.env.CRM_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  // Всегда есть база для ссылок — иначе раньше молча не слали TG.
  return crmPublicBaseUrl().replace(/\/+$/, "");
}

/** Telegram @упоминания после комментария в CRM-канбане (чат наряда / модалка карточки). */
export async function notifyTelegramForKanbanChatMentions(opts: {
  sessionDemo?: boolean;
  actorUserId: string;
  tenantId: string;
  orderId: string;
  orderNumber: string;
  kaitenCardId?: number | null;
  text: string;
  siteOrigin: string | null;
  productionMentionTag?: string | null;
}): Promise<void> {
  if (opts.sessionDemo) return;

  const origin = resolveNotifySiteOrigin(opts.siteOrigin);

  const prisma = await getPrisma();
  const users = await prisma.user.findMany({
    where: { isActive: true, tenantId: opts.tenantId },
    select: {
      id: true,
      mentionHandle: true,
      email: true,
      displayName: true,
      role: true,
      telegramId: true,
    },
  });

  const tenantRow = await prisma.tenant.findUnique({
    where: { id: opts.tenantId },
    select: { kanbanAdminMentionTag: true },
  });
  const adminTag = normalizeKanbanAdminMentionTag(
    tenantRow?.kanbanAdminMentionTag,
  );
  const adminUserIds = users
    .filter((u) => isKanbanAdminGroupRole(u.role))
    .map((u) => u.id);

  const prodTag =
    opts.productionMentionTag != null
      ? normalizeProductionMentionTag(opts.productionMentionTag)
      : null;
  const productionUserIds = users
    .filter((u) => u.role === "PRODUCTION" || u.role === "SENIOR_PRODUCTION")
    .map((u) => u.id);

  const mentionedAll = parseMentionUserIdsFromText(opts.text, users, {
    adminMentionTag: adminTag,
    adminUserIds,
    productionMentionTag: prodTag ?? undefined,
    productionUserIds,
  }).filter((id) => id !== opts.actorUserId);

  if (!mentionedAll.length) {
    console.warn("[kanban-chat-mention-tg] skip: no mentioned users", {
      orderId: opts.orderId,
      textSnippet: opts.text.slice(0, 80),
    });
    return;
  }

  const withTelegram = mentionedAll.filter((id) => {
    const u = users.find((x) => x.id === id);
    return Boolean(u?.telegramId?.trim());
  });
  if (!withTelegram.length) {
    console.warn("[kanban-chat-mention-tg] skip: mentioned users have no telegramId", {
      orderId: opts.orderId,
      mentioned: mentionedAll,
    });
  }

  const actor = await prisma.user.findUnique({
    where: { id: opts.actorUserId },
    select: { displayName: true, mentionHandle: true, email: true },
  });

  const kanbanCardAbsoluteUrl = `${origin}${kanbanOrderDeepLinkPath(opts.orderId)}`;
  const orderPageAbsoluteUrl = `${origin}/orders/${encodeURIComponent(opts.orderId)}`;

  const mentionCtx = {
    actorDisplayName: userPersonDisplayName(actor ?? {}),
    actorMentionHandle: actor?.mentionHandle ?? null,
    linkedOrderId: opts.orderId,
    orderNumberLabel: opts.orderNumber,
    kaitenCardId: opts.kaitenCardId ?? null,
    kanbanCardAbsoluteUrl,
    orderPageAbsoluteUrl,
  };
  const line = buildKanbanMentionInCommentTelegramHtmlLine(mentionCtx);

  const hasProductionTag =
    Boolean(prodTag) &&
    productionUserIds.length > 0 &&
    textIncludesMentionToken(opts.text, prodTag!);
  const prodTargets = hasProductionTag
    ? productionUserIds.filter((id) => id !== opts.actorUserId)
    : [];
  const mentionForGeneral = mentionedAll.filter(
    (id) => !(hasProductionTag && prodTargets.includes(id)),
  );

  if (prodTargets.length > 0) {
    await notifyKanbanTelegramTargetUsers(prisma, {
      event: "tg_production_mentioned",
      actorUserId: opts.actorUserId,
      targetUserIds: prodTargets,
      lines: [line],
      parseMode: "HTML",
      tenantId: opts.tenantId,
    });
  }

  if (mentionForGeneral.length > 0) {
    await notifyKanbanTelegramTargetUsers(prisma, {
      event: "tg_mentioned_in_comment",
      alternatePrefKeys: ["tg_comment_added"],
      actorUserId: opts.actorUserId,
      targetUserIds: mentionForGeneral,
      lines: [line],
      parseMode: "HTML",
      tenantId: opts.tenantId,
    });
  }
}
