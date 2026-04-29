"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

const COLS = [
  { v: "NEW", label: "Новые" },
  { v: "IN_PROGRESS", label: "В работе" },
  { v: "DONE", label: "Готово" },
] as const;

type CardTypeRow = { id: string; name: string };

export function OrderDemoKanbanTab({
  orderId,
  initialColumn,
  initialCardTypeId,
  cardTypes,
}: {
  orderId: string;
  initialColumn: string | null | undefined;
  initialCardTypeId: string | null | undefined;
  cardTypes: CardTypeRow[];
}) {
  const router = useRouter();
  const [col, setCol] = useState<string>(initialColumn ?? "NEW");
  const [typeId, setTypeId] = useState<string>(initialCardTypeId ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const persist = useCallback(
    async (patch: { demoKanbanColumn?: string; kaitenCardTypeId?: string | null }) => {
      setBusy(true);
      setErr(null);
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setErr(j.error ?? "Не удалось сохранить");
          return;
        }
        router.refresh();
      } finally {
        setBusy(false);
      }
    },
    [orderId, router],
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Внутренний канбан (демо)
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          В демо этот наряд и есть «карточка» на доске (как в Kaiten): колонка —
          этап, тип — тип карточки; всё хранится в записи наряда, без внешнего
          API. В основной CRM позже тот же сценарий свяжем с заказами и общим
          канбаном.
        </p>
      </div>

      {err ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
          {err}
        </div>
      ) : null}

      <div>
        <p className="text-xs font-semibold text-[var(--text-body)]">Колонка</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {COLS.map((c) => (
            <button
              key={c.v}
              type="button"
              disabled={busy}
              onClick={() => {
                setCol(c.v);
                void persist({ demoKanbanColumn: c.v });
              }}
              className={
                col === c.v
                  ? "rounded-full bg-[var(--sidebar-blue)] px-3 py-1 text-xs font-semibold text-white shadow-sm"
                  : "rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--card-bg)]"
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-[var(--text-body)]">
          Тип карточки
        </label>
        <select
          className="mt-1 block w-full max-w-md rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm text-[var(--app-text)]"
          value={typeId}
          disabled={busy}
          onChange={(e) => {
            const v = e.target.value;
            setTypeId(v);
            void persist({ kaitenCardTypeId: v || null });
          }}
        >
          <option value="">— не выбран —</option>
          {cardTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
