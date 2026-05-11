import { DoctorMessengerItemStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { messengerSidebarPreviewLine } from "@/lib/messenger-text-preview";

export const dynamic = "force-dynamic";

const PREVIEW_TAKE = 5;

/** Счётчик непрочитанных + короткий список для блока «Мессенджеры» в сайдбаре. */
export async function GET() {
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
  const whereUnreadOpen = {
    tenantId,
    status: DoctorMessengerItemStatus.OPEN,
    readAt: null,
  } as const;

  const [count, rows] = await Promise.all([
    prisma.doctorMessengerItem.count({ where: whereUnreadOpen }),
    prisma.doctorMessengerItem.findMany({
      where: whereUnreadOpen,
      orderBy: { createdAt: "desc" },
      take: PREVIEW_TAKE,
      select: {
        id: true,
        createdAt: true,
        textFull: true,
        doctor: { select: { fullName: true } },
      },
    }),
  ]);

  const items = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    doctorName: r.doctor.fullName,
    preview: messengerSidebarPreviewLine(r.textFull),
  }));

  return NextResponse.json({ count, items });
}
