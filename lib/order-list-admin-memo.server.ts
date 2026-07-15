import type { PrismaClient } from "@prisma/client";
import {
  normalizeOrderListAdminMemoInput,
  type OrderListAdminMemoHistoryRow,
} from "@/lib/order-list-admin-memo";
import { userPersonDisplayName } from "@/lib/user-activity-display-label";

export async function fetchOrderListAdminMemoHistory(
  db: PrismaClient,
  orderId: string,
  tenantId: string,
  limit = 40,
): Promise<OrderListAdminMemoHistoryRow[]> {
  const order = await db.order.findFirst({
    where: { id: orderId, tenantId },
    select: { id: true },
  });
  if (!order) return [];

  const rows = await db.orderListAdminMemoEvent.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      text: true,
      authorLabel: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    text: r.text,
    authorLabel: r.authorLabel,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function applyOrderListAdminMemo(
  db: PrismaClient,
  opts: {
    orderId: string;
    tenantId: string;
    userId: string;
    text: string | null | undefined;
  },
): Promise<{ memo: string | null; changed: boolean }> {
  const nextMemo = normalizeOrderListAdminMemoInput(opts.text);
  const user = await db.user.findFirst({
    where: { id: opts.userId, tenantId: opts.tenantId },
    select: {
      id: true,
      displayName: true,
      email: true,
      mentionHandle: true,
    },
  });
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const authorLabel = userPersonDisplayName(user);

  return db.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: opts.orderId, tenantId: opts.tenantId },
      select: { id: true, listAdminMemo: true },
    });
    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    const prev = normalizeOrderListAdminMemoInput(order.listAdminMemo);
    if (prev === nextMemo) {
      return { memo: nextMemo, changed: false };
    }

    await tx.order.update({
      where: { id: order.id },
      data: { listAdminMemo: nextMemo },
    });

    await tx.orderListAdminMemoEvent.create({
      data: {
        orderId: order.id,
        action: nextMemo ? "SET" : "CLEAR",
        text: nextMemo,
        userId: user.id,
        authorLabel,
      },
    });

    return { memo: nextMemo, changed: true };
  });
}
