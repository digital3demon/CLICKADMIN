"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { UserRole } from "@prisma/client";
import {
  ALL_USER_ROLES,
  INVITABLE_ROLES,
  USER_ROLE_LABELS,
} from "@/lib/user-role-labels";

export type UserDirectoryRow = {
  id: string;
  email: string;
  phone: string | null;
  displayName: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
  pendingActivation: boolean;
  awaitingTelegram: boolean;
};

const inputClass =
  "mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
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

function statusLabel(u: UserDirectoryRow): string {
  if (!u.isActive) return "Отключён";
  if (u.pendingActivation) return "Ожидает кода";
  if (u.awaitingTelegram) return "Нет привязки Telegram";
  return "Активен";
}

type UsersDirectoryClientProps = {
  initialUsers: UserDirectoryRow[];
  currentUserId: string;
  /** Смена роли в таблице: только владелец, через отдельное подтверждение в модальном окне. */
  canChangeUserRoles: boolean;
  canInviteUsers: boolean;
};

export function UsersDirectoryClient({
  initialUsers,
  currentUserId,
  canChangeUserRoles,
  canInviteUsers,
}: UsersDirectoryClientProps) {
  const [users, setUsers] = useState<UserDirectoryRow[]>(initialUsers);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [roleBusyId, setRoleBusyId] = useState<string | null>(null);
  const [roleModal, setRoleModal] = useState<{
    id: string;
    displayName: string;
    role: UserRole;
  } | null>(null);
  const [rolePick, setRolePick] = useState<UserRole>("ADMINISTRATOR");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [inviteByEmail, setInviteByEmail] = useState(false);
  const [role, setRole] = useState<UserRole>("ADMINISTRATOR");

  const reload = useCallback(async () => {
    const res = await fetch("/api/users", { cache: "no-store" });
    if (!res.ok) return;
    const j = (await res.json()) as { users: UserDirectoryRow[] };
    setUsers(
      j.users.map((u) => ({
        ...u,
        phone: u.phone ?? null,
        awaitingTelegram: Boolean(u.awaitingTelegram),
        createdAt:
          typeof u.createdAt === "string"
            ? u.createdAt
            : new Date(u.createdAt as unknown as Date).toISOString(),
        lastLoginAt: u.lastLoginAt
          ? typeof u.lastLoginAt === "string"
            ? u.lastLoginAt
            : new Date(u.lastLoginAt as unknown as Date).toISOString()
          : null,
      })),
    );
  }, []);

  const patchUserRole = useCallback(
    async (id: string, nextRole: UserRole): Promise<boolean> => {
      setError(null);
      setOkMsg(null);
      setRoleBusyId(id);
      try {
        const res = await fetch(`/api/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ role: nextRole }),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(j.error ?? "Не удалось сменить роль");
          await reload();
          return false;
        }
        setOkMsg("Роль обновлена");
        await reload();
        return true;
      } catch {
        setError("Сеть или сервер недоступны");
        return false;
      } finally {
        setRoleBusyId(null);
      }
    },
    [reload],
  );

  const deleteUser = useCallback(
    async (id: string, displayName: string) => {
      if (
        !window.confirm(
          `Удалить пользователя «${displayName}» из CRM безвозвратно?\n\nСвязанные записи в журналах (наряды, контрагенты) останутся, поле «кто сделал» у старых записей обнулится.`,
        )
      ) {
        return;
      }
      setError(null);
      setOkMsg(null);
      const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Не удалось удалить");
        return;
      }
      setOkMsg("Пользователь удалён");
      await reload();
    },
    [reload],
  );

  const setActive = useCallback(
    async (id: string, isActive: boolean) => {
      setError(null);
      setOkMsg(null);
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Не удалось обновить пользователя");
        return;
      }
      setOkMsg(isActive ? "Пользователь включён" : "Пользователь отключён");
      await reload();
    },
    [reload],
  );

  const submitInvite = useCallback(async () => {
    setError(null);
    setOkMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(
          inviteByEmail ? { email, role } : { phone, role },
        ),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        inviteCode?: string;
        hint?: string;
        emailSent?: boolean;
      };
      if (!res.ok) {
        setError(j.error ?? "Не удалось создать приглашение");
        return;
      }
      if (inviteByEmail) {
        if (j.emailSent) {
          setOkMsg(
            j.hint ??
              "На почту сотрудника отправлено письмо с кодом и ссылкой на активацию.",
          );
        } else {
          const code = j.inviteCode ? ` Код: ${j.inviteCode}.` : "";
          setOkMsg(
            (j.hint ? `${j.hint} ` : "") +
              `Пользователь сохранён.${code} Первый вход: /login/activate`,
          );
        }
      } else {
        setOkMsg(
          j.hint ??
            "Пользователь сохранён. Передайте сотруднику номер и инструкцию по активации (код). Вход в CRM — по почте и паролю; Telegram привязывается в профиле для уведомлений.",
        );
      }
      setEmail("");
      setPhone("");
      setRole("ADMINISTRATOR");
      setInviteOpen(false);
      await reload();
    } catch {
      setError("Сеть или сервер недоступны");
    } finally {
      setBusy(false);
    }
  }, [email, phone, inviteByEmail, reload, role]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {canInviteUsers ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setOkMsg(null);
              setInviteByEmail(false);
              setInviteOpen(true);
            }}
            className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
          >
            Пригласить
          </button>
        ) : (
          <span className="text-sm text-[var(--text-muted)]">
            Приглашения отключены для вашей роли.
          </span>
        )}
        {okMsg ? (
          <span className="max-w-xl text-sm text-emerald-700 dark:text-emerald-400">
            {okMsg}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--card-border)] text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">ФИО</th>
              <th className="px-4 py-3 font-medium">Почта</th>
              <th className="px-4 py-3 font-medium">Телефон</th>
              <th className="px-4 py-3 font-medium">Роль</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium">Создан</th>
              <th className="px-4 py-3 font-medium">Последний вход</th>
              <th className="px-4 py-3 font-medium">Профиль</th>
              <th className="px-4 py-3 font-medium">Доступ</th>
              <th className="px-4 py-3 font-medium">Удаление</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)] text-[var(--app-text)]">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">{u.displayName}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {u.phone ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex max-w-[16rem] flex-col items-stretch gap-1.5">
                    <span className="font-medium text-[var(--app-text)]">
                      {USER_ROLE_LABELS[u.role]}
                    </span>
                    {canChangeUserRoles ? (
                      <button
                        type="button"
                        disabled={roleBusyId === u.id}
                        className="w-fit rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-2 py-1 text-left text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
                        onClick={() => {
                          setError(null);
                          setOkMsg(null);
                          setRolePick(u.role);
                          setRoleModal({
                            id: u.id,
                            displayName: u.displayName,
                            role: u.role,
                          });
                        }}
                      >
                        Изменить роль…
                      </button>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {statusLabel(u)}
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {formatDate(u.createdAt)}
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {formatDate(u.lastLoginAt)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/directory/profile/view/${encodeURIComponent(u.id)}`}
                    className="text-[var(--sidebar-blue)] hover:underline"
                  >
                    Журнал
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {u.id === currentUserId ? (
                    <span className="text-[var(--text-muted)]">—</span>
                  ) : u.isActive ? (
                    <button
                      type="button"
                      className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-50 dark:border-red-900/50 dark:text-red-200 dark:hover:bg-red-950/40"
                      onClick={() => void setActive(u.id, false)}
                    >
                      Отключить
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded border border-[var(--card-border)] px-2 py-1 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--surface-muted)]"
                      onClick={() => void setActive(u.id, true)}
                    >
                      Включить
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.id === currentUserId ? (
                    <span className="text-[var(--text-muted)]">—</span>
                  ) : (
                    <button
                      type="button"
                      className="rounded border border-red-800/40 px-2 py-1 text-xs font-medium text-red-900 hover:bg-red-50 dark:border-red-700/50 dark:text-red-200 dark:hover:bg-red-950/40"
                      onClick={() => void deleteUser(u.id, u.displayName)}
                    >
                      Удалить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {roleModal ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => {
            if (roleBusyId === roleModal.id) return;
            setRoleModal(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-change-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="role-change-title"
              className="text-lg font-semibold text-[var(--app-text)]"
            >
              Смена роли
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Пользователь:{" "}
              <span className="font-medium text-[var(--app-text)]">
                {roleModal.displayName}
              </span>
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Сейчас:{" "}
              <span className="text-[var(--app-text)]">
                {USER_ROLE_LABELS[roleModal.role]}
              </span>
            </p>
            <label className="mt-4 block text-sm font-medium text-[var(--text-body)]">
              Новая роль
              <select
                className={inputClass}
                value={rolePick}
                disabled={roleBusyId === roleModal.id}
                onChange={(e) => setRolePick(e.target.value as UserRole)}
              >
                {ALL_USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {USER_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
              Кнопка «Сменить роль» подтверждает изменение. Права доступа обновятся
              сразу после успешного ответа сервера.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={roleBusyId === roleModal.id}
                onClick={() => setRoleModal(null)}
                className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={
                  roleBusyId === roleModal.id || rolePick === roleModal.role
                }
                onClick={() => {
                  void (async () => {
                    const ok = await patchUserRole(roleModal.id, rolePick);
                    if (ok) setRoleModal(null);
                  })();
                }}
                className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
              >
                {roleBusyId === roleModal.id ? "Сохранение…" : "Сменить роль"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {inviteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-title"
        >
          <div className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-lg">
            <h2
              id="invite-title"
              className="text-lg font-semibold text-[var(--app-text)]"
            >
              Пригласить пользователя
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {inviteByEmail
                ? "На почту уйдёт письмо с кодом. ФИО сотрудник укажет сам в «Справочники → Профиль» после входа."
                : "Номер заносится в учётную запись. ФИО сотрудник укажет в «Справочники → Профиль». Вход через Telegram — см. инструкцию после сохранения."}
            </p>

            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="invite-kind"
                  checked={!inviteByEmail}
                  onChange={() => setInviteByEmail(false)}
                />
                По телефону (без почты в приглашении)
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="invite-kind"
                  checked={inviteByEmail}
                  onChange={() => setInviteByEmail(true)}
                />
                По почте (код)
              </label>
            </div>

            {inviteByEmail ? (
              <label className="mt-4 block text-sm font-medium text-[var(--text-body)]">
                Почта
                <input
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                />
              </label>
            ) : (
              <label className="mt-4 block text-sm font-medium text-[var(--text-body)]">
                Телефон (российский, с 9… или 8…)
                <input
                  type="tel"
                  className={inputClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="+7 …"
                />
              </label>
            )}
            <label className="mt-3 block text-sm font-medium text-[var(--text-body)]">
              Роль
              <select
                className={inputClass}
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                {INVITABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {USER_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setInviteOpen(false)}
                className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitInvite()}
                className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
              >
                {busy ? "Сохранение…" : "Создать приглашение"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
