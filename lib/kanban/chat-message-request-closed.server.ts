import "server-only";

import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";
import type { KanbanChatRequestClosedRow } from "@/lib/kanban/chat-message-request-closed";
import { isKanbanChatCommentRequestClosed } from "@/lib/kanban/chat-message-request-closed";
import type { CardComment } from "@/lib/kanban/types";

export async function loadKanbanChatRequestClosedRows(
  orderId: string,
  db?: PrismaClient,
): Promise<KanbanChatRequestClosedRow[]> {
  const id = String(orderId || "").trim();
  if (!id) return [];
  const prisma = db ?? (await getPrisma());
  const [inbox, corrections, prosthetics] = await Promise.all([
    prisma.orderChatInboxItem.findMany({
      where: { orderId: id, type: { in: ["CORRECTION", "PROSTHETICS"] } },
      select: {
        type: true,
        text: true,
        createdAt: true,
        crmDraftId: true,
        kaitenCommentId: true,
        resolvedAt: true,
        rejectedAt: true,
        orderedAt: true,
        completedAt: true,
      },
    }),
    prisma.orderChatCorrection.findMany({
      where: { orderId: id },
      select: {
        text: true,
        createdAt: true,
        kaitenCommentId: true,
        resolvedAt: true,
        rejectedAt: true,
      },
    }),
    prisma.orderProstheticsRequest.findMany({
      where: { orderId: id },
      select: {
        text: true,
        createdAt: true,
        kaitenCommentId: true,
        resolvedAt: true,
        rejectedAt: true,
        orderedAt: true,
        completedAt: true,
      },
    }),
  ]);

  const rows: KanbanChatRequestClosedRow[] = [];
  for (const row of inbox) {
    if (row.type !== "CORRECTION" && row.type !== "PROSTHETICS") continue;
    rows.push({
      kind: row.type === "CORRECTION" ? "correction" : "prosthetics",
      text: row.text,
      createdAt: row.createdAt,
      crmDraftId: row.crmDraftId,
      kaitenCommentId: row.kaitenCommentId,
      resolvedAt: row.resolvedAt,
      rejectedAt: row.rejectedAt,
      orderedAt: row.orderedAt,
      completedAt: row.completedAt,
    });
  }
  for (const row of corrections) {
    rows.push({
      kind: "correction",
      text: row.text,
      createdAt: row.createdAt,
      kaitenCommentId: row.kaitenCommentId,
      resolvedAt: row.resolvedAt,
      rejectedAt: row.rejectedAt,
    });
  }
  for (const row of prosthetics) {
    rows.push({
      kind: "prosthetics",
      text: row.text,
      createdAt: row.createdAt,
      kaitenCommentId: row.kaitenCommentId,
      resolvedAt: row.resolvedAt,
      rejectedAt: row.rejectedAt,
      orderedAt: row.orderedAt,
      completedAt: row.completedAt,
    });
  }
  return rows;
}

export async function isStoredKanbanChatCommentRequestClosed(
  orderId: string,
  comment: Pick<CardComment, "id" | "text" | "createdAt" | "externalCommentId">,
): Promise<boolean> {
  const rows = await loadKanbanChatRequestClosedRows(orderId);
  return isKanbanChatCommentRequestClosed(comment, rows);
}
