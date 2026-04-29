"use client";

import { useCallback, useEffect, useState } from "react";

type SettingsPayload = {
  postingYearMonth: string;
  postingMonthLabel: string;
  nextOrderNumber: string;
};

export function OrderPostingMonthBar() {
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/order-number-settings");
      const json = (await res.json().catch(() => ({}))) as
        | SettingsPayload
        | { error?: string };
      if (!res.ok) {
        setError(
          typeof json === "object" && json && "error" in json
            ? String((json as { error: string }).error)
            : "Ошибка загрузки",
        );
        return;
      }
      setData(json as SettingsPayload);
    } catch {
      setError("Сеть недоступна");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const advance = useCallback(async () => {
    if (
      !confirm(
        "Перевести нумерацию на следующий календарный месяц?\n\n" +
          "Следующий сохранённый наряд получит номер вида NNN-001 в новом месяце. " +
          "Пока не нажали — номера остаются в текущем месяце нумерации (можно дозаносить работы за прошлый период).",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/order-number-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advanceMonth" }),
      });
      const json = (await res.json().catch(() => ({}))) as
        | (SettingsPayload & { ok?: boolean })
        | { error?: string };
      if (!res.ok) {
        setError(
          typeof json === "object" && json && "error" in json
            ? String((json as { error: string }).error)
            : "Не удалось сменить месяц",
        );
        return;
      }
      if (
        "nextOrderNumber" in json &&
        "postingMonthLabel" in json &&
        "postingYearMonth" in json
      ) {
        setData(json as SettingsPayload);
      } else {
        await load();
      }
    } catch {
      setError("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }, [load]);

  const submitManualNext = useCallback(async () => {
    setManualError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/order-number-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setNextSequence",
          orderNumber: manualDraft.trim(),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as
        | SettingsPayload
        | { error?: string };
      if (!res.ok) {
        setManualError(
          typeof json === "object" && json && "error" in json
            ? String((json as { error: string }).error)
            : "Не удалось сохранить",
        );
        return;
      }
      const j = json as Partial<SettingsPayload>;
      if (
        typeof j.postingYearMonth === "string" &&
        typeof j.postingMonthLabel === "string" &&
        typeof j.nextOrderNumber === "string"
      ) {
        setData({
          postingYearMonth: j.postingYearMonth,
          postingMonthLabel: j.postingMonthLabel,
          nextOrderNumber: j.nextOrderNumber,
        });
      } else {
        await load();
      }
      setManualOpen(false);
    } catch {
      setManualError("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  }, [load, manualDraft]);

  if (error && !data) {
    return (
      <div className="flex w-full flex-col overflow-hidden rounded-lg border border-amber-200 bg-amber-50 shadow-sm">
        <div className="px-5 py-4 text-base text-amber-950">
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 text-base font-medium text-amber-900 underline"
            onClick={() => void load()}
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex w-full flex-col overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <div className="px-5 py-4 text-base text-[var(--text-secondary)]">
          Загрузка настроек нумерации…
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
      <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-start sm:gap-5 lg:gap-6">
      <div className="text-base text-[var(--text-strong)]">
        <p className="text-lg font-semibold text-[var(--app-text)]">
          Нумерация нарядов
        </p>
        <p className="mt-1.5 text-[var(--text-secondary)]">
          Сейчас ведётся месяц:{" "}
          <span className="font-semibold text-[var(--app-text)]">
            {data.postingMonthLabel}
          </span>{" "}
          <span className="font-mono text-[var(--text-body)]">({data.postingYearMonth})</span>
        </p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[var(--text-secondary)]">
          <span>
            Следующий номер:{" "}
            <span className="font-mono font-semibold text-[var(--app-text)]">
              {data.nextOrderNumber}
            </span>
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setManualDraft(data.nextOrderNumber);
              setManualError(null);
              setManualOpen(true);
            }}
            className="border-0 bg-transparent p-0 text-xs font-normal tracking-normal text-[var(--text-muted)] underline decoration-[var(--text-muted)]/50 underline-offset-2 transition-colors hover:text-[var(--text-secondary)] hover:decoration-[var(--text-secondary)] disabled:opacity-50"
          >
            задать вручную
          </button>
        </p>
        {error ? (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => void load()}
          className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3.5 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
        >
          Обновить
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void advance()}
          className="rounded-md bg-[var(--sidebar-blue)] px-3.5 py-2 text-sm font-semibold uppercase tracking-wide text-white hover:bg-[var(--sidebar-blue-hover)] disabled:opacity-50"
        >
          Старт нового месяца
        </button>
      </div>
      </div>

      {manualOpen ? (
        <div
          className="fixed inset-0 z-[240] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setManualOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-next-order-title"
            className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2
              id="manual-next-order-title"
              className="text-base font-semibold text-[var(--app-text)]"
            >
              Следующий номер наряда
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Укажите полный номер для текущего месяца нумерации (
              <span className="font-mono">{data.postingYearMonth}</span>
              ). Следующий сохранённый наряд получит этот номер, далее — по
              порядку. Нельзя задать номер ниже или равный уже существующему.
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Номер
              <input
                type="text"
                value={manualDraft}
                onChange={(e) => setManualDraft(e.target.value)}
                disabled={busy}
                className="mt-1.5 w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-subtle)] px-3 py-2 font-mono text-sm text-[var(--app-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-blue)] disabled:opacity-60"
                autoComplete="off"
                placeholder="2604-005"
              />
            </label>
            {manualError ? (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {manualError}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                onClick={() => !busy && setManualOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--sidebar-blue-hover)] disabled:opacity-50"
                onClick={() => {
                  if (
                    !confirm(
                      `Подтвердить: следующий наряд получит номер «${manualDraft.trim() || "…"}»?`,
                    )
                  ) {
                    return;
                  }
                  void submitManualNext();
                }}
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
