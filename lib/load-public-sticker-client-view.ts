import "server-only";

import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { KanbanOrderPublicSnippet } from "@/lib/kanban-tenant-state-snippet-for-order";
import {
  kanbanSnippetForLinkedOrder,
  KANBAN_STATE_KEY,
} from "@/lib/kanban-tenant-state-snippet-for-order";
import { parseSnapshotV1 } from "@/lib/order-revision-snapshot";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import {
  isHandedToAdminsKaitenColumnTitle,
  sanitizeStickerPublicCopy,
  stickerMovementSummaryForPublic,
  stickerRevisionSummaryIsBoardMovement,
} from "@/lib/sticker-public-client-copy";

export type PublicStickerClientView = {
  orderNumber: string;
  clinicName: string | null;
  doctorShort: string | null;
  patientShort: string | null;
  workReceivedAt: string | null;
  createdAt: string;
  /** Первый момент, когда в CRM колонка стала «сдана админам» (по журналу версий). */
  handedToAdminsAt: string | null;
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
      kaitenColumnTitle: true,
      clinic: { select: { name: true } },
      doctor: { select: { fullName: true } },
    },
  });
  if (!order) return null;

  const stateRow = await prisma.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key: KANBAN_STATE_KEY } },
    select: { value: true },
  });

  let snippet = stateRow?.value
    ? kanbanSnippetForLinkedOrder(stateRow.value, orderId)
    : null;
  if (snippet) {
    snippet = {
      ...snippet,
      boardTitle: snippet.boardTitle
        ? sanitizeStickerPublicCopy(snippet.boardTitle)
        : null,
      columnTitle: snippet.columnTitle
        ? sanitizeStickerPublicCopy(snippet.columnTitle)
        : null,
      activity: snippet.activity.map((a) => ({
        ...a,
        label: sanitizeStickerPublicCopy(a.label),
        text: sanitizeStickerPublicCopy(a.text),
      })),
    };
  }

  const revRows = await ordersDb.orderRevision.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
    take: 150,
    select: {
      id: true,
      createdAt: true,
      actorLabel: true,
      summary: true,
      snapshot: true,
    },
  });

  let prevKaitenColumn: string | null = null;
  let handedToAdminsAt: string | null = null;
  for (const r of revRows) {
    const snap = parseSnapshotV1(r.snapshot);
    const col =
      snap?.order.kaitenColumnTitle != null
        ? String(snap.order.kaitenColumnTitle).trim() || null
        : null;
    if (
      isHandedToAdminsKaitenColumnTitle(col) &&
      !isHandedToAdminsKaitenColumnTitle(prevKaitenColumn)
    ) {
      handedToAdminsAt = r.createdAt.toISOString();
    }
    prevKaitenColumn = col;
  }

  const doctorRaw = (order.doctor.fullName ?? "").trim();
  const doctorShort =
    personNameSurnameInitials(doctorRaw || null) || doctorRaw || null;

  const movementRevisions = revRows
    .filter((r) =>
      stickerRevisionSummaryIsBoardMovement((r.summary || "").trim()),
    )
    .map((r) => {
      const summary = stickerMovementSummaryForPublic((r.summary || "").trim());
      return {
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        actorLabel: (r.actorLabel || "").trim() || "—",
        summary,
      };
    })
    .filter((r) => r.summary.length > 0);

  return {
    orderNumber: order.orderNumber,
    clinicName: order.clinic?.name?.trim() || null,
    doctorShort,
    patientShort: personNameSurnameInitials(order.patientName) || null,
    workReceivedAt: order.workReceivedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    handedToAdminsAt,
    revisions: movementRevisions,
    kanban: snippet,
  };
}
