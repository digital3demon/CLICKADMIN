import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { canManageUsers } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSessionFromCookies();
  if (!s || !canManageUsers(s.role)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const rows = await (await getPrisma()).user.findMany({
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: {
      id: true,
      email: true,
      phone: true,
      displayName: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      isActive: true,
      passwordHash: true,
      inviteCodeHash: true,
      telegramId: true,
    },
  });
  const users = rows.map((u) => ({
    id: u.id,
    email: u.email,
    phone: u.phone,
    displayName: u.displayName,
    role: u.role,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    isActive: u.isActive,
    pendingActivation: !u.passwordHash && u.inviteCodeHash != null,
    awaitingTelegram:
      !u.passwordHash &&
      u.inviteCodeHash == null &&
      u.phone != null &&
      u.telegramId == null,
  }));
  return NextResponse.json({ users });
}
