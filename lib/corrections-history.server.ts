import "server-only";

import type { Prisma } from "@prisma/client";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import type { CorrectionHistoryRow } from "@/lib/corrections-history";
import { normalizeRevisionsHistorySearchQuery } from "@/lib/revisions-history";

const TAKE_DEFAULT = 150;
const TAKE_SEARCH = 200;

const userNameSelect = { select: { displayName: true } } as const;

const correctionSelect = {
  id: true,
  text: true,
  source: true,
  authorLabel: true,
  createdAt: true,
  resolvedAt: true,
  rejectedAt: true,
  resolvedBy: userNameSelect,
  rejectedBy: userNameSelect,
  order: {
    select: {
      id: true,
      orderNumber: true,
      patientName: true,
      doctor: { select: { fullName: true } },
    },
  },
} as const;

const correctionSelectPending = {
  id: true,
  text: true,
  source: true,
  authorLabel: true,
  createdAt: true,
  resolvedAt: true,
  rejectedAt: true,
  order: {
    select: {
      id: true,
      orderNumber: true,
      patientName: true,
      doctor: { select: { fullName: true } },
    },
  },
} as const;

function mapCorrectionPending(
  r: Prisma.OrderChatCorrectionGetPayload<{
    select: typeof correctionSelectPending;
  }>,
): CorrectionHistoryRow {
  return {
    id: r.id,
    kind: "correction",
    text: r.text,
    source: r.source,
    authorLabel: r.authorLabel?.trim() || null,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
    rejectedAt: r.rejectedAt,
    arrivedAt: null,
    resolvedByName: null,
    rejectedByName: null,
    arrivedByName: null,
    order: {
      id: r.order.id,
      orderNumber: r.order.orderNumber,
      patientName: r.order.patientName,
      doctorName: r.order.doctor?.fullName ?? null,
    },
  };
}

const prostheticsSelect = {
  ...correctionSelect,
  arrivedAt: true,
  arrivedBy: userNameSelect,
} as const;

function mapCorrection(
  r: Prisma.OrderChatCorrectionGetPayload<{ select: typeof correctionSelect }>,
): CorrectionHistoryRow {
  return {
    id: r.id,
    kind: "correction",
    text: r.text,
    source: r.source,
    authorLabel: r.authorLabel?.trim() || null,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
    rejectedAt: r.rejectedAt,
    arrivedAt: null,
    resolvedByName: r.resolvedBy?.displayName ?? null,
    rejectedByName: r.rejectedBy?.displayName ?? null,
    arrivedByName: null,
    order: {
      id: r.order.id,
      orderNumber: r.order.orderNumber,
      patientName: r.order.patientName,
      doctorName: r.order.doctor?.fullName ?? null,
    },
  };
}

function mapProsthetics(
  r: Prisma.OrderProstheticsRequestGetPayload<{
    select: typeof prostheticsSelect;
  }>,
): CorrectionHistoryRow {
  return {
    id: r.id,
    kind: "prosthetics",
    text: r.text,
    source: r.source,
    authorLabel: r.authorLabel?.trim() || null,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
    rejectedAt: r.rejectedAt,
    arrivedAt: r.arrivedAt,
    resolvedByName: r.resolvedBy?.displayName ?? null,
    rejectedByName: r.rejectedBy?.displayName ?? null,
    arrivedByName: r.arrivedBy?.displayName ?? null,
    order: {
      id: r.order.id,
      orderNumber: r.order.orderNumber,
      patientName: r.order.patientName,
      doctorName: r.order.doctor?.fullName ?? null,
    },
  };
}

function buildCorrectionSearchWhere(q: string): Prisma.OrderChatCorrectionWhereInput {
  const or: Prisma.OrderChatCorrectionWhereInput[] = [
    { text: { contains: q, mode: "insensitive" } },
    { authorLabel: { contains: q, mode: "insensitive" } },
    { order: { orderNumber: { contains: q, mode: "insensitive" } } },
    { order: { patientName: { contains: q, mode: "insensitive" } } },
    { order: { doctor: { is: { fullName: { contains: q, mode: "insensitive" } } } } },
    { resolvedBy: { is: { displayName: { contains: q, mode: "insensitive" } } } },
    { rejectedBy: { is: { displayName: { contains: q, mode: "insensitive" } } } },
  ];
  const lower = q.toLowerCase();
  if (lower.includes("kaiten") || lower.includes("кайтен")) {
    or.push({ source: "KAITEN" });
  }
  if (lower.includes("канбан")) {
    or.push({ source: "DEMO_KANBAN" });
  }
  return { OR: or };
}

