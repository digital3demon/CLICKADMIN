"use client";

import { formatRuDateTime } from "@/lib/corrections-history";
import type { LabTaskJson } from "@/lib/lab-tasks";

export function OrdersTasksHistoryTable({ items }: { items: LabTaskJson[] }) {
  if (items.length === 0) {
    return (
      <div className="overflow-x-auto rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2 font-semibold">Когда</th>
              <th className="px-3 py-2 font-semibold">Автор</th>
              <th className="px-3 py-2 font-semibold">Текст</th>
              <th className="px-3 py-2 font-semibold">Статус</th>
            </tr>
          </thead>
          <tbody />
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
          <tr>
            <th className="px-3 py-2 font-semibold">Когда</th>
            <th className="px-3 py-2 font-semibold">Автор</th>
            <th className="px-3 py-2 font-semibold">Текст</th>
            <th className="px-3 py-2 font-semibold">Вложения</th>
            <th className="px-3 py-2 font-semibold">Статус</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const resolved = Boolean(row.resolvedAt);
            return (
              <tr
                key={row.id}
                className="border-b border-[var(--card-border)] last:border-b-0"
              >
                <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)]">
                  {formatRuDateTime(new Date(row.createdAt))}
                </td>
                <td className="px-3 py-2 font-medium text-[var(--app-text)]">
                  {row.authorLabel}
                </td>
                <td className="max-w-[28rem] px-3 py-2">
                  <p className="whitespace-pre-wrap break-words text-[var(--text-body)]">
                    {row.text.trim() || "—"}
                  </p>
                </td>
                <td className="px-3 py-2">
                  {row.attachments.length === 0 ? (
                    <span className="text-[var(--text-muted)]">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {row.attachments.map((a) => (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded border border-[var(--card-border)]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={a.url}
                            alt={a.fileName}
                            className="h-12 w-12 object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  {resolved ? (
                    <span className="text-emerald-700 dark:text-emerald-300">
                      Готово
                      {row.resolvedByName ? ` · ${row.resolvedByName}` : ""}
                      {row.resolvedAt
                        ? ` · ${formatRuDateTime(new Date(row.resolvedAt))}`
                        : ""}
                    </span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-300">
                      Нерешённая
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
