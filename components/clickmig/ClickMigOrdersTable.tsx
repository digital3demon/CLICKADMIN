"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type OrderRow = {
  id: string;
  publicNumber: string;
  status: string;
  kanbanColumnId: string;
  patientName: string;
  doctorName: string | null;
  materialLabel: string;
  blockedAt: string | null;
};

const COLUMN_TITLES: Record<string, string> = {
  col_queue: "К исполнению",
  col_prod: "Производство",
  col_fab: "Изготовление",
  col_review: "Проверка",
  col_done: "Сдана админам",
};

export function ClickMigOrdersTable() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/clickmig/orders");
    const data = (await res.json()) as { orders?: OrderRow[] };
    setRows(data.orders ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-[var(--muted)]">Загрузка…</p>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link
          href="/clickmig/kanban"
          className="rounded-lg bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm text-white"
        >
          Канбан
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
        <table className="min-w-full text-sm">
          <thead className="text-left text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2">№</th>
              <th className="px-3 py-2">Пациент</th>
              <th className="px-3 py-2">Доктор</th>
              <th className="px-3 py-2">Материал</th>
              <th className="px-3 py-2">Колонка</th>
              <th className="px-3 py-2">Статус</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={`border-t border-[var(--card-border)] ${r.status === "BLOCKED" ? "bg-red-50/50 dark:bg-red-950/20" : ""}`}
              >
                <td className="px-3 py-2">{r.publicNumber}</td>
                <td className="px-3 py-2">{r.patientName}</td>
                <td className="px-3 py-2">{r.doctorName ?? "—"}</td>
                <td className="px-3 py-2">{r.materialLabel}</td>
                <td className="px-3 py-2">
                  {COLUMN_TITLES[r.kanbanColumnId] ?? r.kanbanColumnId}
                </td>
                <td className="px-3 py-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
