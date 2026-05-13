"use client";

import type { UserRole } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type Entry = {
  id: string;
  orderNumber: string;
  patientName: string;
  doctorName: string;
  priceCode: string;
  priceName: string;
  kindLabel: string;
  quantity: number;
  amountRub: number;
  userDisplayName: string;
  createdAt: string;
};

type PayrollUser = { id: string; displayName: string; email: string };

function monthStartYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function rub(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function dt(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PayrollPageClient({
  role,
  currentUserId,
}: {
  role: UserRole;
  currentUserId: string;
}) {
  const isSenior = role === "SENIOR_TECHNICIAN" || role === "OWNER";
  const [tab, setTab] = useState<"mine" | "review">("mine");
  const [from, setFrom] = useState(monthStartYmd);
  const [to, setTo] = useState(todayYmd);
  const [users, setUsers] = useState<PayrollUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [totalRub, setTotalRub] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = tab === "mine" ? currentUserId : selectedUserId;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      if (isSenior) params.set("includeUsers", "1");
      if (targetUserId) params.set("userId", targetUserId);
      const res = await fetch(`/api/payroll/entries?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        entries?: Entry[];
        users?: PayrollUser[];
        totalRub?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить начисления");
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setTotalRub(typeof data.totalRub === "number" ? data.totalRub : 0);
      if (Array.isArray(data.users)) {
        setUsers(data.users);
        setSelectedUserId((prev) => prev || data.users?.[0]?.id || "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [from, to, isSenior, targetUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const title = useMemo(() => {
    if (tab === "mine") return "Мои начисления";
    const u = users.find((x) => x.id === selectedUserId);
    return u ? `Проверка: ${u.displayName}` : "Проверка начислений";
  }, [tab, users, selectedUserId]);

  return (
    <div className="w-full max-w-6xl space-y-4">
      {isSenior ? (
        <div className="flex flex-wrap gap-2">
          {[
            ["mine", "Начисления"],
            ["review", "Проверка"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key as "mine" | "review")}
              className={
                tab === key
                  ? "rounded-full bg-[var(--sidebar-blue)] px-4 py-1.5 text-sm font-semibold text-white"
                  : "rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-1.5 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
              }
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
        {isSenior && tab === "review" ? (
          <label className="min-w-[260px] flex-1 text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Пользователь
            </span>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-strong)] outline-none"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName} · {u.email}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            С
          </span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-strong)] outline-none"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            По
          </span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-strong)] outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Показать
        </button>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--app-text)]">{title}</h2>
        <div className="text-sm text-[var(--text-muted)]">
          Итого: <span className="font-semibold text-[var(--text-strong)]">{rub(totalRub)}</span>
        </div>
      </div>
      {error ? <p className="text-sm font-medium text-red-600 dark:text-red-300">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--surface-subtle)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2">Дата</th>
              <th className="px-3 py-2">Наряд</th>
              <th className="px-3 py-2">Доктор</th>
              <th className="px-3 py-2">Пациент</th>
              <th className="px-3 py-2">Позиция</th>
              <th className="px-3 py-2">Что сделано</th>
              <th className="px-3 py-2 text-right">Кол-во</th>
              {isSenior && tab === "review" ? <th className="px-3 py-2">Пользователь</th> : null}
              <th className="px-3 py-2 text-right">Сумма</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {loading ? (
              <tr>
                <td className="px-3 py-5 text-[var(--text-muted)]" colSpan={8}>
                  Загрузка…
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td className="px-3 py-5 text-[var(--text-muted)]" colSpan={8}>
                  За выбранный период начислений нет.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--text-muted)]">{dt(e.createdAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono font-semibold text-[var(--text-strong)]">
                    {e.orderNumber}
                  </td>
                  <td className="px-3 py-2">{e.doctorName}</td>
                  <td className="px-3 py-2">{e.patientName}</td>
                  <td className="px-3 py-2">
                    {e.priceCode} · {e.priceName}
                  </td>
                  <td className="px-3 py-2">{e.kindLabel}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{e.quantity}</td>
                  {isSenior && tab === "review" ? <td className="px-3 py-2">{e.userDisplayName}</td> : null}
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">{rub(e.amountRub)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
