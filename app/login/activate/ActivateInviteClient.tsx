"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

const inputClass =
  "mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

export function ActivateInviteClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async () => {
    setError(null);
    if (pwd !== pwd2) {
      setError("Пароли не совпадают");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/activate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          password: pwd,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        homePath?: string;
      };
      if (!res.ok) {
        setError(j.error ?? "Не удалось активировать");
        return;
      }
      const dest =
        j.homePath && j.homePath.startsWith("/") ? j.homePath : "/orders";
      router.replace(dest);
      router.refresh();
    } catch {
      setError("Сеть или сервер недоступны");
    } finally {
      setBusy(false);
    }
  }, [code, email, pwd, pwd2, router]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold text-[var(--app-text)]">
        Активация по коду
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Введите почту, код из приглашения (10 символов) и придумайте пароль для
        входа. Потом используйте обычную страницу{" "}
        <Link href="/login" className="text-[var(--sidebar-blue)] hover:underline">
          «Вход»
        </Link>
        .
      </p>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </div>
      ) : null}

      <section className="mt-8 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
        <label className="block text-sm font-medium text-[var(--text-body)]">
          Почта (как при приглашении)
          <input
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-[var(--text-body)]">
          Код приглашения
          <input
            type="text"
            className={inputClass}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoComplete="one-time-code"
            spellCheck={false}
            maxLength={14}
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-[var(--text-body)]">
          Новый пароль (не короче 8 символов)
          <input
            type="password"
            className={inputClass}
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-[var(--text-body)]">
          Пароль ещё раз
          <input
            type="password"
            className={inputClass}
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="mt-5 w-full rounded-md bg-[var(--sidebar-blue)] py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
        >
          {busy ? "Сохранение…" : "Задать пароль и войти"}
        </button>
      </section>
    </div>
  );
}
