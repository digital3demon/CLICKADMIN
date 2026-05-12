import "server-only";

import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { KanbanOrderPublicSnippet } from "@/lib/kanban-tenant-state-snippet-for-order";
import {
  demoKanbanColumnRu,
  kanbanSnippetForLinkedOrder,
  KANBAN_STATE_KEY,
} from "@/lib/kanban-tenant-state-snippet-for-order";
import {
  LAB_WORK_STATUS_LABELS,
  normalizeLegacyLabWorkStatus,
} from "@/lib/lab-work-status";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";

export type PublicStickerClientView = {
  orderNumber: string;
  clinicName: string | null;
  patientShort: string | null;
  workReceivedAt: string | null;
  createdAt: string;
  labStatusLabel: string;
  kaitenColumnTitle: string | null;
  demoKanbanLine: string | null;
  revisions: { id: string; createdAt: string; actorLabel: string; summary: string }[];
  kanban: KanbanOrderPublicSnippet | null;
};

export async function loadPublicStickerClientView(
  ordersDb: PrismaClient,
  tenantId: string,
  orderId: string,
): Promise<PublicStickerClientView | null> {
  const order = await ordersDb.order.findFirst({
    where: { id: orderId, tenantId },
    select: {
      orderNumber: true,
      patientName: true,
      workReceivedAt: true,
      createdAt: true,
      labWorkStatus: true,
      kaitenColumnTitle: true,
      demoKanbanColumn: true,
      clinic: { select: { name: true } },
    },
  });
  if (!order) return null;

  const stateRow = await prisma.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key: KANBAN_STATE_KEY } },
    select: { value: true },
  });

  const snippet = stateRow?.value
    ? kanbanSnippetForLinkedOrder(stateRow.value, orderId)
    : null;

  const revisions = await ordersDb.orderRevision.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { id: true, createdAt: true, actorLabel: true, summary: true },
  });

  const lab = normalizeLegacyLabWorkStatus(String(order.labWorkStatus));

  return {
    orderNumber: order.orderNumber,
    clinicName: order.clinic?.name?.trim() || null,
    patientShort: personNameSurnameInitials(order.patientName) || null,
    workReceivedAt: order.workReceivedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    labStatusLabel: LAB_WORK_STATUS_LABELS[lab],
    kaitenColumnTitle: order.kaitenColumnTitle?.trim() || null,
    demoKanbanLine: demoKanbanColumnRu(order.demoKanbanColumn),
    revisions: revisions.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      actorLabel: (r.actorLabel || "").trim() || "—",
      summary: (r.summary || "").trim() || "—",
    })),
    kanban: snippet,
  };
}
