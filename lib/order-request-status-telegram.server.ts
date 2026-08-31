import "server-only";

import { crmPublicBaseUrl } from "@/lib/crm-public-base-url";
import { getClientsPrisma, getOrdersPrisma } from "@/lib/get-domain-prisma";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import {
  orderRequestStatusTelegramPhrase,
  type OrderRequestTelegramKind,
  type OrderRequestTelegramStatus,
} from "@/lib/order-request-status-telegram";
import { telegramHtmlLink } from "@/lib/telegram-html";
import { loadOrderKanbanTelegramMemberIds } from "@/lib/telegram-kanban-card-members.server";
import { notifyKanbanTelegramSubscribersAndTenantSharedChat } from "@/lib/telegram-kanban-notify";

export async function notifyOrderRequestStatusTelegram(opts: {
  tenantId: string;
  orderId: string;
  actorUserId: string | null;
  kind: OrderRequestTelegramKind;
  status: OrderRequestTelegramStatus;
}): Promise<void> {
  const tenantId = opts.tenantId.trim();
  const orderId = opts.orderId.trim();
  if (!tenantId || !orderId) return;
  const phrase = orderRequestStatusTelegramPhrase(opts.kind, opts.status);
  if (!phrase) return;
  const event =
    opts.kind === "correction"
      ? ("tg_order_correction_changed" as const)
      : ("tg_order_prosthetics_changed" as const);
  const [ordersPrisma, clientsPrisma] = await Promise.all([
    getOrdersPrisma(),
    getClientsPrisma(),
  ]);
  const order = await ordersPrisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: { orderNumber: true, kaitenCardTitleMirror: true },
  });
  if (!order) return;
  const base = crmPublicBaseUrl();
  const cardUrl = `${base}${kanbanOrderDeepLinkPath(orderId)}`;
  const orderPageUrl = `${base}/orders/${encodeURIComponent(orderId)}`;
  const linkLabel =
    order.kaitenCardTitleMirror?.trim() || `Наряд №${order.orderNumber}`;
  const linkHtml = telegramHtmlLink(cardUrl, linkLabel);
  const cardWord = telegramHtmlLink(cardUrl, "карточке");
  const orderWord = telegramHtmlLink(orderPageUrl, "заказе");
  const onlyUserIds = await loadOrderKanbanTelegramMemberIds(tenantId, orderId);
  await notifyKanbanTelegramSubscribersAndTenantSharedChat(clientsPrisma, {
    tenantId,
    event,
    actorUserId: opts.actorUserId,
    onlyUserIds,
    lines: [`В ${linkHtml} ${phrase}`],
    linesAdmin: [`В ${cardWord} и ${orderWord} ${phrase}`],
    parseMode: "HTML",
  });
}
