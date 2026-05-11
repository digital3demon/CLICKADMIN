import { DoctorMessengerItemStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";

export const dynamic = "force-dynamic";

/** Все открытые записи очереди помечены просмотренными (бейдж в сайдбаре). */
export async function POST() {
  const session = await getSessionFromCookies();
  if (!session?.sub || session.demo) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let tenantId: string;
  try {
    tenantId = await requireSessionTenantId(session);
  } catch {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const now = new Date();
  const result = await prisma.doctorMessengerItem.updateMany({
    where: {
      tenantId,
      status: DoctorMessengerItemStatus.OPEN,
      readAt: null,
    },
    data: { readAt: now },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
