"use client";

import { useCallback, useEffect, useState } from "react";

type CodeRow = {
  id: string;
  label: string | null;
  prefixLabel: string;
  createdAt: string;
  revokedAt: string | null;
  consumedAt: string | null;
  boundHint: string | null;
  status: "unused" | "used" | "revoked";
  active: boolean;
};

function fmtRu(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(s: CodeRow["status"]): string {
  if (s === "unused") return "не использован";
  if (s === "used") return "использован";
  return "отозван";
}

export function DemoAccessCodesClient() {
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [onceCode, setOnceCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/directory/demo-access");
      const j = (await res.json()) as { codes?: CodeRow[]; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Ошибка загрузки");
      setCodes(Array.isArray(j.codes) ? j.codes : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createCode = async () => {
    setCreating(true);
    setError(null);
    setOnceCode(null);
    setCopied(false);
    try {
      const res = await fetch("/api/directory/demo-access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: label.trim() || undefined }),
      });
      const j = (await res.json()) as { code?: string; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Не удалось создать код");
      if (j.code) setOnceCode(j.code);
      setLabel("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setCreating(false);
    }
  };

  const revokeCode = async (id: string) => {
    if (
      !window.confirm(
        "Отозвать код? По нему больше нельзя войти в демо (если ещё не входили).",
      )
    ) {
      return;
    }
    setRevokingId(id);
    setError(null);
    try {
      const res = await fetch(
        `/api/directory/demo-access/${encodeURIComponent(id)}/revoke`,
        { method: "POST" },
      );
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Не удалось отозвать");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setRevokingId(null);
    }
  };

  const copyOnce = async () => {
    if (!onceCode) return;
    try {
      await navigator.clipboard.writeText(onceCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--text-secondary)]">
        Общее демо без организаций: вы генерируете код и передаёте гостю. Один
        код — один вход на одну машину. После использования код сгорает; полный
        текст показывается только при создании.
      </p>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {onceCode ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">
            Скопируйте код сейчас — больше он не отобразится
          </p>
          <code className="mt-2 block break-all rounded-md bg-white/80 px-2 py-2 font-mono text-lg tracking-wider">
            {onceCode}
          </code>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm text-white"
              onClick={() => void copyOnce()}
            >
              {copied ? "Скопировано" : "Копировать"}
            </button>
            <button
              type="button"
              className="rounded-md border border-amber-400 px-3 py-1.5 text-sm"
              onClick={() => setOnceCode(null)}
            >
              Закрыть
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
        <label className="min-w-[12rem] flex-1 text-sm">
          <span className="mb-1 block font-medium text-[var(--app-text)]">
            Кому / заметка (необязательно)
          </span>
          <input
            className="w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm outline-none focus:border-[var(--sidebar-blue)]"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Иван, выставка…"
            maxLength={80}
          />
        </label>
        <button
          type="button"
          disabled={creating}
          className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          onClick={() => void createCode()}
        >
          {creating ? "Создание…" : "Сгенерировать код"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Загрузка…</p>
      ) : codes.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">Кодов пока нет.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Заметка</th>
                <th className="px-3 py-2 font-medium">Префикс</th>
                <th className="px-3 py-2 font-medium">Создан</th>
                <th className="px-3 py-2 font-medium">Вход</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {codes.map((k) => (
                <tr
                  key={k.id}
                  className="border-b border-[var(--card-border)] last:border-0"
                >
                  <td className="px-3 py-2 font-medium text-[var(--app-text)]">
                    {k.label?.trim() || "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{k.prefixLabel}</td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">
                    {fmtRu(k.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">
                    {k.consumedAt ? (
                      <span title={k.boundHint ?? undefined}>
                        {fmtRu(k.consumedAt)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {k.status === "unused" ? (
                      <span className="text-emerald-700">{statusLabel(k.status)}</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">
                        {statusLabel(k.status)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {k.status !== "revoked" ? (
                      <button
                        type="button"
                        disabled={revokingId === k.id}
                        className="text-sm text-red-700 hover:underline disabled:opacity-50"
                        onClick={() => void revokeCode(k.id)}
                      >
                        {revokingId === k.id ? "…" : "Отозвать"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
