import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import {
  DEMO_KANBAN_PERSON_LABEL,
  isCrmStandaloneDemo,
} from "@/lib/crm-standalone-demo";
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

  const forceDemoLabel = Boolean(s.demo) || isCrmStandaloneDemo();

  const prisma = await getPrisma();
  const rows = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: [{ displayName: "asc" }, { email: "asc" }],
    select: {
      id: true,
      displayName: true,
      email: true,
      mentionHandle: true,
      role: true,
      avatarPresetId: true,
      avatarCustomUploadedAt: true,
    },
  });

  const users = rows.map((u) => ({
    id: u.id,
    displayName: forceDemoLabel
      ? DEMO_KANBAN_PERSON_LABEL
      : u.displayName?.trim() || u.email || DEMO_KANBAN_PERSON_LABEL,
    email: forceDemoLabel ? "user@demo.local" : u.email,
    mentionHandle: forceDemoLabel ? null : u.mentionHandle?.trim() || null,
    role: u.role,
    avatarPresetId: u.avatarPresetId,
    avatarCustomUploadedAt: u.avatarCustomUploadedAt?.toISOString() ?? null,
  }));

  return NextResponse.json(
    { users },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
