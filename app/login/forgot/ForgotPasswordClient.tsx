"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { writeClientStorageBucket } from "@/lib/client-storage-bucket";

const inputClass =
  "mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm text-[var(--app-text)] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

export function ForgotPasswordClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState(() => sp.get("email")?.trim() ?? "");
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [step, setStep] = useState<"code" | "password">("code");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const verifyCode = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Не удалось проверить код");
        return;
      }
      setStep("password");
    } catch {
      setError("Сеть или сервер недоступны");
    } finally {
      setBusy(false);
    }
  }, [code, email]);

  const setPassword = useCallback(async () => {
    setError(null);
    if (pwd !== pwd2) {
      setError("Пароли не совпадают");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
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
        setError(j.error ?? "Не удалось сохранить пароль");
        return;
      }
      writeClientStorageBucket("live");
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
        Забыл пароль
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Попросите владельца в «Справочники → Пользователи» нажать «Сгенерировать
        новый код» и передать вам код. Затем введите почту и код, после
        подтверждения придумайте новый пароль.
      </p>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </div>
      ) : null}

      <section className="mt-8 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
        {step === "code" ? (
          <>
            <label className="block text-sm font-medium text-[var(--text-body)]">
              Почта
              <input
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-[var(--text-body)]">
              Код от владельца
              <input
                type="text"
                className={inputClass}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoComplete="one-time-code"
                spellCheck={false}
                maxLength={32}
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void verifyCode()}
              className="mt-5 w-full rounded-md bg-[var(--sidebar-blue)] py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
            >
              {busy ? "Проверка…" : "Подтвердить код"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-[var(--text-secondary)]">
              Код принят. Придумайте новый пароль для {email.trim() || "входа"}.
            </p>
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
              onClick={() => void setPassword()}
              className="mt-5 w-full rounded-md bg-[var(--sidebar-blue)] py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
            >
              {busy ? "Сохранение…" : "Сохранить пароль и войти"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setStep("code");
                setPwd("");
                setPwd2("");
                setError(null);
              }}
              className="mt-2 w-full rounded-md border border-[var(--input-border)] py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--surface-subtle)] disabled:opacity-50"
            >
              Назад к коду
            </button>
          </>
        )}
      </section>

      <p className="mt-6 text-sm">
        <Link
          href="/login"
          className="text-[var(--sidebar-blue)] hover:underline"
        >
          ← Ко входу
        </Link>
      </p>
    </div>
  );
}
