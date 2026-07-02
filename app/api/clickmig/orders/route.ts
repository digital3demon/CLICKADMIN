import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { CLICKMIG_KANBAN_COLUMNS } from "@/lib/clickmig/defaults";
import { clickMigMaterialLabel } from "@/lib/clickmig/material-labels";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await requireSessionTenantId(session);
  const prisma = await getOrdersPrisma();

  const orders = await prisma.clickMigOrder.findMany({
    where: { tenantId },
    orderBy: [{ kanbanColumnId: "asc" }, { sortOrder: "asc" }],
    include: {
      application: {
        select: {
          publicNumber: true,
          patientName: true,
          guestDoctorName: true,
          material: true,
          constructionTypeKey: true,
        },
      },
    },
  });

  return NextResponse.json({
    columns: CLICKMIG_KANBAN_COLUMNS,
    orders: orders.map((o) => ({
      id: o.id,
      publicNumber: o.publicNumber,
      status: o.status,
      kanbanColumnId: o.kanbanColumnId,
      sortOrder: o.sortOrder,
      assigneeUserId: o.assigneeUserId,
      participantUserId: o.participantUserId,
      stageKey: o.stageKey,
      timerStartedAt: o.timerStartedAt?.toISOString() ?? null,
      timerDurationMs: o.timerDurationMs,
      timerFrozenAt: o.timerFrozenAt?.toISOString() ?? null,
      blockedAt: o.blockedAt?.toISOString() ?? null,
      blockedReason: o.blockedReason,
      patientName: o.application.patientName,
      doctorName: o.application.guestDoctorName,
      materialLabel: clickMigMaterialLabel(o.application.material),
    })),
  });
}
