"use client";

import { useCallback, useRef, useState } from "react";

type BackfillBatchResponse = {
  total?: number;
  processed?: number;
  changed?: number;
  skipped?: number;
  noCard?: number;
  rateLimited?: boolean;
  finished?: boolean;
  afterOrderId?: string | null;
  error?: string;
};

type KanbanMembersBackfillButtonProps = {
  disabled?: boolean;
  onComplete: () => void | Promise<void>;
  showToast: (msg: string, err?: boolean) => void;
};

/** TEMP: одноразовая подтяжка assignees/participants из Kaiten по старым карточкам. */
export function KanbanMembersBackfillButton({
  disabled,
  onComplete,
  showToast,
}: KanbanMembersBackfillButtonProps) {
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [changedTotal, setChangedTotal] = useState(0);
  const [status, setStatus] = useState("");
  const abortRef = useRef(false);

  const runBackfill = useCallback(async () => {
    if (running || disabled) return;
    abortRef.current = false;
    setRunning(true);
    setDone(0);
    setChangedTotal(0);
    setStatus("Подсчёт карточек…");

    try {
      const countRes = await fetch("/api/kanban/members-backfill", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "count" }),
      });
      const countJson = (await countRes.json()) as BackfillBatchResponse;
      if (!countRes.ok) {
        throw new Error(countJson.error || "Не удалось начать обновление");
      }
      const totalCount = countJson.total ?? 0;
      setTotal(totalCount);
      if (totalCount === 0) {
        setStatus("Нет карточек Kaiten для обновления");
        showToast("Нет привязанных карточек Kaiten");
        return;
      }

      let afterOrderId: string | null = null;
      let processed = 0;
      let changedSum = 0;
      let finished = false;

      while (!finished && !abortRef.current) {
        setStatus(`Обновление ${processed} из ${totalCount}…`);
        const batchRes = await fetch("/api/kanban/members-backfill", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "batch", afterOrderId }),
        });
        const batch = (await batchRes.json()) as BackfillBatchResponse;
        if (!batchRes.ok) {
          throw new Error(batch.error || "Ошибка пакетного обновления");
        }

        processed += batch.processed ?? 0;
        changedSum += batch.changed ?? 0;
        afterOrderId =
          typeof batch.afterOrderId === "string" ? batch.afterOrderId : afterOrderId;
        finished = Boolean(batch.finished);
        setDone(processed);
        setChangedTotal(changedSum);

        if (batch.rateLimited) {
          setStatus("Лимит Kaiten, пауза 8 с…");
          await new Promise((r) => setTimeout(r, 8000));
          continue;
        }

        if (!finished) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      if (abortRef.current) {
        setStatus("Остановлено");
        return;
      }

      setStatus(`Готово: обновлено ${changedSum} из ${totalCount}`);
      await onComplete();
      showToast(`Участники подтянуты: ${changedSum} карточек`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка обновления";
      setStatus(msg);
      showToast(msg, true);
    } finally {
      setRunning(false);
    }
  }, [disabled, onComplete, running, showToast]);

  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-1.5 sm:max-w-[16rem]">
      <button
        type="button"
        disabled={disabled || running}
        title="Временно: подтянуть ответственных и участников из Kaiten по всем старым карточкам"
        className="rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] px-2.5 py-1.5 text-[0.75rem] font-medium text-[var(--kanban-text)] hover:brightness-[0.98] disabled:cursor-wait disabled:opacity-60 dark:hover:brightness-110"
        onClick={() => void runBackfill()}
      >
        {running ? "Обновление…" : "Обновить участников"}
      </button>
      {running || status ? (
        <div className="min-w-0">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/[0.08]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Прогресс обновления участников"
          >
            <div
              className="h-full rounded-full bg-[var(--kanban-accent)] transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 truncate text-[0.62rem] text-[var(--kanban-text-muted)]">
            {status}
            {total > 0 ? ` (${done}/${total})` : ""}
            {changedTotal > 0 ? ` · изменено ${changedTotal}` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}
