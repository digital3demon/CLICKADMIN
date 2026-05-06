"use client";

import {
  ADMIN_SHARED_MESSENGER_NOTIFY_KEYS,
  ADMIN_SHARED_MESSENGER_PREF_LABELS,
  type AdminSharedMessengerNotifyKey,
  mergeAdminSharedMessengerNotifyPrefs,
} from "@/lib/admin-shared-messenger-prefs";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  canEdit: boolean;
  telegramBotUsername: string;
};

export function AdminMessengerTenantSettings({
  canEdit,
  telegramBotUsername,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linked, setLinked] = useState(false);
  const [tgUsername, setTgUsername] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Record<
    AdminSharedMessengerNotifyKey,
    boolean
  > | null>(null);
  const widgetMountRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!canEdit) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/tenant/admin-shared-messenger", {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        linked?: boolean;
        telegramUsername?: string | null;
        notifyPrefs?: Record<string, boolean>;
      };
      if (!r.ok) {
        setError(j.error ?? "Не удалось загрузить");
        setPrefs(null);
        return;
      }
      setLinked(Boolean(j.linked));
      setTgUsername(j.telegramUsername ?? null);
      setPrefs(mergeAdminSharedMessengerNotifyPrefs(j.notifyPrefs));
    } catch {
      setError("Сеть");
      setPrefs(null);
    } finally {
      setLoading(false);
    }
  }, [canEdit]);

  useEffect(() => {
    void load();
  }, [load]);

  const persistPref = async (key: AdminSharedMessengerNotifyKey, value: boolean) => {
    if (!prefs) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/tenant/admin-shared-messenger", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminSharedMessengerNotifyPrefs: { [key]: value },
        }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        notifyPrefs?: Record<AdminSharedMessengerNotifyKey, boolean>;
      };
      if (!r.ok) {
        setError(j.error ?? "Не сохранено");
        return;
      }
      if (j.notifyPrefs) {
        setPrefs(mergeAdminSharedMessengerNotifyPrefs(j.notifyPrefs));
      }
    } catch {
      setError("Сеть");
    } finally {
      setSaving(false);
    }
  };

  const unlink = async () => {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/tenant/admin-shared-messenger/unlink", {
        method: "POST",
        credentials: "include",
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setError(j.error ?? "Не отвязано");
        return;
      }
      setLinked(false);
      setTgUsername(null);
      await load();
    } catch {
      setError("Сеть");
    } finally {
      setSaving(false);
    }
  };

  const bot = telegramBotUsername.replace(/^@+/, "").trim();

  useEffect(() => {
    if (!canEdit || linked || !bot) return;
    const el = widgetMountRef.current;
    if (!el) return;

    const w = window as unknown as {
      adminSharedMessengerOnAuth?: (user: Record<string, unknown>) => void;
    };
    w.adminSharedMessengerOnAuth = async (user: Record<string, unknown>) => {
      setSaving(true);
      setError(null);
      try {
        const r = await fetch("/api/tenant/admin-shared-messenger/link-telegram", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        if (!r.ok) {
          setError(j.error ?? "Не привязано");
          return;
        }
        await load();
      } catch {
        setError("Сеть");
      } finally {
        setSaving(false);
      }
    };

    el.innerHTML = "";
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.async = true;
    s.setAttribute("data-telegram-login", bot);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-onauth", "adminSharedMessengerOnAuth");
    s.setAttribute("data-request-access", "write");
    el.appendChild(s);

    return () => {
      delete w.adminSharedMessengerOnAuth;
      el.innerHTML = "";
    };
  }, [canEdit, linked, bot, load]);

  if (!canEdit) return null;

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
      <h2 className="m-0 text-base font-semibold text-[var(--app-text)]">
        Мессенджер для админов
      </h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Общий Telegram-аккаунт администраторов (без привязки к пользователю CRM). На него
        можно направлять отдельные уведомления; команды отгрузок и сроков канбана в боте
        доступны с этого чата. Позже можно будет добавить другие каналы.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Загрузка…</p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-md border border-red-800/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {!loading && !bot ? (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
          Задайте на сервере{" "}
          <span className="font-mono">NEXT_PUBLIC_TELEGRAM_BOT_NAME</span> — имя бота для
          виджета входа Telegram.
        </p>
      ) : null}

      {!loading && prefs ? (
        <div className="mt-4 space-y-4">
          {linked ? (
            <>
              <p className="text-sm text-[var(--text-secondary)]">
                Привязан общий чат:{" "}
                <span className="font-mono font-medium text-[var(--app-text)]">
                  {tgUsername?.trim()
                    ? `@${tgUsername.replace(/^@+/, "")}`
                    : "Telegram"}
                </span>
              </p>
              <button
                type="button"
                disabled={saving}
                className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                onClick={() => void unlink()}
              >
                Отвязать общий Telegram
              </button>

              <div className="border-t border-[var(--card-border)] pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Уведомления на общий аккаунт
                </p>
                <ul className="mt-2 divide-y divide-[var(--card-border)] rounded-md border border-[var(--card-border)] bg-[var(--card-bg)]">
                  {ADMIN_SHARED_MESSENGER_NOTIFY_KEYS.map((key) => (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                    >
                      <span className="text-[var(--app-text)]">
                        {ADMIN_SHARED_MESSENGER_PREF_LABELS[key]}
                      </span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[var(--input-border)] accent-[var(--sidebar-blue)] disabled:opacity-50"
                        checked={prefs[key]}
                        disabled={saving}
                        onChange={() => void persistPref(key, !prefs[key])}
                        aria-label={ADMIN_SHARED_MESSENGER_PREF_LABELS[key]}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--text-secondary)]">
                Нажмите кнопку Telegram ниже и подтвердите вход тем аккаунтом, который будет
                общим рабочим чатом администраторов.
              </p>
              <div ref={widgetMountRef} className="mt-2 min-h-[44px]" />
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
