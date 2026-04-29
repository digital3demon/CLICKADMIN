"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { writeClientStorageBucket } from "@/lib/client-storage-bucket";

const inputClass =
  "mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

export function LoginPageClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextPath = sp.get("next")?.trim() || "/orders";
  const inactiveReason = sp.get("reason") === "inactive";

  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  /** null — ещё не знаем; true — portable / single-user, вход через API отключён */
  const [singleUserMode, setSingleUserMode] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [bootEmail, setBootEmail] = useState("");
  const [bootName, setBootName] = useState("");
  const [bootPassword, setBootPassword] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/status", { cache: "no-store" });
        const j = (await res.json().catch(() => ({}))) as {
          needsBootstrap?: boolean;
          singleUser?: boolean;
          error?: string;
        };
        if (cancelled) return;
        if (j.singleUser) {
          setSingleUserMode(true);
          setNeedsBootstrap(false);
          return;
        }
        setSingleUserMode(false);
        if (!res.ok) {
          setNeedsBootstrap(false);
          setError(
            j.error === "db"
              ? "База данных недоступна. Проверьте DATABASE_URL и что файл базы на месте."
              : "Не удалось проверить состояние входа. Обновите страницу.",
          );
          return;
        }
        setNeedsBootstrap(Boolean(j.needsBootstrap));
      } catch {
        if (!cancelled) {
          setSingleUserMode(false);
          setNeedsBootstrap(false);
          setError("Сеть или сервер недоступны");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const goNext = useCallback(
    (homePath?: string) => {
      const fallback = nextPath.startsWith("/") ? nextPath : "/orders";
      const dest =
        homePath && homePath.startsWith("/") ? homePath : fallback;
      router.replace(dest);
      router.refresh();
    },
    [router, nextPath],
  );

  const startDemo = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/demo/start", {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
        next?: string;
      };
      if (!res.ok) {
        const base = j.error ?? "Не удалось открыть демо";
        setError(
          j.detail && j.detail.trim()
            ? `${base}\n${j.detail.trim()}`
            : base,
        );
        return;
      }
      writeClientStorageBucket("demo");
      const dest =
        typeof j.next === "string" && j.next.startsWith("/") ? j.next : "/orders";
      router.replace(dest);
      router.refresh();
    } catch {
      setError("Сеть или сервер недоступны");
    } finally {
      setBusy(false);
    }
  }, [router]);

  const bootstrap = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/bootstrap-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: bootEmail.trim(),
          displayName: bootName.trim(),
          password: bootPassword,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Не удалось создать владельца");
        return;
      }
      writeClientStorageBucket("live");
      goNext();
    } catch {
      setError("Сеть или сервер недоступны");
    } finally {
      setBusy(false);
    }
  }, [bootEmail, bootName, bootPassword, goNext]);

  const submitLogin = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPwd,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        homePath?: string;
      };
      if (!res.ok) {
        setError(j.error ?? "Ошибка входа");
        return;
      }
      writeClientStorageBucket("live");
      goNext(j.homePath);
    } catch {
      setError("Сеть или сервер недоступны");
    } finally {
      setBusy(false);
    }
  }, [loginEmail, loginPwd, goNext]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold text-[var(--app-text)]">Вход в CRM</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Вход по почте и паролю. Первый раз после приглашения —{" "}
        <Link
          href="/login/activate"
          className="font-medium text-[var(--sidebar-blue)] hover:underline"
        >
          активация по коду
        </Link>
        .
      </p>

      {inactiveReason ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          Доступ к учётной записи отключён. Обратитесь к владельцу CRM.
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </div>
      ) : null}

      {singleUserMode === true ? (
        <section className="mt-8 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--app-text)]">
            Однопользовательский режим
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Вход отключён: CRM открывается сразу без почты и пароля. Перейдите к
            заказам или закройте эту вкладку.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => goNext()}
            className="mt-5 w-full rounded-md bg-[var(--sidebar-blue)] py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            Перейти к заказам
          </button>
        </section>
      ) : null}

      {singleUserMode === false && needsBootstrap === true ? (
        <section className="mt-8 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Первый запуск — создайте владельца
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Эта форма доступна один раз, пока в базе нет пользователей.
          </p>
          <label className="mt-4 block text-sm font-medium text-[var(--text-body)]">
            Почта
            <input
              type="email"
              className={inputClass}
              value={bootEmail}
              onChange={(e) => setBootEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-[var(--text-body)]">
            ФИО
            <input
              type="text"
              className={inputClass}
              value={bootName}
              onChange={(e) => setBootName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-[var(--text-body)]">
            Пароль (не короче 8 символов)
            <input
              type="password"
              className={inputClass}
              value={bootPassword}
              onChange={(e) => setBootPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void bootstrap()}
            className="mt-5 w-full rounded-md bg-[var(--sidebar-blue)] py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            {busy ? "Создание…" : "Создать владельца и войти"}
          </button>
        </section>
      ) : null}

      {singleUserMode === false && needsBootstrap === false ? (
        <section className="mt-8 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--app-text)]">Вход</h2>
          <label className="mt-3 block text-sm font-medium text-[var(--text-body)]">
            Почта
            <input
              type="email"
              className={inputClass}
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-[var(--text-body)]">
            Пароль
            <input
              type="password"
              className={inputClass}
              value={loginPwd}
              onChange={(e) => setLoginPwd(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submitLogin()}
            className="mt-5 w-full rounded-md bg-[var(--sidebar-blue)] py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            {busy ? "Вход…" : "Войти"}
          </button>
        </section>
      ) : null}

      {singleUserMode === false && needsBootstrap === false ? (
        <section className="mt-8 rounded-xl border border-dashed border-sky-300/80 bg-sky-50/40 px-5 py-5 shadow-sm dark:border-sky-800/50 dark:bg-sky-950/25">
          <h2 className="text-base font-semibold text-[var(--app-text)]">
            Демо-режим
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Отдельная база данных: наряды, клиенты и склад не пересекаются с вашей
            рабочей CRM. При выходе из демо данные сбрасываются к исходному сиду.
            Вход — как условный владелец (без почты и пароля).
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void startDemo()}
            className="mt-4 w-full rounded-md border border-sky-500/40 bg-white px-3 py-2.5 text-sm font-semibold text-sky-900 shadow-sm hover:bg-sky-50 disabled:opacity-50 dark:bg-sky-950/40 dark:text-sky-50 dark:hover:bg-sky-900/50"
          >
            {busy ? "Запуск…" : "Открыть демо"}
          </button>
        </section>
      ) : null}

      {singleUserMode === null && needsBootstrap === null && !error ? (
        <p className="mt-8 text-sm text-[var(--text-muted)]">Загрузка…</p>
      ) : null}
    </div>
  );
}
