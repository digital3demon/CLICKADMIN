import type { PrismaClient } from "@prisma/client";
import {
  normalizeOrderListTechMemoInput,
  type OrderListTechMemoHistoryRow,
} from "@/lib/order-list-tech-memo";
import { userPersonDisplayName } from "@/lib/user-activity-display-label";

export async function fetchOrderListTechMemoHistory(
  db: PrismaClient,
  orderId: string,
  tenantId: string,
  limit = 40,
): Promise<OrderListTechMemoHistoryRow[]> {
  const order = await db.order.findFirst({
    where: { id: orderId, tenantId },
    select: { id: true },
  });
  if (!order) return [];

  const rows = await db.orderListTechMemoEvent.findMany({
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

export async function applyOrderListTechMemo(
  db: PrismaClient,
  opts: {
    orderId: string;
    tenantId: string;
    userId: string;
    text: string | null | undefined;
  },
): Promise<{ memo: string | null; changed: boolean }> {
  const nextMemo = normalizeOrderListTechMemoInput(opts.text);
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
      select: { id: true, listTechMemo: true },
    });
    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    const prev = normalizeOrderListTechMemoInput(order.listTechMemo);
    if (prev === nextMemo) {
      return { memo: nextMemo, changed: false };
    }

    await tx.order.update({
      where: { id: order.id },
      data: { listTechMemo: nextMemo },
    });

    await tx.orderListTechMemoEvent.create({
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
