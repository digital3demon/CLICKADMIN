import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; groupId: string }> },
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

  const { id: doctorId, groupId } = await ctx.params;
  const did = doctorId?.trim() ?? "";
  const gid = groupId?.trim() ?? "";
  if (!did || !gid) {
    return NextResponse.json({ error: "Некорректные параметры" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const row = await prisma.doctorTelegramGroup.findFirst({
    where: {
      id: gid,
      tenantId,
      doctorId: did,
    },
    select: { id: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });
  }

  await prisma.doctorTelegramGroup.delete({
    where: { id: row.id },
  });

  return NextResponse.json({ ok: true });
}
