import "server-only";

import type { PrismaClient } from "@prisma/client";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { isOrderChatInboxReadNewEnabledForTenant } from "@/lib/order-chat-inbox-dual-read.server";
import { prostheticsFromDb } from "@/lib/order-prosthetics";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import { prostheticsInTransitStepFromDates } from "@/lib/prosthetics-in-transit-step";
import type { ProstheticsInTransitRow } from "@/lib/prosthetics-in-transit";

export type { ProstheticsInTransitRow };

const orderScope = { archivedAt: null } as const;

type OrderLite = {
  id: string;
  orderNumber: string;
  patientName: string | null;
  prostheticsOrdered: boolean;
  prosthetics: unknown;
  doctor: { fullName: string } | null;
};

type RawTransit = {
  id: string;
  text: string;
  source: "KAITEN" | "DEMO_KANBAN";
  authorLabel: string | null;
  createdAt: Date;
  resolvedAt: Date;
  arrivedAt: Date | null;
  checkedAt: Date | null;
  completedAt: Date | null;
  kaitenCommentId: number | null;
  order: OrderLite;
};

/**
 * Принята («в пути»), ещё не «Готово» (completedAt). Dedup inbox+legacy по kaitenCommentId.
 */
export async function countProstheticsInTransit(
  db: PrismaClient,
  opts?: { tenantId?: string | null },
): Promise<number> {
  const rows = await listProstheticsInTransit(db, opts);
  return rows.length;
}

const orderSelect = {
  id: true,
  orderNumber: true,
  patientName: true,
  prostheticsOrdered: true,
  prosthetics: true,
  doctor: { select: { fullName: true } },
} as const;

const transitDateSelect = {
  id: true,
  text: true,
  source: true,
  authorLabel: true,
  createdAt: true,
  resolvedAt: true,
  arrivedAt: true,
  checkedAt: true,
  completedAt: true,
  kaitenCommentId: true,
  order: { select: orderSelect },
} as const;

async function resolveOurLineLabels(
  itemIds: string[],
): Promise<Map<string, string>> {
  const ids = Array.from(new Set(itemIds.map((x) => x.trim()).filter(Boolean)));
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  try {
    const pricing = getPricingPrismaClient();
    const rows = await pricing.inventoryItem.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, sku: true },
    });
    for (const r of rows) {
      const sku = r.sku?.trim();
      map.set(r.id, sku ? `${sku} · ${r.name}` : r.name);
    }
  } catch (e) {
    console.warn("[prosthetics-in-transit] inventory labels", e);
  }
  return map;
}

function isoOrNull(d: Date | null | undefined): string | null {
  return d != null ? d.toISOString() : null;
}

function toRow(
  raw: RawTransit,
  labelByItemId: Map<string, string>,
): ProstheticsInTransitRow {
  const p = prostheticsFromDb(raw.order.prosthetics);
  const arrivedAt = isoOrNull(raw.arrivedAt);
  const checkedAt = isoOrNull(raw.checkedAt);
  const completedAt = isoOrNull(raw.completedAt);
  return {
    id: raw.id,
    text: raw.text,
    source: raw.source,
    authorLabel: raw.authorLabel,
    createdAt: raw.createdAt.toISOString(),
    resolvedAt: raw.resolvedAt.toISOString(),
    arrivedAt,
    checkedAt,
    completedAt,
    step: prostheticsInTransitStepFromDates({
      resolvedAt: raw.resolvedAt,
      arrivedAt: raw.arrivedAt,
      checkedAt: raw.checkedAt,
      completedAt: raw.completedAt,
    }),
    orderId: raw.order.id,
    orderNumber: raw.order.orderNumber,
    patientName: raw.order.patientName,
    doctorName: raw.order.doctor?.fullName ?? null,
    prostheticsOrdered: raw.order.prostheticsOrdered === true,
    clientProvided: p.clientProvided.map((line) => ({
      description: line.description,
      quantity: line.quantity,
    })),
    ourLines: p.ourLines.map((line) => ({
      label:
        labelByItemId.get(line.inventoryItemId) ??
        (line.inventoryItemId.trim() || "—"),
      quantity: line.quantity,
    })),
  };
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

  const inTransitWhere = {
    resolvedAt: { not: null },
    rejectedAt: null,
    completedAt: null,
    order: orderWhere,
  } as const;

  const [legacyRows, inboxRows] = await Promise.all([
    db.orderProstheticsRequest.findMany({
      where: inTransitWhere,
      orderBy: { resolvedAt: "desc" },
      take,
      select: transitDateSelect,
    }),
    useInbox
      ? ((db as any).orderChatInboxItem.findMany({
          where: {
            type: "PROSTHETICS",
            ...inTransitWhere,
          },
          orderBy: { resolvedAt: "desc" },
          take,
          select: transitDateSelect,
        }) as Promise<
          Array<{
            id: string;
            text: string;
            source: "KAITEN" | "DEMO_KANBAN";
            authorLabel: string | null;
            createdAt: Date;
            resolvedAt: Date | null;
            arrivedAt: Date | null;
            checkedAt: Date | null;
            completedAt: Date | null;
            kaitenCommentId: number | null;
            order: OrderLite;
          }>
        >)
      : Promise.resolve([]),
  ]);

  const inboxKaitenIds = new Set<number>();
  const mergedRaw: RawTransit[] = [];

  for (const row of inboxRows) {
    if (row.resolvedAt == null) continue;
    if (row.kaitenCommentId != null) inboxKaitenIds.add(row.kaitenCommentId);
    mergedRaw.push({
      id: row.id,
      text: row.text,
      source: row.source,
      authorLabel: row.authorLabel,
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt,
      arrivedAt: row.arrivedAt ?? null,
      checkedAt: row.checkedAt ?? null,
      completedAt: row.completedAt ?? null,
      kaitenCommentId: row.kaitenCommentId,
      order: row.order,
    });
  }

  for (const row of legacyRows) {
    if (row.resolvedAt == null) continue;
    if (row.kaitenCommentId != null && inboxKaitenIds.has(row.kaitenCommentId)) {
      continue;
    }
    mergedRaw.push({
      id: row.id,
      text: row.text,
      source: row.source,
      authorLabel: row.authorLabel,
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt,
      arrivedAt: (row as { arrivedAt?: Date | null }).arrivedAt ?? null,
      checkedAt: (row as { checkedAt?: Date | null }).checkedAt ?? null,
      completedAt: (row as { completedAt?: Date | null }).completedAt ?? null,
      kaitenCommentId: row.kaitenCommentId,
      order: row.order,
    });
  }

  mergedRaw.sort(
    (a, b) => b.resolvedAt.getTime() - a.resolvedAt.getTime(),
  );
  const sliced = mergedRaw.slice(0, take);

  const allItemIds: string[] = [];
  for (const raw of sliced) {
    const p = prostheticsFromDb(raw.order.prosthetics);
    for (const line of p.ourLines) {
      if (line.inventoryItemId.trim()) allItemIds.push(line.inventoryItemId);
    }
  }
  const labelByItemId = await resolveOurLineLabels(allItemIds);

  return sliced.map((raw) => toRow(raw, labelByItemId));
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
