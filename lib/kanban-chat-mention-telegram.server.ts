import "server-only";

import {
  parseMentionUserIdsFromText,
  textIncludesMentionToken,
} from "@/lib/kanban-comment-mentions";
import {
  isKanbanLabMentionNotifyRole,
  normalizeKanbanAdminMentionTag,
} from "@/lib/kanban-admin-mention";
import {
  buildKanbanMentionInCommentTelegramHtmlLines,
  telegramMentionCommentQuote,
} from "@/lib/kanban-mention-telegram-html";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { normalizeProductionMentionTag } from "@/lib/kanban-production-mention-tag";
import { crmPublicBaseUrl } from "@/lib/crm-public-base-url";
import { getPrisma } from "@/lib/get-prisma";
import { loadOrderKanbanTelegramMemberIds } from "@/lib/telegram-kanban-card-members.server";
import {
  notifyKanbanTelegramSubscribers,
  notifyKanbanTelegramTargetUsers,
} from "@/lib/telegram-kanban-notify";
import { escapeTelegramHtml, telegramHtmlLink } from "@/lib/telegram-html";
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
  actorUserId: string | null;
  tenantId: string;
  orderId: string;
  orderNumber: string;
  kaitenCardId?: number | null;
  text: string;
  siteOrigin: string | null;
  productionMentionTag?: string | null;
}): Promise<string[]> {
  if (opts.sessionDemo) return [];

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
    .filter((u) => isKanbanLabMentionNotifyRole(u.role))
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
  });

  if (!mentionedAll.length) {
    console.warn("[kanban-chat-mention-tg] skip: no mentioned users", {
      orderId: opts.orderId,
      textSnippet: opts.text.slice(0, 80),
    });
    return [];
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

  const actor = opts.actorUserId
    ? await prisma.user.findUnique({
        where: { id: opts.actorUserId },
        select: { displayName: true, mentionHandle: true, email: true },
      })
    : null;

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
    commentText: opts.text,
  };
  const lines = buildKanbanMentionInCommentTelegramHtmlLines(mentionCtx);
  console.info("[kanban-chat-mention-tg] built", {
    orderId: opts.orderId,
    commentChars: (opts.text || "").trim().length,
    lineCount: lines.length,
  });

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

  const initiatorId = String(opts.actorUserId || "").trim();
  const actionContext = initiatorId
    ? {
        initiatorUserId: initiatorId,
        chatUrl: kanbanCardAbsoluteUrl,
        orderId: opts.orderId,
      }
    : null;

  if (prodTargets.length > 0) {
    await notifyKanbanTelegramTargetUsers(prisma, {
      event: "tg_production_mentioned",
      // Групповой @production — автору не дублируем; личный @себя — ниже.
      actorUserId: opts.actorUserId,
      targetUserIds: prodTargets,
      lines,
      parseMode: "HTML",
      tenantId: opts.tenantId,
      // ЛС ок; общий админ-чат даёт второй push «упомянул вас» тем же ботом.
      skipTenantSharedChat: true,
      actionContext,
    });
  }

  if (mentionForGeneral.length > 0) {
    await notifyKanbanTelegramTargetUsers(prisma, {
      event: "tg_mentioned_in_comment",
      alternatePrefKeys: ["tg_comment_added"],
      // Самоупоминание (@свой_тег) = напоминание себе в CRM-боте.
      actorUserId: null,
      targetUserIds: mentionForGeneral,
      lines,
      parseMode: "HTML",
      tenantId: opts.tenantId,
      skipTenantSharedChat: true,
      // Кнопки от живого автора даже при actorUserId: null (исключение из prefs).
      actionContext,
    });
  }
  return mentionedAll;
}

/** «Добавлен комментарий» — всем с галочкой, кроме автора и тех, кто уже получил @упоминание. */
export async function notifyTelegramForKanbanChatCommentAdded(opts: {
  sessionDemo?: boolean;
  actorUserId: string | null;
  tenantId: string;
  orderId: string;
  orderNumber: string;
  text: string;
  siteOrigin: string | null;
  excludeUserIds?: string[];
}): Promise<void> {
  if (opts.sessionDemo) return;
  const origin = resolveNotifySiteOrigin(opts.siteOrigin);
  const prisma = await getPrisma();
  const actor = opts.actorUserId
    ? await prisma.user.findUnique({
        where: { id: opts.actorUserId },
        select: { displayName: true, mentionHandle: true, email: true },
      })
    : null;
  const who = escapeTelegramHtml(userPersonDisplayName(actor ?? {}));
  const cardUrl = `${origin}${kanbanOrderDeepLinkPath(opts.orderId)}`;
  const orderUrl = `${origin}/orders/${encodeURIComponent(opts.orderId)}`;
  const title = (opts.orderNumber || "").trim() || "наряд";
  const cardLink = telegramHtmlLink(cardUrl, title);
  const cardWord = telegramHtmlLink(cardUrl, "карточке");
  const orderWord = telegramHtmlLink(orderUrl, "заказе");
  const quote = telegramMentionCommentQuote(opts.text);
  const snippet = quote ? escapeTelegramHtml(quote) : "";
  const tail = snippet ? `\n«${snippet}»` : "";
  const onlyUserIds = await loadOrderKanbanTelegramMemberIds(
    opts.tenantId,
    opts.orderId,
  );
  const initiatorId = String(opts.actorUserId || "").trim();
  await notifyKanbanTelegramSubscribers(prisma, {
    event: "tg_comment_added",
    actorUserId: opts.actorUserId,
    alsoExcludeUserIds: opts.excludeUserIds,
    onlyUserIds,
    lines: [`${who} оставил(а) комментарий к ${cardLink}${tail}`],
    linesAdmin: [
      `${who} оставил(а) комментарий к ${cardWord} и ${orderWord}${tail}`,
    ],
    parseMode: "HTML",
    actionContext: initiatorId
      ? {
          initiatorUserId: initiatorId,
          chatUrl: cardUrl,
          orderId: opts.orderId,
        }
      : null,
  });
}
