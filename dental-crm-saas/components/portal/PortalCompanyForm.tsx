"use client";

import { useState } from "react";

type Props = {
  /** Куда вести после ввода: https://{slug}.click-lab.online (без слеша) */
  baseHost: string;
};

/**
 * Портал: ввод префикса компании — редирект на поддомен.
 * rate limit: /api/portal/redirect
 */
export function PortalCompanyForm({ baseHost }: Props) {
  const [slug, setSlug] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function norm(s: string) {
    return s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
  }

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const s = norm(slug);
    if (s.length < 2) {
      setErr("Введите префикс (от 2 латинских букв или цифр).");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/portal/redirect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: s }),
      });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok) {
        setErr(j.error ?? "Не удалось продолжить");
        return;
      }
      if (j.url) {
        window.location.assign(j.url);
        return;
      }
      setErr("Пустой ответ");
    } catch {
      setErr("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={go}
      className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-sm"
    >
      <h1 className="text-lg font-semibold text-[var(--app-text)]">CRM лаборатории</h1>
      <p className="text-sm text-[var(--text-secondary)]">
        Введите префикс вашей организации (как в адресе {baseHost}).
      </p>
      <input
        type="text"
        className="rounded border border-[var(--card-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)]"
        placeholder="префикс (латиницей)"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        maxLength={48}
        aria-label="Префикс организации"
        disabled={loading}
      />
      {err ? (
        <p className="text-sm text-red-600" role="alert">
          {err}
        </p>
      ) : null}
      <button
        type="submit"
        className="rounded bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "…" : "Открыть"}
      </button>
    </form>
  );
}
