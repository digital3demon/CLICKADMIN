import { DoctorMessengerItemStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";

export const dynamic = "force-dynamic";

/** Убрать из очереди без ответа (перешли в Telegram вручную). */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
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

  const { id } = await ctx.params;
  const itemId = id?.trim() ?? "";
  if (!itemId) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const row = await prisma.doctorMessengerItem.findFirst({
    where: {
      id: itemId,
      tenantId,
      status: DoctorMessengerItemStatus.OPEN,
    },
    select: { id: true },
  });
  if (!row) {
    return NextResponse.json(
      { error: "Сообщение не найдено или уже в архиве" },
      { status: 404 },
    );
  }

  const now = new Date();
  await prisma.doctorMessengerItem.update({
    where: { id: row.id },
    data: {
      status: DoctorMessengerItemStatus.ARCHIVED,
      archivedAt: now,
    },
  });

  return NextResponse.json({ ok: true });
}
