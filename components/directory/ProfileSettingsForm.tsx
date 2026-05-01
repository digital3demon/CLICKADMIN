"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PROFILE_AVATAR_PRESETS,
  profileAvatarEmoji,
} from "@/lib/profile-avatar-presets";
import { CRM_PROFILE_AVATAR_CHANGED_EVENT } from "@/lib/crm-client-events";
import {
  KANBAN_TELEGRAM_PREF_LABELS,
  KANBAN_TELEGRAM_PREF_SECTIONS,
  type KanbanTelegramPrefKey,
} from "@/lib/kanban-telegram-prefs";
import { DEFAULT_TENANT_SLUG } from "@/lib/tenant-constants";

async function parseJsonResponse<T>(r: Response): Promise<
  | { ok: true; json: T }
  | { ok: false; message: string }
> {
  let text: string;
  try {
    text = await r.text();
  } catch {
    return { ok: false, message: "Не удалось прочитать ответ сервера" };
  }
  const trimmed = text.trim();
  if (!trimmed) {
    const hint =
      r.status >= 500
        ? " Часто это прокси (nginx) без тела ошибки или падение приложения до ответа: проверьте логи Node/PM2 и что на сервере выполнен prisma migrate deploy."
        : "";
    return {
      ok: false,
      message: `Пустой ответ сервера (HTTP ${r.status}).${hint}`,
    };
  }
  try {
    return { ok: true, json: JSON.parse(text) as T };
  } catch {
    return {
      ok: false,
      message: `Ответ не JSON (HTTP ${r.status}). Часто это HTML от прокси — проверьте логи nginx и приложения.`,
    };
  }
}

type ProfileUser = {
  id: string;
  displayName: string;
  email: string;
  avatarPresetId: string | null;
  avatarCustomMime: string | null;
  avatarCustomUploadedAt: string | null;
  mentionHandle: string | null;
  telegramLinked?: boolean;
  telegramUsername?: string | null;
  telegramKanbanNotifyPrefs?: Record<KanbanTelegramPrefKey, boolean>;
};

