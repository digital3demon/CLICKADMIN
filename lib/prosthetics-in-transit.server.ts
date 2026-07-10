import "server-only";

import type { PrismaClient } from "@prisma/client";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { isOrderChatInboxReadNewEnabledForTenant } from "@/lib/order-chat-inbox-dual-read.server";
import type { ProstheticsInTransitRow } from "@/lib/prosthetics-in-transit";

export type { ProstheticsInTransitRow };

const orderScope = { archivedAt: null } as const;

/**
 * Принята («в пути»), ещё не «пришла». Dedup inbox+legacy по kaitenCommentId.
 */
export async function countProstheticsInTransit(
  db: PrismaClient,
  opts?: { tenantId?: string | null },
): Promise<number> {
  const rows = await listProstheticsInTransit(db, opts);
  return rows.length;
}

export async function listProstheticsInTransit(
  db: PrismaClient,
  opts?: { tenantId?: string | null; take?: number },
): Promise<ProstheticsInTransitRow[]> {
  const take = opts?.take ?? 200;
  const tenantId = opts?.tenantId?.trim() || null;
  const orderWhere = {
    ...orderScope,
    ...(tenantId ? { tenantId } : {}),
  };

  const useInbox = isOrderChatInboxReadNewEnabledForTenant(tenantId);

  const [legacyRows, inboxRows] = await Promise.all([
    db.orderProstheticsRequest.findMany({
      where: {
        resolvedAt: { not: null },
        rejectedAt: null,
        arrivedAt: null,
        order: orderWhere,
      },
      orderBy: { resolvedAt: "desc" },
      take,
      select: {
        id: true,
        text: true,
        source: true,
        authorLabel: true,
        createdAt: true,
        resolvedAt: true,
        kaitenCommentId: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            patientName: true,
            doctor: { select: { fullName: true } },
          },
        },
      },
    }),
    useInbox
      ? ((db as any).orderChatInboxItem.findMany({
          where: {
            type: "PROSTHETICS",
            resolvedAt: { not: null },
            rejectedAt: null,
            arrivedAt: null,
            order: orderWhere,
          },
          orderBy: { resolvedAt: "desc" },
          take,
          select: {
            id: true,
            text: true,
            source: true,
            authorLabel: true,
            createdAt: true,
            resolvedAt: true,
            kaitenCommentId: true,
            order: {
          select: {
            id: true,
            orderNumber: true,
            patientName: true,
            doctor: { select: { fullName: true } },
          },
        },
          },
        }) as Promise<
          Array<{
            id: string;
            text: string;
            source: "KAITEN" | "DEMO_KANBAN";
            authorLabel: string | null;
            createdAt: Date;
            resolvedAt: Date | null;
            kaitenCommentId: number | null;
            order: {
              id: string;
              orderNumber: string;
              patientName: string | null;
              doctor: { fullName: string } | null;
            };
          }>
        >)
      : Promise.resolve([]),
  ]);

  const inboxKaitenIds = new Set<number>();
  const merged: ProstheticsInTransitRow[] = [];

  for (const row of inboxRows) {
    if (row.resolvedAt == null) continue;
    if (row.kaitenCommentId != null) inboxKaitenIds.add(row.kaitenCommentId);
    merged.push({
      id: row.id,
      text: row.text,
      source: row.source,
      authorLabel: row.authorLabel,
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt.toISOString(),
      orderId: row.order.id,
      orderNumber: row.order.orderNumber,
      patientName: row.order.patientName,
      doctorName: row.order.doctor?.fullName ?? null,
    });
  }

  for (const row of legacyRows) {
    if (row.resolvedAt == null) continue;
    if (row.kaitenCommentId != null && inboxKaitenIds.has(row.kaitenCommentId)) {
      continue;
    }
    merged.push({
      id: row.id,
      text: row.text,
      source: row.source,
      authorLabel: row.authorLabel,
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt.toISOString(),
      orderId: row.order.id,
      orderNumber: row.order.orderNumber,
      patientName: row.order.patientName,
      doctorName: row.order.doctor?.fullName ?? null,
    });
  }

  merged.sort(
    (a, b) =>
      new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime(),
  );
  return merged.slice(0, take);
}

export async function loadProstheticsInTransitForTenant(
  tenantId: string | null | undefined,
): Promise<{ count: number; items: ProstheticsInTransitRow[] }> {
  const prisma = await getOrdersPrisma();
  const items = await listProstheticsInTransit(prisma, {
    tenantId,
    take: 200,
  });
  return { count: items.length, items };
}
