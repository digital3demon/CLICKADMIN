import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { UsersDirectoryClient } from "@/components/directory/UsersDirectoryClient";
import { getPrisma } from "@/lib/get-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { canChangeUserRoles, canManageUsers } from "@/lib/auth/permissions";
import { isSingleUserPortable } from "@/lib/auth/single-user";

export const dynamic = "force-dynamic";

export default async function DirectoryUsersPage() {
  if (isSingleUserPortable()) redirect("/directory");
  const s = await getSessionFromCookies();
  if (!s) redirect("/login?next=/directory/users");
  if (!canManageUsers(s.role)) redirect("/directory");

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

  const initialUsers = rows.map((u) => ({
    id: u.id,
    email: u.email,
    phone: u.phone,
    displayName: u.displayName,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    isActive: u.isActive,
    pendingActivation: !u.passwordHash && u.inviteCodeHash != null,
    awaitingTelegram:
      !u.passwordHash &&
      u.inviteCodeHash == null &&
      u.phone != null &&
      u.telegramId == null,
  }));

  return (
    <ModuleFrame
      title="Пользователи"
      description="Приглашение по телефону: сотрудник на /login вводит тот же номер и входит через Telegram. Классическое приглашение по почте — код и /login/activate. Отключение — в таблице. Смена роли у уже созданных пользователей — только владелец, через подтверждение в окне «Смена роли»."
    >
      <UsersDirectoryClient
        initialUsers={initialUsers}
        currentUserId={s.sub}
        canChangeUserRoles={canChangeUserRoles(s.role)}
      />
      <p className="mt-8 text-sm">
        <Link
          href="/directory"
          className="text-[var(--sidebar-blue)] hover:underline"
        >
          ← Конфигурация
        </Link>
      </p>
    </ModuleFrame>
  );
}
