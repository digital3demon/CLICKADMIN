import "server-only";

import type { Prisma } from "@prisma/client";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  mergeCorrectionHistoryRows,
  type CorrectionHistoryRow,
} from "@/lib/corrections-history";
import { normalizeRevisionsHistorySearchQuery } from "@/lib/revisions-history";

const TAKE_EACH_DEFAULT = 100;
const TAKE_EACH_SEARCH = 200;
const MERGED_LIMIT_DEFAULT = 150;

const userNameSelect = { select: { displayName: true } } as const;

const rowSelect = {
  id: true,
  text: true,
  source: true,
  createdAt: true,
  resolvedAt: true,
  rejectedAt: true,
  resolvedBy: userNameSelect,
  rejectedBy: userNameSelect,
  order: {
    select: {
      id: true,
      orderNumber: true,
    },
  },
} as const;

function mapRow(
  r: Prisma.OrderChatCorrectionGetPayload<{ select: typeof rowSelect }>,
  kind: CorrectionHistoryRow["kind"],
): CorrectionHistoryRow {
  return {
    id: r.id,
    kind,
    text: r.text,
    source: r.source,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
    rejectedAt: r.rejectedAt,
    resolvedByName: r.resolvedBy?.displayName ?? null,
    rejectedByName: r.rejectedBy?.displayName ?? null,
    order: r.order,
  };
}

function buildCorrectionSearchWhere(q: string): Prisma.OrderChatCorrectionWhereInput {
  const or: Prisma.OrderChatCorrectionWhereInput[] = [
    { text: { contains: q, mode: "insensitive" } },
    { order: { orderNumber: { contains: q, mode: "insensitive" } } },
    { order: { patientName: { contains: q, mode: "insensitive" } } },
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
  if (lower.includes("коррект")) {
    or.push({ id: { not: "" } });
  }
  return { OR: or };
}

function buildProstheticsSearchWhere(
  q: string,
): Prisma.OrderProstheticsRequestWhereInput {
  const or: Prisma.OrderProstheticsRequestWhereInput[] = [
    { text: { contains: q, mode: "insensitive" } },
    { order: { orderNumber: { contains: q, mode: "insensitive" } } },
    { order: { patientName: { contains: q, mode: "insensitive" } } },
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
  if (lower.includes("протет")) {
    or.push({ id: { not: "" } });
  }
  return { OR: or };
}

const orderScope = { archivedAt: null } satisfies Prisma.OrderWhereInput;

/** Корректировки «!!!» и заявки «???» по протетике для вкладки истории. */
export async function loadCorrectionsHistoryMerged(opts?: {
  q?: string | null;
  limit?: number;
}): Promise<CorrectionHistoryRow[]> {
  const q = normalizeRevisionsHistorySearchQuery(opts?.q);
  const limit = opts?.limit ?? MERGED_LIMIT_DEFAULT;
  const takeEach = q ? TAKE_EACH_SEARCH : TAKE_EACH_DEFAULT;

  const prisma = await getOrdersPrisma();

  const [correctionRows, prostheticsRows] = await Promise.all([
    prisma.orderChatCorrection.findMany({
      where: {
        order: orderScope,
        ...(q ? buildCorrectionSearchWhere(q) : {}),
      },
      orderBy: { createdAt: "desc" },
      take: takeEach,
      select: rowSelect,
    }),
    prisma.orderProstheticsRequest.findMany({
      where: {
        order: orderScope,
        ...(q ? buildProstheticsSearchWhere(q) : {}),
      },
      orderBy: { createdAt: "desc" },
      take: takeEach,
      select: rowSelect,
    }),
  ]);

  return mergeCorrectionHistoryRows(
    correctionRows.map((r) => mapRow(r, "correction")),
    prostheticsRows.map((r) => mapRow(r, "prosthetics")),
    limit,
  );
}
