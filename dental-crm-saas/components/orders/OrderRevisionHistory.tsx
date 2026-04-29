"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type RevisionRow = {
  id: string;
  createdAt: string;
  actorLabel: string;
  summary: string;
  kind: string;
};

const KIND_RU: Record<string, string> = {
  CREATE: "Создание",
  SAVE: "Сохранение",
  RESTORE: "Восстановление",
};

export function OrderRevisionHistory({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<RevisionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/revisions`);
      const data = (await res.json()) as {
        revisions?: RevisionRow[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Не удалось загрузить историю");
        setRows([]);
        return;
      }
      setRows(data.revisions ?? []);
    } catch {
      setError("Сеть недоступна");
      setRows([]);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const restore = async (revisionId: string) => {
    const ok = window.confirm(
      "Восстановить эту версию? Текущие поля наряда и состав работ будут заменены содержимым выбранной версии. Вложения не удаляются.",
    );
    if (!ok) return;
    setRestoringId(revisionId);
    setError(null);
    try {
      const res = await fetch(
        `/api/orders/${orderId}/revisions/${revisionId}/restore`,
        { method: "POST" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось восстановить");
        return;
      }
      router.refresh();
      await load();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setRestoringId(null);
    }
  };

  if (rows === null) {
    return (
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-sm text-[var(--text-secondary)]">
        Загрузка истории…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-secondary)]">
        Наряд <span className="font-mono font-medium">{orderNumber}</span>: каждое
        сохранение и восстановление фиксируются. Можно откатить состав и поля к
        выбранной версии (файлы по наряду не трогаются).
      </p>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </div>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Записей пока нет. После первого сохранения наряда появится история.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                <th className="px-3 py-2.5">Когда</th>
                <th className="px-3 py-2.5">Кто</th>
                <th className="px-3 py-2.5">Тип</th>
                <th className="px-3 py-2.5">Что изменилось</th>
                <th className="px-3 py-2.5 w-36">Действие</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--table-row-hover)]"
                >
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-strong)]">
                    {new Date(r.createdAt).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--text-strong)]">{r.actorLabel}</td>
                  <td className="px-3 py-2.5 text-[var(--text-body)]">
                    {KIND_RU[r.kind] ?? r.kind}
                  </td>
                  <td className="max-w-md px-3 py-2.5 text-[var(--text-secondary)]">
                    {r.summary}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      disabled={restoringId !== null}
                      onClick={() => void restore(r.id)}
                      className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50"
                    >
                      {restoringId === r.id ? "…" : "Восстановить"}
                    </button>
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
