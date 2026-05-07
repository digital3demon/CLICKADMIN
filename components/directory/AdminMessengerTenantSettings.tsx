"use client";

import {
  ADMIN_SHARED_MESSENGER_NOTIFY_KEYS,
  ADMIN_SHARED_MESSENGER_PREF_LABELS,
  type AdminSharedMessengerNotifyKey,
  mergeAdminSharedMessengerNotifyPrefs,
} from "@/lib/admin-shared-messenger-prefs";
import {
  looksLikeTelegramBotUsername,
  normalizeTelegramBotUsername,
} from "@/lib/telegram-bot-username";
import {
  DEFAULT_KANBAN_ADMIN_MENTION_TAG,
  normalizeKanbanAdminMentionTag,
} from "@/lib/kanban-admin-mention";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  canEdit: boolean;
  telegramBotUsername: string;
  canEditKanbanAdminTag?: boolean;
};

export function AdminMessengerTenantSettings({
  canEdit,
  telegramBotUsername,
  canEditKanbanAdminTag = false,
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
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const [widgetReloadKey, setWidgetReloadKey] = useState(0);
  const [botFallbackLink, setBotFallbackLink] = useState<string | null>(null);
  const [botFallbackCommand, setBotFallbackCommand] = useState<string | null>(null);
  const [botFallbackBusy, setBotFallbackBusy] = useState(false);
  const [labTagDraft, setLabTagDraft] = useState(DEFAULT_KANBAN_ADMIN_MENTION_TAG);
  const [labTagSaving, setLabTagSaving] = useState(false);
  const [labTagError, setLabTagError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!canEditKanbanAdminTag) return;
    let cancelled = false;
    void fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then(
        (j: {
          user?: unknown;
          tenant?: { kanbanAdminMentionTag?: string | null };
        }) => {
          if (cancelled || !j?.user) return;
          setLabTagDraft(
            normalizeKanbanAdminMentionTag(j.tenant?.kanbanAdminMentionTag ?? null),
          );
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canEditKanbanAdminTag]);

  const persistLabTag = async () => {
    if (!canEditKanbanAdminTag) return;
    setLabTagSaving(true);
    setLabTagError(null);
    try {
      const trimmed = labTagDraft.trim();
      const res = await fetch("/api/tenant/kanban-admin-mention-tag", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kanbanAdminMentionTag: trimmed.length === 0 ? null : trimmed,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        kanbanAdminMentionTag?: string | null;
      };
      if (!res.ok) {
        setLabTagError(j.error ?? "Не сохранено");
        return;
      }
      setLabTagDraft(normalizeKanbanAdminMentionTag(j.kanbanAdminMentionTag ?? null));
    } catch {
      setLabTagError("Сеть");
    } finally {
      setLabTagSaving(false);
    }
  };

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

  const prepareBotFallback = useCallback(async () => {
    setBotFallbackBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/tenant/admin-shared-messenger/link-via-bot", {
        method: "POST",
        credentials: "include",
      });
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        deepLink?: string;
        command?: string;
      };
      if (!r.ok) {
        setError(j.error ?? "Не удалось создать ссылку для привязки");
        return;
      }
      setBotFallbackLink(j.deepLink ?? null);
      setBotFallbackCommand(j.command ?? null);
    } catch {
      setError("Сеть");
    } finally {
      setBotFallbackBusy(false);
    }
  }, []);

  const bot = normalizeTelegramBotUsername(telegramBotUsername);
  const botLooksValid = looksLikeTelegramBotUsername(bot);

  useEffect(() => {
    if (!canEdit || linked || !botLooksValid || loading || !prefs) return;
    const el = widgetMountRef.current;
    if (!el) return;
    setWidgetError(null);

    const w = window as unknown as {
      adminSharedMessengerOnAuth?: (user: Record<string, unknown>) => void;
    };
    /** Telegram Login Widget вызывает функцию из data-onauth — см. https://core.telegram.org/widgets/login */
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
    s.setAttribute("data-onauth", "adminSharedMessengerOnAuth(user)");
    s.setAttribute("data-request-access", "write");
    s.onerror = () => {
      setWidgetError(
        "Не удалось загрузить Telegram Login Widget. Проверьте интернет/блокировщики и попробуйте ещё раз.",
      );
    };
    el.appendChild(s);
    const healthTimer = window.setTimeout(() => {
      const hasWidget = Boolean(el.querySelector("iframe"));
      if (!hasWidget) {
        setWidgetError(
          "Кнопка Telegram не отрисовалась. Обычно это неверный NEXT_PUBLIC_TELEGRAM_BOT_NAME (должно быть имя бота, например MyLabBot, без @ и без ссылки).",
        );
      }
    }, 2200);

    return () => {
      window.clearTimeout(healthTimer);
      delete w.adminSharedMessengerOnAuth;
      el.innerHTML = "";
    };
  }, [canEdit, linked, bot, botLooksValid, load, loading, prefs, widgetReloadKey]);

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
          ) : !bot ? (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              Кнопка входа Telegram здесь появится после настройки переменной окружения{" "}
              <span className="font-mono">NEXT_PUBLIC_TELEGRAM_BOT_NAME</span> (имя бота без
              @), пересборки фронта и деплоя. Без неё виджет не создаётся.
            </p>
          ) : !botLooksValid ? (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              Неверный формат <span className="font-mono">NEXT_PUBLIC_TELEGRAM_BOT_NAME</span>.
              Укажите username бота (например{" "}
              <span className="font-mono">MyLabBot</span>) без @ и без URL.
            </p>
          ) : (
            <>
              <p className="text-sm text-[var(--text-secondary)]">
                Нажмите кнопку Telegram ниже и подтвердите вход тем аккаунтом, который будет
                общим рабочим чатом администраторов.
              </p>
              <div ref={widgetMountRef} className="mt-2 min-h-[44px]" />
              {widgetError ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {widgetError}
                  </p>
                  <button
                    type="button"
                    className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--surface-hover)]"
                    onClick={() => setWidgetReloadKey((n) => n + 1)}
                  >
                    Повторить виджет
                  </button>
                </div>
              ) : null}
              <div className="mt-3 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Резервный вход без виджета
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Если кнопка Telegram не отображается из-за блокировки сети, используйте
                  привязку через бота по одноразовой ссылке.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={botFallbackBusy}
                    className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                    onClick={() => void prepareBotFallback()}
                  >
                    {botFallbackBusy ? "Готовлю ссылку..." : "Получить ссылку привязки"}
                  </button>
                  {botFallbackLink ? (
                    <a
                      href={botFallbackLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-[var(--sidebar-blue)] hover:underline"
                    >
                      Открыть бота и привязать
                    </a>
                  ) : null}
                </div>
                {botFallbackCommand ? (
                  <p className="mt-2 break-all text-[11px] text-[var(--text-secondary)]">
                    Если ссылка не открывается, отправьте боту команду:{" "}
                    <span className="font-mono text-[var(--app-text)]">{botFallbackCommand}</span>
                  </p>
                ) : null}
              </div>
            </>
          )}
          <div className="border-t border-[var(--card-border)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Чат канбана и Kaiten
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Общий тег упоминания команды лаборатории. Пусто = стандартный тег
              «{DEFAULT_KANBAN_ADMIN_MENTION_TAG}».
            </p>
            <label className="mt-2 block max-w-md text-sm">
              <span className="mb-1 block text-[var(--text-secondary)]">
                Токен без «@» (латиница, 2–32 символа)
              </span>
              <input
                type="text"
                value={labTagDraft}
                disabled={!canEditKanbanAdminTag || labTagSaving}
                onChange={(e) => setLabTagDraft(e.target.value)}
                onBlur={() => void persistLabTag()}
                placeholder={DEFAULT_KANBAN_ADMIN_MENTION_TAG}
                className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 font-mono text-[var(--app-text)] disabled:opacity-60"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            {labTagError ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{labTagError}</p>
            ) : null}
            {!canEditKanbanAdminTag ? (
              <p className="mt-2 text-[0.75rem] text-[var(--text-muted)]">
                Изменить тег могут владелец, старший администратор или администратор.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
