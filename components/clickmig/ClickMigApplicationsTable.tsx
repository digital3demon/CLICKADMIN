"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export type ClickMigApplicationRow = {
  id: string;
  publicNumber: string;
  createdAt: string;
  doctorName: string;
  patientName: string;
  materialLabel: string;
  constructionName: string;
  shadeCode: string | null;
  shadeDetail: string | null;
  hasPhoto: boolean;
  hasScans: boolean;
};

export function ClickMigApplicationsTable() {
  const [rows, setRows] = useState<ClickMigApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/clickmig/applications");
      const data = (await res.json()) as {
        applications?: ClickMigApplicationRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Ошибка загрузки");
      setRows(data.applications ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Загрузка заявок…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Новых заявок нет.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--card-bg)] text-left text-[var(--muted)]">
          <tr>
            <th className="px-3 py-2">Дата и время</th>
            <th className="px-3 py-2">Доктор</th>
            <th className="px-3 py-2">Пациент</th>
            <th className="px-3 py-2">Материал</th>
            <th className="px-3 py-2">Конструкция</th>
            <th className="px-3 py-2">Цвет</th>
            <th className="px-3 py-2">Фото</th>
            <th className="px-3 py-2">Сканы</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[var(--card-border)]">
              <td className="px-3 py-2 whitespace-nowrap">
                {new Date(r.createdAt).toLocaleString("ru-RU")}
              </td>
              <td className="px-3 py-2">{r.doctorName}</td>
              <td className="px-3 py-2">{r.patientName}</td>
              <td className="px-3 py-2">{r.materialLabel}</td>
              <td className="px-3 py-2">{r.constructionName}</td>
              <td className="px-3 py-2">
                {[r.shadeCode, r.shadeDetail].filter(Boolean).join(" · ") || "—"}
              </td>
              <td className="px-3 py-2">{r.hasPhoto ? "Да" : "—"}</td>
              <td className="px-3 py-2">{r.hasScans ? "Да" : "—"}</td>
              <td className="px-3 py-2">
                <Link
                  href={`/clickmig/applications/${r.id}`}
                  className="text-[var(--sidebar-blue)] hover:underline"
                >
                  Открыть
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
