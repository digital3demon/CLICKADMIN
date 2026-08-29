import "server-only";

import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { userPersonDisplayName } from "@/lib/user-activity-display-label";
import { snapshotLabComposition } from "@/lib/work-examples/composition-snapshot";
import { isWorkExampleTrashExpired } from "@/lib/work-examples/trash";
import { deleteWorkExampleFileBytes } from "@/lib/work-examples/storage";

export async function requireWorkExamplesCtx() {
  const session = await getSessionFromCookies();
  if (!session?.sub) return { ok: false as const, status: 401, error: "Требуется вход" };
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) return { ok: false as const, status: 400, error: "Нет организации" };
  const prisma = await getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, displayName: true, email: true, mentionHandle: true, role: true },
  });
  const actorLabel =
    userPersonDisplayName(user ?? { displayName: session.name, email: session.email }) ||
    session.name ||
    "Сотрудник";
  return {
    ok: true as const,
    session,
    tenantId,
    prisma,
    actorUserId: session.sub,
    actorLabel,
    role: session.role,
  };
}

export function newWorkExampleShareToken(): string {
  return randomBytes(18).toString("base64url");
}

export async function loadOrderLabSnapshot(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string,
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId, archivedAt: null },
    select: {
      id: true,
      kaitenCardTypeId: true,
      kaitenCardType: { select: { id: true, name: true } },
      constructions: {
        orderBy: { sortOrder: "asc" },
        select: {
          quantity: true,
          unitPrice: true,
          constructionType: { select: { name: true } },
          priceListItem: { select: { name: true } },
        },
      },
    },
  });
  if (!order) return null;
  const cardTypes = order.kaitenCardType
    ? [{ id: order.kaitenCardType.id, name: order.kaitenCardType.name }]
    : [];
  return {
    orderId: order.id,
    cardTypes,
    composition: snapshotLabComposition(order.constructions),
  };
}

export async function purgeExpiredWorkExampleTrash(
  prisma: PrismaClient,
  tenantId: string,
): Promise<void> {
  const now = new Date();
  const doomed = await prisma.workExample.findMany({
    where: { tenantId, deletedAt: { not: null } },
    select: { id: true, deletedAt: true, files: { select: { diskRelPath: true } } },
  });
  for (const ex of doomed) {
    if (!isWorkExampleTrashExpired(ex.deletedAt, now)) continue;
    for (const f of ex.files) await deleteWorkExampleFileBytes(f.diskRelPath);
    await prisma.workExample.delete({ where: { id: ex.id } });
  }
  const files = await prisma.workExampleFile.findMany({
    where: { deletedAt: { not: null }, example: { tenantId } },
    select: { id: true, deletedAt: true, diskRelPath: true },
  });
  for (const f of files) {
    if (!isWorkExampleTrashExpired(f.deletedAt, now)) continue;
    await deleteWorkExampleFileBytes(f.diskRelPath);
    await prisma.workExampleFile.delete({ where: { id: f.id } });
  }
  const links = await prisma.workExample.findMany({
    where: { tenantId, cloudUrlDeletedAt: { not: null }, deletedAt: null },
    select: { id: true, cloudUrlDeletedAt: true },
  });
  for (const row of links) {
    if (!isWorkExampleTrashExpired(row.cloudUrlDeletedAt, now)) continue;
    await prisma.workExample.update({
      where: { id: row.id },
      data: {
        cloudUrlPrevious: null,
        cloudUrlDeletedAt: null,
        cloudUrlDeletedByUserId: null,
        cloudUrlDeletedByLabel: null,
      },
    });
  }
}

export const exampleSelect = {
  id: true,
  title: true,
  orderId: true,
  cloudUrl: true,
  cloudUrlPrevious: true,
  cloudUrlDeletedAt: true,
  cloudUrlDeletedByLabel: true,
  technicianNotes: true,
  doctorComments: true,
  cardTypes: true,
  compositionSnapshot: true,
  shareToken: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletedByLabel: true,
  order: { select: { orderNumber: true } },
  files: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      id: true,
      kind: true,
      fileName: true,
      mime: true,
      sizeBytes: true,
      sortOrder: true,
      deletedAt: true,
      deletedByLabel: true,
    },
  },
} as const;
