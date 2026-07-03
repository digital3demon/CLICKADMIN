"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KaitenIntegrationBackfillState } from "@/lib/kaiten-integration/types";

type IntegrationPayload = {
  enabled?: boolean;
  active?: boolean;
  envConfigured?: boolean;
  disabledAt?: string | null;
  reenableInProgress?: boolean;
  backfill?: KaitenIntegrationBackfillState;
  canEdit?: boolean;
  error?: string;
};

const inp =
  "rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]";

function backfillProgressLabel(backfill: KaitenIntegrationBackfillState): string {
  const total = backfill.total ?? 0;
  const processed = backfill.processed ?? 0;
  if (total <= 0) return "Подготовка…";
  return `${processed} / ${total} нарядов`;
}

export function KaitenIntegrationTenantSettings({
  canEdit,
}: {
  /** Только владелец tenant может переключать. */
  canEdit: boolean;
}) {
  const [enabled, setEnabled] = useState(true);
  const [active, setActive] = useState(true);
  const [envConfigured, setEnvConfigured] = useState(true);
  const [reenableInProgress, setReenableInProgress] = useState(false);
  const [backfill, setBackfill] = useState<KaitenIntegrationBackfillState>({
    status: "idle",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applyPayload = useCallback((j: IntegrationPayload) => {
    setEnabled(j.enabled !== false);
    setActive(j.active !== false);
    setEnvConfigured(j.envConfigured !== false);
    setReenableInProgress(Boolean(j.reenableInProgress));
    setBackfill(j.backfill ?? { status: "idle" });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant/kaiten-integration");
      const j = (await res.json()) as IntegrationPayload;
      if (!res.ok) throw new Error(j.error ?? "Ошибка загрузки");
      applyPayload(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, [applyPayload]);

  useEffect(() => {
    void load();
  }, [load]);

  const stopTick = useCallback(() => {
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
  }, []);

  const runBackfillTick = useCallback(async () => {
    try {
      const res = await fetch("/api/tenant/kaiten-integration/backfill/tick", {
        method: "POST",
      });
      const j = (await res.json()) as IntegrationPayload & { done?: boolean };
      if (!res.ok) throw new Error(j.error ?? "Ошибка синхронизации");
      applyPayload(j);
      if (j.done || j.backfill?.status === "completed") {
        stopTick();
      }
      if (j.backfill?.status === "failed") {
        stopTick();
        setError(j.backfill.lastError ?? "Ошибка догоняющей синхронизации");
      }
    } catch (e) {
      stopTick();
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }, [applyPayload, stopTick]);

  useEffect(() => {
    if (backfill.status !== "running") {
      stopTick();
      return;
    }
    if (tickTimerRef.current) return;
    tickTimerRef.current = setInterval(() => {
      void runBackfillTick();
    }, 1500);
    void runBackfillTick();
    return () => stopTick();
  }, [backfill.status, runBackfillTick, stopTick]);

  const patchEnabled = async (next: boolean) => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant/kaiten-integration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const j = (await res.json()) as IntegrationPayload;
      if (!res.ok) throw new Error(j.error ?? "Не сохранено");
      applyPayload(j);
      setConfirmDisable(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const retryBackfill = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant/kaiten-integration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry-backfill" }),
      });
      const j = (await res.json()) as IntegrationPayload;
      if (!res.ok) throw new Error(j.error ?? "Не удалось повторить");
      applyPayload(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const showBackfillModal =
    reenableInProgress || backfill.status === "running" || backfill.status === "failed";

  return (
    <>
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
        <h2 className="m-0 text-base font-semibold text-[var(--app-text)]">
          Интеграция с Kaiten
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          При выключении внешняя синхронизация останавливается; наряды, чат, корректировки и
          файлы продолжают работать в CRM и встроенном канбане. Старые связи с Kaiten
          сохраняются как справочные данные.
        </p>
        {loading ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">Загрузка…</p>
        ) : (
          <div className="mt-4 space-y-3">
            {!envConfigured ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                На сервере не настроен Kaiten API (KAITEN_API_TOKEN и доски в .env).
              </p>
            ) : null}
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={enabled && active}
                disabled={!canEdit || saving || reenableInProgress}
                onChange={(e) => {
                  const next = e.target.checked;
                  if (!next) {
                    setConfirmDisable(true);
                    return;
                  }
                  void patchEnabled(true);
                }}
              />
              <span className="text-sm text-[var(--app-text)]">
                Интеграция с Kaiten включена
                {!canEdit ? (
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    Изменить может только владелец организации.
                  </span>
                ) : null}
              </span>
            </label>
            {!active && enabled === false ? (
              <p className="text-xs text-[var(--text-muted)]">
                Сейчас работает режим CRM/канбан без внешней синхронизации.
              </p>
            ) : null}
            {error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : null}
          </div>
        )}
      </section>

      {confirmDisable ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
          <div className={`${inp} max-w-md space-y-4 p-5 shadow-lg`}>
            <h3 className="m-0 text-base font-semibold">Выключить интеграцию с Kaiten?</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Внешняя синхронизация остановится. CRM и канбан продолжат работать. Старые
              привязки Kaiten сохранятся.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={inp}
                disabled={saving}
                onClick={() => setConfirmDisable(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className={`${inp} bg-[var(--sidebar-blue)] text-white`}
                disabled={saving}
                onClick={() => void patchEnabled(false)}
              >
                Выключить
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showBackfillModal ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
          <div className={`${inp} max-w-lg space-y-4 p-5 shadow-lg`}>
            <h3 className="m-0 text-base font-semibold">
              {backfill.status === "failed"
                ? "Ошибка синхронизации с Kaiten"
                : "Догоняющая синхронизация с Kaiten"}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              CRM — источник истины. Переносятся карточки, комментарии, файлы и позиции на
              доске для нарядов, изменённых пока интеграция была выключена.
            </p>
            <div className="space-y-1 text-sm">
              <div>{backfillProgressLabel(backfill)}</div>
              <div className="h-2 overflow-hidden rounded bg-[var(--card-border)]">
                <div
                  className="h-full bg-[var(--sidebar-blue)] transition-all"
                  style={{
                    width: `${
                      backfill.total && backfill.total > 0
                        ? Math.min(
                            100,
                            Math.round(
                              ((backfill.processed ?? 0) / backfill.total) * 100,
                            ),
                          )
                        : backfill.status === "completed"
                          ? 100
                          : 8
                    }%`,
                  }}
                />
              </div>
              {backfill.lastError ? (
                <p className="text-red-600 dark:text-red-400">{backfill.lastError}</p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              {backfill.status === "failed" ? (
                <button
                  type="button"
                  className={`${inp} bg-[var(--sidebar-blue)] text-white`}
                  disabled={saving || !canEdit}
                  onClick={() => void retryBackfill()}
                >
                  Повторить
                </button>
              ) : null}
              {backfill.status === "completed" ? (
                <button
                  type="button"
                  className={inp}
                  onClick={() => {
                    setBackfill({ status: "idle" });
                    void load();
                  }}
                >
                  Закрыть
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
