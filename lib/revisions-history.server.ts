import "server-only";

import type {
  ContractorRevisionKind,
  OrderRevisionKind,
  Prisma,
} from "@prisma/client";
import { getClientsPrisma, getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  CONTRACTOR_REVISION_KIND_RU,
  mergeRevisionsHistoryRows,
  normalizeRevisionsHistorySearchQuery,
  ORDER_REVISION_KIND_RU,
  type RevisionsHistoryItem,
} from "@/lib/revisions-history";
import { orderSearchContainsNeedle } from "@/lib/order-search-query";

const TAKE_EACH_DEFAULT = 100;
const MERGED_LIMIT_DEFAULT = 150;
const TAKE_EACH_SEARCH = 200;

function kindTokensFromQuery(
  q: string,
  map: Record<string, string>,
): string[] {
  const lower = q.toLowerCase();
  const kinds = new Set<string>();
  for (const [kind, label] of Object.entries(map)) {
    const labelLower = label.toLowerCase();
    if (
      lower.includes(labelLower) ||
      labelLower.includes(lower) ||
      lower === kind.toLowerCase()
    ) {
      kinds.add(kind);
    }
  }
  return [...kinds];
}

function buildOrderRevisionSearchWhere(
  q: string,
): Prisma.OrderRevisionWhereInput {
  const orderNeedle = orderSearchContainsNeedle(q) || q;
  const or: Prisma.OrderRevisionWhereInput[] = [
    { actorLabel: { contains: q, mode: "insensitive" } },
    { summary: { contains: q, mode: "insensitive" } },
    { order: { orderNumber: { contains: orderNeedle, mode: "insensitive" } } },
    { order: { patientName: { contains: orderNeedle, mode: "insensitive" } } },
    { order: { doctor: { fullName: { contains: orderNeedle, mode: "insensitive" } } } },
    {
      order: {
        clinic: { is: { name: { contains: q, mode: "insensitive" } } },
      },
    },
    {
      order: {
        clinic: { is: { address: { contains: q, mode: "insensitive" } } },
      },
    },
  ];

  for (const kind of kindTokensFromQuery(q, ORDER_REVISION_KIND_RU)) {
    or.push({ kind: kind as OrderRevisionKind });
  }

  const lower = q.toLowerCase();
  if (lower.includes("наряд")) {
    or.push({ id: { not: "" } });
  }

  return { OR: or };
}

function buildContractorRevisionSearchWhere(
  q: string,
): Prisma.ContractorRevisionWhereInput {
  const or: Prisma.ContractorRevisionWhereInput[] = [
    { actorLabel: { contains: q, mode: "insensitive" } },
    { summary: { contains: q, mode: "insensitive" } },
    { clinic: { is: { name: { contains: q, mode: "insensitive" } } } },
    { clinic: { is: { address: { contains: q, mode: "insensitive" } } } },
    { doctor: { is: { fullName: { contains: q, mode: "insensitive" } } } },
  ];

  for (const kind of kindTokensFromQuery(q, CONTRACTOR_REVISION_KIND_RU)) {
    or.push({ kind: kind as ContractorRevisionKind });
  }

  const lower = q.toLowerCase();
  if (lower.includes("клиник")) {
    or.push({ clinicId: { not: null } });
  }
  if (lower.includes("врач")) {
    or.push({ doctorId: { not: null } });
  }

  return { OR: or };
}

const orderRevisionSelect = {
  id: true,
  createdAt: true,
  actorLabel: true,
  summary: true,
  kind: true,
  order: {
    select: {
      id: true,
      orderNumber: true,
    },
  },
} as const;

const contractorRevisionSelect = {
  id: true,
  createdAt: true,
  actorLabel: true,
  summary: true,
  kind: true,
  clinic: { select: { id: true, name: true } },
  doctor: { select: { id: true, fullName: true } },
} as const;

/** Общая лента нарядов и контрагентов для страницы и API. */
export async function loadRevisionsHistoryMerged(opts?: {
  q?: string | null;
  limit?: number;
}): Promise<RevisionsHistoryItem[]> {
  const q = normalizeRevisionsHistorySearchQuery(opts?.q);
  const limit = opts?.limit ?? MERGED_LIMIT_DEFAULT;
  const takeEach = q ? TAKE_EACH_SEARCH : TAKE_EACH_DEFAULT;

  const [ordersPrisma, clientsPrisma] = await Promise.all([
    getOrdersPrisma(),
    getClientsPrisma(),
  ]);

  const [orderRows, contractorRows] = await Promise.all([
    ordersPrisma.orderRevision.findMany({
      where: q ? buildOrderRevisionSearchWhere(q) : undefined,
      orderBy: { createdAt: "desc" },
      take: takeEach,
      select: orderRevisionSelect,
    }),
    clientsPrisma.contractorRevision.findMany({
      where: q ? buildContractorRevisionSearchWhere(q) : undefined,
      orderBy: { createdAt: "desc" },
      take: takeEach,
      select: contractorRevisionSelect,
    }),
  ]);

  return mergeRevisionsHistoryRows(orderRows, contractorRows, limit);
}
