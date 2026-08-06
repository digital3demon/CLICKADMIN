"use client";

import { useCallback, useEffect, useState } from "react";

type ApiKeyRow = {
  id: string;
  name: string;
  prefixLabel: string;
  scopes: string[];
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
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

export function TenantApiKeysClient() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Сканер основной");
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [onceKey, setOnceKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant/api-keys");
      const j = (await res.json()) as { keys?: ApiKeyRow[]; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Ошибка загрузки");
      setKeys(Array.isArray(j.keys) ? j.keys : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createKey = async () => {
    setCreating(true);
    setError(null);
    setOnceKey(null);
    setCopied(false);
    try {
      const res = await fetch("/api/tenant/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "API-ключ" }),
      });
      const j = (await res.json()) as {
        apiKey?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(j.error ?? "Не удалось создать ключ");
      if (j.apiKey) setOnceKey(j.apiKey);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    if (!window.confirm("Отозвать ключ? Программы с этим ключом перестанут работать.")) {
      return;
    }
    setRevokingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/tenant/api-keys/${encodeURIComponent(id)}/revoke`, {
        method: "POST",
      });
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
    if (!onceKey) return;
    try {
      await navigator.clipboard.writeText(onceKey);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--text-secondary)]">
        Именные ключи для внешних программ (сканер книг и другие интеграции).
        Ключ показывается один раз при создании — сохраните его в настройках
        программы. Логин сотрудника на машине сканера не нужен.
      </p>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {onceKey ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Скопируйте ключ сейчас — больше он не отобразится</p>
          <code className="mt-2 block break-all rounded-md bg-white/80 px-2 py-2 font-mono text-xs">
            {onceKey}
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
              onClick={() => setOnceKey(null)}
            >
              Закрыть
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
        <label className="min-w-[12rem] flex-1 text-sm">
          <span className="mb-1 block font-medium text-[var(--app-text)]">Имя ключа</span>
          <input
            className="w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm outline-none focus:border-[var(--sidebar-blue)]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Сканер основной"
            maxLength={80}
          />
        </label>
        <button
          type="button"
          disabled={creating}
          className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          onClick={() => void createKey()}
        >
          {creating ? "Создание…" : "Сгенерировать ключ"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Загрузка…</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">Ключей пока нет.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Имя</th>
                <th className="px-3 py-2 font-medium">Префикс</th>
                <th className="px-3 py-2 font-medium">Scopes</th>
                <th className="px-3 py-2 font-medium">Создан</th>
                <th className="px-3 py-2 font-medium">Использован</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-[var(--card-border)] last:border-0">
                  <td className="px-3 py-2 font-medium text-[var(--app-text)]">{k.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{k.prefixLabel}</td>
                  <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                    {k.scopes.join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">{fmtRu(k.createdAt)}</td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">{fmtRu(k.lastUsedAt)}</td>
                  <td className="px-3 py-2">
                    {k.active ? (
                      <span className="text-emerald-700">активен</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">отозван</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {k.active ? (
                      <button
                        type="button"
                        disabled={revokingId === k.id}
                        className="text-sm text-red-700 hover:underline disabled:opacity-50"
                        onClick={() => void revokeKey(k.id)}
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
