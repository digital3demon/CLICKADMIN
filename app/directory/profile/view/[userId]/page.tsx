import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { getPrisma } from "@/lib/get-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { USER_ROLE_LABELS } from "@/lib/user-role-labels";
import { profileAvatarEmoji } from "@/lib/profile-avatar-presets";
import { userActivityDisplayLabel } from "@/lib/user-activity-display-label";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import type { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

function formatWhen(iso: Date): string {
  try {
    return iso.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default async function UserProfileViewPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const session = await getSessionFromCookies();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/directory/profile/view/${userId}`)}`);

  const prisma = await getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      displayName: true,
      email: true,
      role: true,
      mentionHandle: true,
      avatarPresetId: true,
      avatarCustomMime: true,
      avatarCustomUploadedAt: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
  if (!user) notFound();

  const isOwnerViewer = session.role === "OWNER";
  const isSelf = session.sub === user.id;
  const showEmail = isOwnerViewer || isSelf;

  const [orderRows, contractorRows] = await Promise.all([
    prisma.orderRevision.findMany({
      where: { actorUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        createdAt: true,
        summary: true,
        kind: true,
        actorLabel: true,
        order: { select: { id: true, orderNumber: true } },
      },
    }),
    prisma.contractorRevision.findMany({
      where: { actorUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        createdAt: true,
        summary: true,
        kind: true,
        actorLabel: true,
        clinic: { select: { id: true, name: true } },
        doctor: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  type Line = {
    key: string;
    at: Date;
    href: string;
    title: string;
    summary: string;
    kind: string;
    sub?: string;
  };

  const lines: Line[] = [
    ...orderRows.map((r) => ({
      key: `o-${r.id}`,
      at: r.createdAt,
      href: `/orders/${r.order.id}`,
      title: `Наряд ${r.order.orderNumber}`,
      summary: r.summary,
      kind: r.kind,
    })),
    ...contractorRows.map((r) => {
      const sub = r.clinic
        ? `Клиника: ${r.clinic.name}`
        : r.doctor
          ? `Врач: ${r.doctor.fullName}`
          : "";
      return {
        key: `c-${r.id}`,
        at: r.createdAt,
        href: r.clinic
          ? `/clients/${r.clinic.id}`
          : r.doctor
            ? `/clients/doctors/${r.doctor.id}`
            : "/clients",
        title: r.clinic ? "Клиника" : r.doctor ? "Врач" : "Контрагент",
        summary: r.summary,
        kind: r.kind,
        sub: sub || undefined,
      };
    }),
  ];

  lines.sort((a, b) => b.at.getTime() - a.at.getTime());
  const top = lines.slice(0, 100);

  const nick = userActivityDisplayLabel(user);
  const emoji = profileAvatarEmoji(user.avatarPresetId);
  const avatarSrc =
    user.avatarCustomMime && user.avatarCustomUploadedAt
      ? `/api/user-avatars/${encodeURIComponent(user.id)}?v=${user.avatarCustomUploadedAt.getTime()}`
      : null;

  return (
    <ModuleFrame
      title={isSelf ? "Мой профиль (просмотр)" : `Профиль: ${user.displayName}`}
      description="Журнал действий в базе CRM: наряды и карточки контрагентов. Внутренний канбан в браузере здесь не отображается."
    >
      <div className="flex flex-wrap items-start gap-6 border-b border-[var(--card-border)] pb-6">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] text-3xl"
          aria-hidden
        >
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            emoji
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <div className="text-lg font-semibold text-[var(--app-text)]">{user.displayName}</div>
          <div className="text-[var(--text-secondary)]">
            Подпись в журналах:{" "}
            <span className="font-medium text-[var(--app-text)]">{nick}</span>
          </div>
          <div className="text-[var(--text-muted)]">
            Роль: {USER_ROLE_LABELS[user.role as UserRole]}
            {user.isActive ? "" : " · отключён"}
          </div>
          {showEmail ? (
            <div className="text-[var(--text-secondary)]">
              Почта: <span className="select-all">{user.email}</span>
            </div>
          ) : (
            <div className="text-xs text-[var(--text-muted)]">
              Почта скрыта (видна только владельцу и самому пользователю).
            </div>
          )}
          <div className="text-xs text-[var(--text-muted)]">
            В CRM с {formatWhen(user.createdAt)}
            {user.lastLoginAt ? ` · последний вход ${formatWhen(user.lastLoginAt)}` : ""}
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          {isSelf ? (
            <Link
              href="/directory/profile"
              className="rounded-lg border border-[var(--card-border)] px-3 py-2 font-medium text-[var(--sidebar-blue)] hover:bg-[var(--surface-hover)]"
            >
              Редактировать профиль
            </Link>
          ) : null}
          {!isSingleUserPortable() && isOwnerViewer ? (
            <Link
              href="/directory/users"
              className="text-[var(--sidebar-blue)] hover:underline"
            >
              ← К списку пользователей
            </Link>
          ) : (
            <Link href="/directory" className="text-[var(--sidebar-blue)] hover:underline">
              ← К конфигурации
            </Link>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-[var(--app-text)]">Журнал (наряды и контрагенты)</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Изменения по нарядам (в т.ч. поля Кайтен в CRM) и по клиникам/врачам. Записи без привязки к учётке
          (до обновления системы) в этом списке не показываются.
        </p>
        {top.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            Пока нет событий с привязкой к этой учётной записи.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--card-border)] rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
            {top.map((row) => (
              <li key={row.key} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    href={row.href}
                    className="font-medium text-[var(--sidebar-blue)] hover:underline"
                  >
                    {row.title}
                  </Link>
                  <time className="text-xs text-[var(--text-muted)]" dateTime={row.at.toISOString()}>
                    {formatWhen(row.at)}
                  </time>
                </div>
                {row.sub ? (
                  <div className="mt-0.5 text-xs text-[var(--text-muted)]">{row.sub}</div>
                ) : null}
                <div className="mt-1 text-sm text-[var(--text-secondary)]">{row.summary}</div>
                <div className="mt-1 text-[0.65rem] uppercase tracking-wide text-[var(--text-muted)]">
                  {row.kind}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ModuleFrame>
  );
}
