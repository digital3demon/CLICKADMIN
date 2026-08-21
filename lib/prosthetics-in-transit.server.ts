import "server-only";

import type { PrismaClient } from "@prisma/client";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { isOrderChatInboxReadNewEnabledForTenant } from "@/lib/order-chat-inbox-dual-read.server";
import { prostheticsFromDb } from "@/lib/order-prosthetics";
import { normalizeProstheticsTwinKey } from "@/lib/order-prosthetics-request";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import { prostheticsInTransitStepFromDates } from "@/lib/prosthetics-in-transit-step";
import type {
  ProstheticsInTransitRow,
  ProstheticsToOrderRow,
} from "@/lib/prosthetics-in-transit";

export type { ProstheticsInTransitRow, ProstheticsToOrderRow };

const orderScope = { archivedAt: null } as const;

type OrderLite = {
  id: string;
  orderNumber: string;
  patientName: string | null;
  prostheticsOrdered: boolean;
  prosthetics?: unknown;
  doctor: { fullName: string } | null;
};

type RawTransit = {
  id: string;
  text: string;
  source: "KAITEN" | "DEMO_KANBAN";
  authorLabel: string | null;
  createdAt: Date;
  resolvedAt: Date;
  orderedAt: Date | null;
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
  const rows = await listProstheticsInTransit(db, { ...opts, slim: true });
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

/** Без JSON протетики и без inventory — для модалки/бейджей. */
const orderSelectSlim = {
  id: true,
  orderNumber: true,
  patientName: true,
  prostheticsOrdered: true,
  doctor: { select: { fullName: true } },
} as const;

const transitDateSelect = {
  id: true,
  text: true,
  source: true,
  authorLabel: true,
  createdAt: true,
  resolvedAt: true,
  orderedAt: true,
  arrivedAt: true,
  checkedAt: true,
  completedAt: true,
  kaitenCommentId: true,
  order: { select: orderSelect },
} as const;

const transitDateSelectSlim = {
  id: true,
  text: true,
  source: true,
  authorLabel: true,
  createdAt: true,
  resolvedAt: true,
  orderedAt: true,
  arrivedAt: true,
  checkedAt: true,
  completedAt: true,
  kaitenCommentId: true,
  order: { select: orderSelectSlim },
} as const;

async function resolveOurLineLabels(
  itemIds: string[],
): Promise<Map<string, string>> {
  const ids = Array.from(new Set(itemIds.map((x) => x.trim()).filter(Boolean)));
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  try {
    const pricing = await getPricingPrismaClient();
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
  slim: boolean,
): ProstheticsInTransitRow {
  const orderedAt = isoOrNull(raw.orderedAt);
  const arrivedAt = isoOrNull(raw.arrivedAt);
  const checkedAt = isoOrNull(raw.checkedAt);
  const completedAt = isoOrNull(raw.completedAt);
  const base = {
    id: raw.id,
    text: raw.text,
    source: raw.source,
    authorLabel: raw.authorLabel,
    createdAt: raw.createdAt.toISOString(),
    resolvedAt: raw.resolvedAt.toISOString(),
    orderedAt,
    arrivedAt,
    checkedAt,
    completedAt,
    step: prostheticsInTransitStepFromDates({
      resolvedAt: raw.resolvedAt,
      orderedAt: raw.orderedAt,
      arrivedAt: raw.arrivedAt,
      checkedAt: raw.checkedAt,
      completedAt: raw.completedAt,
    }),
    orderId: raw.order.id,
    orderNumber: raw.order.orderNumber,
    patientName: raw.order.patientName,
    doctorName: raw.order.doctor?.fullName ?? null,
    prostheticsOrdered: raw.order.prostheticsOrdered === true,
  };
  if (slim) {
    return { ...base, clientProvided: [], ourLines: [] };
  }
  const p = prostheticsFromDb(raw.order.prosthetics);
  return {
    ...base,
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
  opts?: { tenantId?: string | null; take?: number; slim?: boolean },
): Promise<ProstheticsInTransitRow[]> {
  const take = opts?.take ?? 200;
  const slim = opts?.slim === true;
  const tenantId = opts?.tenantId?.trim() || null;
  const orderWhere = {
    ...orderScope,
    ...(tenantId ? { tenantId } : {}),
  };

  const useInbox = isOrderChatInboxReadNewEnabledForTenant(tenantId);
  const rowSelect = slim ? transitDateSelectSlim : transitDateSelect;

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
      select: rowSelect,
    }),
    useInbox
      ? ((db as any).orderChatInboxItem.findMany({
          where: {
            type: "PROSTHETICS",
            ...inTransitWhere,
          },
          orderBy: { resolvedAt: "desc" },
          take,
          select: rowSelect,
        }) as Promise<
          Array<{
            id: string;
            text: string;
            source: "KAITEN" | "DEMO_KANBAN";
            authorLabel: string | null;
            createdAt: Date;
            resolvedAt: Date | null;
            orderedAt: Date | null;
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
      orderedAt: row.orderedAt ?? null,
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
      orderedAt: (row as { orderedAt?: Date | null }).orderedAt ?? null,
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

  if (slim) {
    return sliced.map((raw) => toRow(raw, new Map(), true));
  }

  const allItemIds: string[] = [];
  for (const raw of sliced) {
    const p = prostheticsFromDb(raw.order.prosthetics);
    for (const line of p.ourLines) {
      if (line.inventoryItemId.trim()) allItemIds.push(line.inventoryItemId);
    }
  }
  const labelByItemId = await resolveOurLineLabels(allItemIds);

  return sliced.map((raw) => toRow(raw, labelByItemId, false));
}

/**
 * Ещё не принята («Заказать»): resolved/rejected пусты. Dedup inbox+legacy.
 * Inbox читаем всегда (как чип «Заказ протетики» на /orders), иначе READ_NEW=off
 * даёт count=0 при живых заявках только в inbox.
 * Только наряды без галочки «Протетика заказана» — тот же смысл, что у чипа.
 */
export async function listProstheticsToOrder(
  db: PrismaClient,
  opts?: { tenantId?: string | null; take?: number; slim?: boolean },
): Promise<ProstheticsToOrderRow[]> {
  const take = opts?.take ?? 200;
  const slim = opts?.slim === true;
  const tenantId = opts?.tenantId?.trim() || null;
  const orderWhere = {
    ...orderScope,
    prostheticsOrdered: false,
    ...(tenantId ? { tenantId } : {}),
  };
  const pendingWhere = {
    resolvedAt: null,
    rejectedAt: null,
    order: orderWhere,
  } as const;

  const pendingSelect = {
    id: true,
    text: true,
    source: true,
    authorLabel: true,
    createdAt: true,
    kaitenCommentId: true,
    order: { select: slim ? orderSelectSlim : orderSelect },
  } as const;

  const [legacyRows, inboxRows] = await Promise.all([
    db.orderProstheticsRequest.findMany({
      where: pendingWhere,
      orderBy: { createdAt: "desc" },
      take,
      select: pendingSelect,
    }),
    ((db as any).orderChatInboxItem.findMany({
      where: { type: "PROSTHETICS", ...pendingWhere },
      orderBy: { createdAt: "desc" },
      take,
      select: pendingSelect,
    }) as Promise<
      Array<{
        id: string;
        text: string;
        source: "KAITEN" | "DEMO_KANBAN";
        authorLabel: string | null;
        createdAt: Date;
        kaitenCommentId: number | null;
        order: OrderLite;
      }>
    >),
  ]);

  const inboxKaitenIds = new Set<number>();
  const merged: Array<{
    id: string;
    text: string;
    source: "KAITEN" | "DEMO_KANBAN";
    authorLabel: string | null;
    createdAt: Date;
    kaitenCommentId: number | null;
    order: OrderLite;
  }> = [];

  for (const row of inboxRows) {
    if (row.kaitenCommentId != null) inboxKaitenIds.add(row.kaitenCommentId);
    merged.push(row);
  }
  for (const row of legacyRows) {
    if (row.kaitenCommentId != null && inboxKaitenIds.has(row.kaitenCommentId)) {
      continue;
    }
    merged.push(row);
  }

  // Один текст (часто отличаются только \\n) → одна карточка; legacy KAITEN уступает канбану
  const collapsed: typeof merged = [];
  const byTwin = new Map<string, (typeof merged)[number]>();
  for (const row of merged) {
    const key = normalizeProstheticsTwinKey(row.text);
    if (!key) {
      collapsed.push(row);
      continue;
    }
    const prev = byTwin.get(key);
    if (!prev) {
      byTwin.set(key, row);
      continue;
    }
    const prefer =
      prev.source !== row.source
        ? prev.source === "DEMO_KANBAN"
          ? prev
          : row.source === "DEMO_KANBAN"
            ? row
            : prev.createdAt.getTime() >= row.createdAt.getTime()
              ? prev
              : row
        : prev.createdAt.getTime() >= row.createdAt.getTime()
          ? prev
          : row;
    byTwin.set(key, prefer);
  }
  collapsed.push(...byTwin.values());

  collapsed.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const sliced = collapsed.slice(0, take);

  if (slim) {
    return sliced.map((raw) => ({
      id: raw.id,
      text: raw.text,
      source: raw.source,
      authorLabel: raw.authorLabel,
      createdAt: raw.createdAt.toISOString(),
      orderId: raw.order.id,
      orderNumber: raw.order.orderNumber,
      patientName: raw.order.patientName,
      doctorName: raw.order.doctor?.fullName ?? null,
      clientProvided: [],
      ourLines: [],
    }));
  }

  const allItemIds: string[] = [];
  for (const raw of sliced) {
    const p = prostheticsFromDb(raw.order.prosthetics);
    for (const line of p.ourLines) {
      if (line.inventoryItemId.trim()) allItemIds.push(line.inventoryItemId);
    }
  }
  const labelByItemId = await resolveOurLineLabels(allItemIds);

  return sliced.map((raw) => {
    const p = prostheticsFromDb(raw.order.prosthetics);
    return {
      id: raw.id,
      text: raw.text,
      source: raw.source,
      authorLabel: raw.authorLabel,
      createdAt: raw.createdAt.toISOString(),
      orderId: raw.order.id,
      orderNumber: raw.order.orderNumber,
      patientName: raw.order.patientName,
      doctorName: raw.order.doctor?.fullName ?? null,
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
  });
}

export async function loadProstheticsInTransitForTenant(
  tenantId: string | null | undefined,
): Promise<{ count: number; items: ProstheticsInTransitRow[] }> {
  const prisma = await getOrdersPrisma();
  const items = await listProstheticsInTransit(prisma, {
    tenantId,
    take: 200,
    slim: true,
  });
  return { count: items.length, items };
}

export async function loadProstheticsToOrderForTenant(
  tenantId: string | null | undefined,
): Promise<{
  /** Число заявок «???» (бейдж «Заказать»). */
  count: number;
  /** Число нарядов с такими заявками (чип фильтра). */
  orderCount: number;
  items: ProstheticsToOrderRow[];
}> {
  const prisma = await getOrdersPrisma();
  const items = await listProstheticsToOrder(prisma, {
    tenantId,
    take: 200,
    slim: true,
  });
  const orderCount = new Set(items.map((row) => row.orderId)).size;
  return { count: items.length, orderCount, items };
}
