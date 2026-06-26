import "server-only";

import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  KANBAN_STATE_KEY,
  kanbanActivityForLinkedOrder,
  kanbanBoardsFromState,
} from "@/lib/kanban-tenant-state-snippet-for-order";
import { parseSnapshotV1 } from "@/lib/order-revision-snapshot";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import {
  resolvePublicHubTimeline,
  type ResolvedTimelineRow,
} from "@/lib/resolve-public-hub-timeline";
import {
  STICKER_PRINT_SETTINGS_KEY,
  normalizeStickerPrintSettingsV2,
} from "@/lib/sticker-template";

export type PublicStickerClientView = {
  orderNumber: string;
  clinicName: string | null;
  doctorShort: string | null;
  patientShort: string | null;
  timelineRows: ResolvedTimelineRow[];
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

  const [stateRow, printRow] = await Promise.all([
    prisma.tenantClientState.findUnique({
      where: { tenantId_key: { tenantId, key: KANBAN_STATE_KEY } },
      select: { value: true },
    }),
    prisma.tenantClientState.findUnique({
      where: { tenantId_key: { tenantId, key: STICKER_PRINT_SETTINGS_KEY } },
      select: { value: true },
    }),
  ]);

  const kanbanState = stateRow?.value;
  const printSettings = normalizeStickerPrintSettingsV2(printRow?.value ?? null);

  const revRows = await ordersDb.orderRevision.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
    take: 150,
    select: {
      createdAt: true,
      snapshot: true,
    },
  });

  const revisionColumnRows: Array<{ at: Date; column: string | null }> = [];
  const revisionFieldRows: Array<{
    at: Date;
    isUrgent?: boolean | null;
    urgentCoefficient?: number | null;
  }> = [];

  for (const r of revRows) {
    const snap = parseSnapshotV1(r.snapshot);
    const col =
      snap?.order.kaitenColumnTitle != null
        ? String(snap.order.kaitenColumnTitle).trim() || null
        : null;
    revisionColumnRows.push({ at: r.createdAt, column: col });
    if (snap?.order) {
      revisionFieldRows.push({
        at: r.createdAt,
        isUrgent: snap.order.isUrgent,
        urgentCoefficient: snap.order.urgentCoefficient,
      });
    }
  }

  const timelineRows = resolvePublicHubTimeline({
    config: printSettings.publicHubTimeline,
    order: {
      createdAt: order.createdAt.toISOString(),
      workReceivedAt: order.workReceivedAt?.toISOString() ?? null,
    },
    kanbanActivity: kanbanActivityForLinkedOrder(kanbanState, orderId),
    revisionColumnRows,
    revisionFieldRows,
    kanbanBoards: kanbanBoardsFromState(kanbanState),
  });

  const doctorRaw = (order.doctor.fullName ?? "").trim();
  const doctorShort =
    personNameSurnameInitials(doctorRaw || null) || doctorRaw || null;

  return {
    orderNumber: order.orderNumber,
    clinicName: order.clinic?.name?.trim() || null,
    doctorShort,
    patientShort: personNameSurnameInitials(order.patientName) || null,
    timelineRows,
  };
}
