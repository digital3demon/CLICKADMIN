"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/components/ui/toast-store";

function moneyRu(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

type Entry = {
  id: string;
  amountRub: number;
  kind: string;
  note: string | null;
  orderId: string | null;
  createdAt: string;
};

const KIND_RU: Record<string, string> = {
  TOPUP: "Внесение",
  WRITE_OFF: "Списание",
  APPLY_ORDER: "Учёт в наряде",
  ADJUST: "Корректировка",
};

export function DepositFinanceBlock({
  party,
  partyId,
  canEdit,
}: {
  party: "clinic" | "doctor";
  partyId: string;
  canEdit: boolean;
}) {
  const apiBase =
    party === "clinic"
      ? `/api/clinics/${partyId}/deposit`
      : `/api/doctors/${partyId}/deposit`;

  const [balanceRub, setBalanceRub] = useState(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [amountText, setAmountText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoadErr(null);
    try {
      const res = await fetch(apiBase, { credentials: "include" });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        balanceRub?: number;
        entries?: Entry[];
      };
      if (!res.ok) {
        setLoadErr(j.error ?? "Не удалось загрузить депозит");
        return;
      }
      setBalanceRub(j.balanceRub ?? 0);
      setEntries(Array.isArray(j.entries) ? j.entries : []);
    } catch {
      setLoadErr("Сеть недоступна");
    }
  }, [apiBase]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const submit = async (kind: "TOPUP" | "WRITE_OFF") => {
    const amountRub = Math.round(Number(String(amountText).replace(",", ".")));
    if (!Number.isFinite(amountRub) || amountRub <= 0) {
      toast.error("Укажите сумму больше 0");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountRub, kind }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        balanceRub?: number;
      };
      if (!res.ok) {
        toast.error(j.error ?? "Ошибка");
        return;
      }
      setAmountText("");
      toast.success(kind === "TOPUP" ? "Депозит внесён" : "Депозит списан");
      if (typeof j.balanceRub === "number") setBalanceRub(j.balanceRub);
      await reload();
    } catch {
      toast.error("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        Депозит / переплата
      </h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Остаток учитывается в нарядах: для клиники — в заказах клиники, для
        врача — в частной практике.
      </p>
      {loadErr ? (
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{loadErr}</p>
      ) : null}
      <p className="mt-3 text-2xl font-semibold tabular-nums text-[var(--app-text)]">
        {moneyRu(balanceRub)}
      </p>
      {canEdit ? (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="block min-w-[8rem] flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Сумма, ₽
            </span>
            <input
              type="number"
              min={1}
              step={1}
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              disabled={busy}
              className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-sm text-[var(--text-strong)]"
              placeholder="0"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit("TOPUP")}
            className="rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Внести
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit("WRITE_OFF")}
            className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium text-[var(--text-strong)] disabled:opacity-50"
          >
            Списать
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Внесение и списание — с правом «Редактирование заказа».
        </p>
      )}
      {entries.length > 0 ? (
        <ul className="mt-4 max-h-48 space-y-1.5 overflow-y-auto text-xs text-[var(--text-secondary)]">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-baseline justify-between gap-x-2 border-b border-[var(--card-border)]/60 pb-1"
            >
              <span>
                {KIND_RU[e.kind] ?? e.kind}
                {e.note ? ` · ${e.note}` : ""}
              </span>
              <span
                className={`tabular-nums font-medium ${
                  e.amountRub >= 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-[var(--text-strong)]"
                }`}
              >
                {e.amountRub >= 0 ? "+" : ""}
                {moneyRu(e.amountRub)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
