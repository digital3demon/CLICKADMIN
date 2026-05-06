import "server-only";

import { parseMentionUserIdsFromText } from "@/lib/kanban-comment-mentions";
import {
  isKanbanAdminGroupRole,
  normalizeKanbanAdminMentionTag,
} from "@/lib/kanban-admin-mention";
import { buildKanbanMentionInCommentTelegramHtmlLine } from "@/lib/kanban-mention-telegram-html";
import { getPrisma } from "@/lib/get-prisma";
import { notifyKanbanTelegramTargetUsers } from "@/lib/telegram-kanban-notify";
import { userPersonDisplayName } from "@/lib/user-activity-display-label";

/** После комментария в чате наряда (Kaiten): Telegram тем, кто в тексте @упомянут. */
export async function notifyTelegramForMentionsInOrderKaitenComment(opts: {
  sessionDemo?: boolean;
  actorUserId: string;
  tenantId: string;
  orderId: string;
  orderNumber: string;
  kaitenCardId: number;
  text: string;
  siteOrigin: string | null;
}): Promise<void> {
  if (opts.sessionDemo || !opts.siteOrigin?.trim()) return;

  const prisma = await getPrisma();
  const users = await prisma.user.findMany({
    where: { isActive: true, tenantId: opts.tenantId },
    select: {
      id: true,
      mentionHandle: true,
      email: true,
      displayName: true,
      role: true,
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

  const mentioned = parseMentionUserIdsFromText(opts.text, users, {
    adminMentionTag: adminTag,
    adminUserIds,
  }).filter((id) => id !== opts.actorUserId);

  if (!mentioned.length) return;

  const actor = await prisma.user.findUnique({
    where: { id: opts.actorUserId },
    select: { displayName: true, mentionHandle: true, email: true },
  });

  const origin = opts.siteOrigin.replace(/\/+$/, "");
  const kanbanCardAbsoluteUrl = `${origin}/kanban?${new URLSearchParams({
    card: `kaiten-order-${opts.orderId}`,
  }).toString()}`;
  const orderPageAbsoluteUrl = `${origin}/orders/${encodeURIComponent(opts.orderId)}`;

  const line = buildKanbanMentionInCommentTelegramHtmlLine({
    actorDisplayName: userPersonDisplayName(actor ?? {}),
    actorMentionHandle: actor?.mentionHandle ?? null,
    linkedOrderId: opts.orderId,
    orderNumberLabel: opts.orderNumber,
    kaitenCardId: opts.kaitenCardId,
    kanbanCardAbsoluteUrl,
    orderPageAbsoluteUrl,
  });

  await notifyKanbanTelegramTargetUsers(prisma, {
    event: "tg_mentioned_in_comment",
    alternatePrefKeys: ["tg_comment_added"],
    actorUserId: opts.actorUserId,
    targetUserIds: mentioned,
    lines: [line],
    parseMode: "HTML",
    tenantId: opts.tenantId,
  });
}
