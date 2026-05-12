import "server-only";

import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  firstHandedToAdminsAtFromLinkedOrderKanbanState,
  KANBAN_STATE_KEY,
} from "@/lib/kanban-tenant-state-snippet-for-order";
import { parseSnapshotV1 } from "@/lib/order-revision-snapshot";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import {
  isHandedToAdminsKaitenColumnTitle,
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
  /**
   * Первый момент «сдана админам»: по журналу CRM-канбана и/или ревизиям колонки; если оба есть — более ранняя дата.
   */
  handedToAdminsAt: string | null;
  revisions: { id: string; createdAt: string; actorLabel: string; summary: string }[];
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
      clinic: { select: { name: true } },
      doctor: { select: { fullName: true } },
    },
  });
  if (!order) return null;

  const stateRow = await prisma.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key: KANBAN_STATE_KEY } },
    select: { value: true },
  });

  const handedFromKanban = firstHandedToAdminsAtFromLinkedOrderKanbanState(
    stateRow?.value,
    orderId,
  );

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
  let handedFromRevisions: string | null = null;
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
      handedFromRevisions = r.createdAt.toISOString();
    }
    prevKaitenColumn = col;
  }

  const handedToAdminsAt =
    handedFromKanban && handedFromRevisions
      ? handedFromKanban < handedFromRevisions
        ? handedFromKanban
        : handedFromRevisions
      : handedFromKanban ?? handedFromRevisions;

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
  };
}
