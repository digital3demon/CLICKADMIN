import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getPrisma } from "@/lib/get-prisma";

export const dynamic = "force-dynamic";

/**
 * Активные пользователи CRM для канбана (ответственные / участники карточек).
 * Доступно любой вошедшей роли, включая «Пользователь» (только канбан).
 */
export async function GET() {
  const s = await getSessionFromCookies();
  if (!s?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const prisma = await getPrisma();
  const rows = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: [{ displayName: "asc" }, { email: "asc" }],
    select: {
      id: true,
      displayName: true,
      email: true,
      mentionHandle: true,
      avatarPresetId: true,
      avatarCustomUploadedAt: true,
    },
  });

  const users = rows.map((u) => ({
    id: u.id,
    displayName: u.displayName?.trim() || u.email || "Пользователь",
    email: u.email,
    mentionHandle: u.mentionHandle?.trim() || null,
    avatarPresetId: u.avatarPresetId,
    avatarCustomUploadedAt: u.avatarCustomUploadedAt?.toISOString() ?? null,
  }));

  return NextResponse.json(
    { users },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
