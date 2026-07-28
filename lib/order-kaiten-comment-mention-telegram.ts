import "server-only";

import { notifyTelegramForKanbanChatMentions } from "@/lib/kanban-chat-mention-telegram.server";

/** После комментария в чате наряда через Kaiten API: Telegram тем, кто @упомянут в CRM. */
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
  await notifyTelegramForKanbanChatMentions({
    sessionDemo: opts.sessionDemo,
    actorUserId: opts.actorUserId,
    tenantId: opts.tenantId,
    orderId: opts.orderId,
    orderNumber: opts.orderNumber,
    kaitenCardId: opts.kaitenCardId,
    text: opts.text,
    siteOrigin: opts.siteOrigin,
  });
}