function buildProstheticsSearchWhere(
  q: string,
): Prisma.OrderProstheticsRequestWhereInput {
  const or: Prisma.OrderProstheticsRequestWhereInput[] = [
    { text: { contains: q, mode: "insensitive" } },
    { authorLabel: { contains: q, mode: "insensitive" } },
    { order: { orderNumber: { contains: q, mode: "insensitive" } } },
    { order: { patientName: { contains: q, mode: "insensitive" } } },
    { order: { doctor: { is: { fullName: { contains: q, mode: "insensitive" } } } } },
    { resolvedBy: { is: { displayName: { contains: q, mode: "insensitive" } } } },
    { rejectedBy: { is: { displayName: { contains: q, mode: "insensitive" } } } },
    { arrivedBy: { is: { displayName: { contains: q, mode: "insensitive" } } } },
  ];
  const lower = q.toLowerCase();
  if (lower.includes("kaiten") || lower.includes("кайтен")) {
    or.push({ source: "KAITEN" });
  }
  if (lower.includes("канбан")) {
    or.push({ source: "DEMO_KANBAN" });
  }
  if (lower.includes("пришл")) {
    or.push({ arrivedAt: { not: null } });
  }
  if (lower.includes("пути") || lower.includes("в пути")) {
    or.push({
      AND: [{ resolvedAt: { not: null } }, { arrivedAt: null }, { rejectedAt: null }],
    });
  }
  return { OR: or };
}

const orderScope = (tenantId?: string | null) =>
  ({
    archivedAt: null,
    ...(tenantId?.trim() ? { tenantId: tenantId.trim() } : {}),
  }) satisfies Prisma.OrderWhereInput;

/** Только корректировки «!!!». */
export async function loadCorrectionsHistoryOnly(opts?: {
  q?: string | null;
  limit?: number;
  tenantId?: string | null;
  /** Только непринятые (resolved/rejected пусты) — для модалки списка нарядов. */
  pendingOnly?: boolean;
}): Promise<CorrectionHistoryRow[]> {
  const q = normalizeRevisionsHistorySearchQuery(opts?.q);
  const take = opts?.limit ?? (q ? TAKE_SEARCH : TAKE_DEFAULT);
  const prisma = await getOrdersPrisma();
  const pendingOnly = opts?.pendingOnly === true;
  const where = {
    order: orderScope(opts?.tenantId),
    ...(q ? buildCorrectionSearchWhere(q) : {}),
    ...(pendingOnly ? { resolvedAt: null, rejectedAt: null } : {}),
  };
  if (pendingOnly) {
    const rows = await prisma.orderChatCorrection.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      select: correctionSelectPending,
    });
    return rows.map(mapCorrectionPending);
  }
  const rows = await prisma.orderChatCorrection.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    select: correctionSelect,
  });
  return rows.map(mapCorrection);
}

/** Только заявки протетики «???». */
export async function loadProstheticsHistoryOnly(opts?: {
  q?: string | null;
  limit?: number;
  tenantId?: string | null;
}): Promise<CorrectionHistoryRow[]> {
  const q = normalizeRevisionsHistorySearchQuery(opts?.q);
  const take = opts?.limit ?? (q ? TAKE_SEARCH : TAKE_DEFAULT);
  const prisma = await getOrdersPrisma();
  const rows = await prisma.orderProstheticsRequest.findMany({
    where: {
      order: orderScope(opts?.tenantId),
      ...(q ? buildProstheticsSearchWhere(q) : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: prostheticsSelect,
  });
  return rows.map(mapProsthetics);
}

/** @deprecated используйте loadCorrectionsHistoryOnly / loadProstheticsHistoryOnly */
export async function loadCorrectionsHistoryMerged(opts?: {
  q?: string | null;
  limit?: number;
}): Promise<CorrectionHistoryRow[]> {
  return loadCorrectionsHistoryOnly(opts);
}
