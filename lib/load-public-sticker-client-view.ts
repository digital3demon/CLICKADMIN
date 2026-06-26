import "server-only";

import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  firstHandedToAdminsAtFromLinkedOrderKanbanState,
  KANBAN_STATE_KEY,
  milestonesFromLinkedOrderKanbanState,
} from "@/lib/kanban-tenant-state-snippet-for-order";
import { parseSnapshotV1 } from "@/lib/order-revision-snapshot";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { isHandedToAdminsKaitenColumnTitle } from "@/lib/sticker-public-client-copy";
import {
  earlierMilestoneIso,
  milestonesFromRevisionColumns,
} from "@/lib/sticker-public-milestones";

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
  /** Согласование → производство (канбан / ревизии). */
  agreedAt: string | null;
  /** Сборка → следующий этап (канбан / ревизии). */
  producedAt: string | null;
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

  const milestonesFromKanban = milestonesFromLinkedOrderKanbanState(
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
  const revisionColumnRows: Array<{ at: Date; column: string | null }> = [];
  for (const r of revRows) {
    const snap = parseSnapshotV1(r.snapshot);
    const col =
      snap?.order.kaitenColumnTitle != null
        ? String(snap.order.kaitenColumnTitle).trim() || null
        : null;
    revisionColumnRows.push({ at: r.createdAt, column: col });
    if (
      isHandedToAdminsKaitenColumnTitle(col) &&
      !isHandedToAdminsKaitenColumnTitle(prevKaitenColumn)
    ) {
      handedFromRevisions = r.createdAt.toISOString();
    }
    prevKaitenColumn = col;
  }

  const milestonesFromRevisions = milestonesFromRevisionColumns(revisionColumnRows);

  const handedToAdminsAt =
    handedFromKanban && handedFromRevisions
      ? handedFromKanban < handedFromRevisions
        ? handedFromKanban
        : handedFromRevisions
      : handedFromKanban ?? handedFromRevisions;

  const doctorRaw = (order.doctor.fullName ?? "").trim();
  const doctorShort =
    personNameSurnameInitials(doctorRaw || null) || doctorRaw || null;

  return {
    orderNumber: order.orderNumber,
    clinicName: order.clinic?.name?.trim() || null,
    doctorShort,
    patientShort: personNameSurnameInitials(order.patientName) || null,
    workReceivedAt: order.workReceivedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    handedToAdminsAt,
    agreedAt: earlierMilestoneIso(
      milestonesFromKanban.agreedAt,
      milestonesFromRevisions.agreedAt,
    ),
    producedAt: earlierMilestoneIso(
      milestonesFromKanban.producedAt,
      milestonesFromRevisions.producedAt,
    ),
  };
}