export function ProfileSettingsForm({
  telegramNotifyEnabled = false,
  telegramBotUsername = "",
  telegramTenantSlugForDeepLink = DEFAULT_TENANT_SLUG,
}: {
  /** Показать блок Telegram: нужен NEXT_PUBLIC_TELEGRAM_BOT_NAME и не демо. */
  telegramNotifyEnabled?: boolean;
  /** Имя бота с сервера (runtime .env), иначе в клиентском бандле без пересборки может быть пусто. */
  telegramBotUsername?: string;
  /** Поддомен/ slug организации для deep-link t.me/...?start= (мультиарендность). */
  telegramTenantSlugForDeepLink?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [mentionDraft, setMentionDraft] = useState("");
  const [avatarPresetId, setAvatarPresetId] = useState<string | null>(null);
  const [avatarCustomMime, setAvatarCustomMime] = useState<string | null>(null);
  const [avatarCustomUploadedAt, setAvatarCustomUploadedAt] = useState<string | null>(
    null,
  );
  const [avatarUploadBusy, setAvatarUploadBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [tgPrefs, setTgPrefs] = useState<Record<KanbanTelegramPrefKey, boolean> | null>(
    null,
  );
  const [tgBusy, setTgBusy] = useState(false);
  const [tgError, setTgError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ac = new AbortController();
    const timeoutId = window.setTimeout(() => ac.abort(), 30_000);
    try {
      const r = await fetch("/api/me/profile", {
        credentials: "include",
        signal: ac.signal,
      });
      const parsed = await parseJsonResponse<{ user?: ProfileUser; error?: string }>(r);
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      const j = parsed.json;
      if (!r.ok) {
        setError(j.error || "Не удалось загрузить профиль");
        return;
      }
      if (!j.user) {
        setError("Нет данных пользователя");
        return;
      }
      setUserId(j.user.id);
      setDisplayName(j.user.displayName);
      setEmail(j.user.email);
      setAvatarPresetId(j.user.avatarPresetId);
      setAvatarCustomMime(j.user.avatarCustomMime ?? null);
      setAvatarCustomUploadedAt(
        j.user.avatarCustomUploadedAt
          ? typeof j.user.avatarCustomUploadedAt === "string"
            ? j.user.avatarCustomUploadedAt
            : new Date(j.user.avatarCustomUploadedAt as unknown as Date).toISOString()
          : null,
      );
      setMentionDraft(j.user.mentionHandle ? `@${j.user.mentionHandle}` : "");
      setTelegramLinked(Boolean(j.user.telegramLinked));
      setTelegramUsername(j.user.telegramUsername ?? null);
      setTgPrefs(j.user.telegramKanbanNotifyPrefs ?? null);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError(
          "Профиль не загрузился за 30 с (сервер или БД не ответили). Обновите страницу или проверьте логи приложения.",
        );
      } else {
        setError("Ошибка сети");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const tg = p.get("tg");
    if (!tg) return;
    const ok: Record<string, string> = {
      linked: "Telegram привязан через бота.",
    };
    const err: Record<string, string> = {
      expired: "Ссылка из бота устарела. Снова откройте бота и нажмите /start.",
      taken: "Этот Telegram уже привязан к другому пользователю в CRM.",
      bad: "Неверная или уже использованная ссылка подтверждения.",
      err: "Не удалось завершить привязку.",
      config: "На сервере не задан TELEGRAM_BOT_TOKEN.",
      denied: "В этом режиме привязка недоступна.",
    };
    if (ok[tg]) {
      setOkMsg(ok[tg]);
      setError(null);
    } else if (err[tg]) {
      setError(err[tg]);
      setOkMsg(null);
    }
    void load();
    window.history.replaceState({}, "", window.location.pathname);
  }, [load]);

  const hasCustomAvatar = Boolean(avatarCustomMime);

  const uploadAvatar = async (file: File) => {
    setAvatarUploadBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetch("/api/me/avatar", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        user?: {
          avatarCustomMime?: string | null;
          avatarCustomUploadedAt?: string | null;
        };
      };
      if (!r.ok) {
        setError(j.error ?? "Не удалось загрузить фото");
        return;
      }
      if (j.user?.avatarCustomMime) {
        setAvatarCustomMime(j.user.avatarCustomMime);
        setAvatarCustomUploadedAt(j.user.avatarCustomUploadedAt ?? null);
      } else {
        await load();
      }
      setOkMsg("Фото профиля обновлено");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(CRM_PROFILE_AVATAR_CHANGED_EVENT));
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setAvatarUploadBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeCustomAvatar = async () => {
    setAvatarUploadBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      const r = await fetch("/api/me/avatar", {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setError(j.error ?? "Не удалось удалить фото");
        return;
      }
      setAvatarCustomMime(null);
      setAvatarCustomUploadedAt(null);
      setOkMsg("Своё фото удалено");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(CRM_PROFILE_AVATAR_CHANGED_EVENT));
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setAvatarUploadBusy(false);
    }
  };

  const toggleTgPref = async (key: KanbanTelegramPrefKey) => {
    if (!tgPrefs) return;
    const nextVal = !tgPrefs[key];
    setTgBusy(true);
    setTgError(null);
    try {
      const r = await fetch("/api/me/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramKanbanNotifyPrefs: { [key]: nextVal } }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        user?: ProfileUser;
        error?: string;
      };
      if (!r.ok) {
        setTgError(j.error ?? "Не сохранено");
        return;
      }
      if (j.user?.telegramKanbanNotifyPrefs) {
        setTgPrefs(j.user.telegramKanbanNotifyPrefs);
      }
    } catch {
      setTgError("Ошибка сети");
    } finally {
      setTgBusy(false);
    }
  };

  const unlinkTelegram = async () => {
    if (
      !window.confirm(
        "Отвязать Telegram? Уведомления в бот приходить перестанут.",
      )
    ) {
      return;
    }
    setTgBusy(true);
    setTgError(null);
    try {
      const r = await fetch("/api/me/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUnlink: true }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        user?: ProfileUser;
        error?: string;
      };
      if (!r.ok) {
        setTgError(j.error ?? "Не удалось отвязать");
        return;
      }
      setTelegramLinked(Boolean(j.user?.telegramLinked));
      setTelegramUsername(j.user?.telegramUsername ?? null);
      setTgPrefs(j.user?.telegramKanbanNotifyPrefs ?? null);
    } catch {
      setTgError("Ошибка сети");
    } finally {
      setTgBusy(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const rawHandle = mentionDraft.trim();
      const body: Record<string, unknown> = {
        displayName: displayName.trim(),
        avatarPresetId,
      };
      if (!rawHandle) {
        body.mentionHandle = null;
      } else {
        body.mentionHandle = rawHandle.startsWith("@") ? rawHandle.slice(1) : rawHandle;
      }
      const r = await fetch("/api/me/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const parsed = await parseJsonResponse<{ user?: ProfileUser; error?: string }>(r);
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      const j = parsed.json;
      if (!r.ok) {
        setError(j.error || "Не удалось сохранить");
        return;
      }
      if (j.user) {
        setUserId(j.user.id);
        setDisplayName(j.user.displayName);
        setAvatarPresetId(j.user.avatarPresetId);
        setAvatarCustomMime(j.user.avatarCustomMime ?? null);
        setAvatarCustomUploadedAt(
          j.user.avatarCustomUploadedAt
            ? typeof j.user.avatarCustomUploadedAt === "string"
              ? j.user.avatarCustomUploadedAt
              : new Date(j.user.avatarCustomUploadedAt as unknown as Date).toISOString()
            : null,
        );
        setMentionDraft(j.user.mentionHandle ? `@${j.user.mentionHandle}` : "");
        setTelegramLinked(Boolean(j.user.telegramLinked));
        setTelegramUsername(j.user.telegramUsername ?? null);
        setTgPrefs(j.user.telegramKanbanNotifyPrefs ?? null);
      }
      setOkMsg("Сохранено");
      setTimeout(() => setOkMsg(null), 3000);
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--text-secondary)]">Загрузка…</p>;
  }

  return (
    <div className="max-w-xl space-y-6">
      {error ? (
        <p className="rounded-lg border border-red-800/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {okMsg ? (
        <p className="rounded-lg border border-emerald-800/40 bg-emerald-950/25 px-3 py-2 text-sm text-emerald-100">
          {okMsg}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--card-border)] bg-[var(--surface-subtle)] text-4xl shadow-sm"
          aria-hidden
        >
          {hasCustomAvatar && userId ? (
            <img
              src={`/api/me/avatar?t=${encodeURIComponent(avatarCustomUploadedAt ?? "")}`}
              alt=""
              className="h-full w-full object-cover"
              onError={() => {
                setAvatarCustomMime(null);
                setAvatarCustomUploadedAt(null);
              }}
            />
          ) : (
            <span>{profileAvatarEmoji(avatarPresetId)}</span>
          )}
        </div>
        <div className="min-w-0 text-sm text-[var(--text-secondary)]">
          <div className="font-medium text-[var(--app-text)]">Аватар в интерфейсе</div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Кружок в меню и в профиле. Можно загрузить своё фото (JPEG, PNG или WebP, до ~600 КБ).
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--app-text)]">
          Почта
        </label>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{email}</p>
        {userId ? (
          <p className="mt-2 text-sm">
            <Link
              href={`/directory/profile/view/${encodeURIComponent(userId)}`}
              className="text-[var(--sidebar-blue)] hover:underline"
            >
              Как меня видят в журнале нарядов и контрагентов
            </Link>
          </p>
        ) : null}
      </div>

      {telegramNotifyEnabled ? (
        <div className="space-y-4 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-4">
          <div>
            <div className="text-sm font-semibold text-[var(--app-text)]">
              Telegram: уведомления о канбане CRM
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Вход в CRM только по почте и паролю. Здесь — привязка чата с ботом для
              оповещений о событиях канбана в CRM (по переключателям ниже). События
              Kaiten приходят из Kaiten, через CRM не дублируются.
            </p>
          </div>
          {telegramLinked ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Привязан:{" "}
              <span className="font-mono font-medium text-[var(--app-text)]">
                {telegramUsername?.trim()
                  ? `@${telegramUsername.replace(/^@+/, "")}`
                  : "Telegram"}
              </span>
            </p>
          ) : null}
          {tgError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{tgError}</p>
          ) : null}
          {!telegramLinked ? (
            <div className="space-y-4">
              <div className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Через бота (как в Kaiten)
                </p>
                <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs text-[var(--text-secondary)]">
                  <li>
                    Откройте бота и нажмите «Старт» / отправьте команду{" "}
                    <span className="font-mono text-[var(--app-text)]">/start</span>.
                  </li>
                  <li>Бот попросит почту — отправьте тот же email, что для входа в CRM (см. выше).</li>
                  <li>
                    Перейдите по ссылке из ответа бота в браузере; после этого привязка активна, бот
                    пришлёт подтверждение.
                  </li>
                </ol>
                {telegramBotUsername.trim() ? (
                  <p className="mt-3">
                    <a
                      href={`https://t.me/${encodeURIComponent(telegramBotUsername.replace(/^@+/, "").trim())}?start=${encodeURIComponent(telegramTenantSlugForDeepLink.trim() || DEFAULT_TENANT_SLUG)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
                    >
                      Открыть бота в Telegram
                    </a>
                  </p>
                ) : null}
                <p className="mt-2 text-[0.65rem] leading-snug text-[var(--text-muted)]">
                  На сервере должны быть заданы{" "}
                  <span className="font-mono">TELEGRAM_BOT_TOKEN</span>, публичный URL в{" "}
                  <span className="font-mono">CRM_PUBLIC_BASE_URL</span> и webhook на{" "}
                  <span className="font-mono">/api/telegram/webhook</span> с секретом{" "}
                  <span className="font-mono">TELEGRAM_WEBHOOK_SECRET</span> (тот же, что в{" "}
                  <span className="font-mono">setWebhook</span>). Проверка без секретов:{" "}
                  <a
                    href="/api/telegram/diagnostic"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[var(--sidebar-blue)] hover:underline"
                  >
                    /api/telegram/diagnostic
                  </a>{" "}
                  (в браузере откроется JSON; сам вебхук для Telegram — только POST).
                </p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={tgBusy}
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
              onClick={() => void unlinkTelegram()}
            >
              Отвязать Telegram
            </button>
          )}
          {telegramLinked && tgPrefs ? (
            <div className="space-y-4 border-t border-[var(--card-border)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Настройки уведомлений
              </p>
              {KANBAN_TELEGRAM_PREF_SECTIONS.map((sec) => (
                <div key={sec.id}>
                  <p className="text-xs font-medium text-[var(--text-body)]">{sec.title}</p>
                  <ul className="mt-2 divide-y divide-[var(--card-border)] rounded-md border border-[var(--card-border)] bg-[var(--card-bg)]">
                    {sec.keys.map((key) => (
                      <li
                        key={key}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                      >
                        <span className="text-[var(--app-text)]">
                          {KANBAN_TELEGRAM_PREF_LABELS[key]}
                        </span>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-[var(--input-border)] accent-[var(--sidebar-blue)] disabled:opacity-50"
                          checked={tgPrefs[key]}
                          disabled={tgBusy}
                          onChange={() => void toggleTgPref(key)}
                          aria-label={KANBAN_TELEGRAM_PREF_LABELS[key]}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text-[0.65rem] leading-snug text-[var(--text-muted)]">
                С сервера сейчас уходит рассылка при сохранении канбана CRM в наряд
                (колонка и тип карточки). Остальные пункты — на будущее.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="profile-display-name"
          className="block text-sm font-medium text-[var(--app-text)]"
        >
          Имя для отображения
        </label>
        <input
          id="profile-display-name"
          className="mt-1 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--app-text)]"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={120}
        />
      </div>

      <div>
        <div className="text-sm font-medium text-[var(--app-text)]">Пресеты (эмодзи)</div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Если загружено своё фото, оно показывается вместо эмодзи. Пресет всё равно можно выбрать
          на случай удаления фото.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadAvatar(f);
            }}
          />
          <button
            type="button"
            disabled={avatarUploadBusy}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-[var(--sidebar-blue)] bg-[var(--surface-hover)] px-3 py-2 text-sm font-medium text-[var(--sidebar-blue)] hover:opacity-95 disabled:opacity-50"
          >
            {avatarUploadBusy ? "Загрузка…" : "Загрузить фото"}
          </button>
          {hasCustomAvatar ? (
            <button
              type="button"
              disabled={avatarUploadBusy}
              onClick={() => void removeCustomAvatar()}
              className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)] disabled:opacity-50"
            >
              Удалить своё фото
            </button>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`rounded-lg border px-3 py-2 text-sm ${
              avatarPresetId === null
                ? "border-[var(--sidebar-blue)] bg-[var(--surface-hover)]"
                : "border-[var(--card-border)]"
            }`}
            onClick={() => setAvatarPresetId(null)}
          >
            Без пресета
          </button>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {PROFILE_AVATAR_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.label}
              className={`flex aspect-square items-center justify-center rounded-xl border text-2xl transition hover:bg-[var(--surface-hover)] ${
                avatarPresetId === p.id
                  ? "border-[var(--sidebar-blue)] ring-2 ring-[var(--sidebar-blue)]/40"
                  : "border-[var(--card-border)]"
              }`}
              onClick={() => setAvatarPresetId(p.id)}
            >
              <span aria-hidden>{p.emoji}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="profile-mention"
          className="block text-sm font-medium text-[var(--app-text)]"
        >
          Ник для @упоминаний
        </label>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Латиница, цифры и «_», 3–32 символа — для подписей в журнале и @упоминаний в
          интерфейсе.
        </p>
        <input
          id="profile-mention"
          className="mt-2 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 font-mono text-sm text-[var(--app-text)]"
          value={mentionDraft}
          onChange={(e) => setMentionDraft(e.target.value)}
          placeholder="@my_nick"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          className="rounded-lg bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-50"
          onClick={() => void save()}
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
        <button
          type="button"
          className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm hover:bg-[var(--surface-hover)]"
          onClick={() => void load()}
          disabled={saving}
        >
          Отменить изменения
        </button>
      </div>
    </div>
  );
}
