"use client";

import { useCallback, useRef, useState } from "react";
import { IconRefresh } from "./kanban-icons";

type BackfillBatchResponse = {
  total?: number;
  processed?: number;
  changed?: number;
  skipped?: number;
  noCard?: number;
  unmapped?: number;
  rateLimited?: boolean;
  finished?: boolean;
  afterOrderId?: string | null;
  error?: string;
};

type KanbanMembersBackfillButtonProps = {
  disabled?: boolean;
  onRunningChange?: (running: boolean) => void;
  onComplete: () => void | Promise<void>;
  showToast: (msg: string, err?: boolean) => void;
};

/**
 * Подтягивает с Kaiten на карточки канбана: колонку/порядок, участников/ответственных,
 * срочность (asap), срок этапа (due_date). Наряд CRM не меняет.
 */
export function KanbanMembersBackfillButton({
  disabled,
  onRunningChange,
  onComplete,
  showToast,
}: KanbanMembersBackfillButtonProps) {
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [status, setStatus] = useState("");
  const abortRef = useRef(false);

  const formatProgressLine = useCallback(
    (opts: {
      processed: number;
      changed: number;
      skipped: number;
      noCard: number;
      unmapped: number;
      totalCount: number;
      prefix?: string;
    }) => {
      const parts = [
        `${opts.prefix ?? "Проверено"} ${opts.processed} из ${opts.totalCount}`,
        `изменено ${opts.changed}`,
      ];
      if (opts.skipped > 0) {
        parts.push(`без изменений ${opts.skipped}`);
      }
      if (opts.noCard > 0) {
        parts.push(`нет на доске ${opts.noCard}`);
      }
      if (opts.unmapped > 0) {
        parts.push(`не сопоставлено ${opts.unmapped}`);
      }
      return parts.join(" · ");
    },
    [],
  );

  const runBackfill = useCallback(async () => {
    if (running || disabled) return;
    abortRef.current = false;
    onRunningChange?.(true);
    setRunning(true);
    setDone(0);
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
      let skippedSum = 0;
      let noCardSum = 0;
      let unmappedSum = 0;
      let finished = false;

      while (!finished && !abortRef.current) {
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
        skippedSum += batch.skipped ?? 0;
        noCardSum += batch.noCard ?? 0;
        unmappedSum += batch.unmapped ?? 0;
        afterOrderId =
          typeof batch.afterOrderId === "string" ? batch.afterOrderId : afterOrderId;
        finished = Boolean(batch.finished);
        setDone(Math.min(processed, totalCount));
        setStatus(
          formatProgressLine({
            processed: Math.min(processed, totalCount),
            changed: changedSum,
            skipped: skippedSum,
            noCard: noCardSum,
            unmapped: unmappedSum,
            totalCount,
          }),
        );

        if (batch.rateLimited) {
          setStatus(
            formatProgressLine({
              processed: Math.min(processed, totalCount),
              changed: changedSum,
              skipped: skippedSum,
              noCard: noCardSum,
              unmapped: unmappedSum,
              totalCount,
              prefix: "Лимит Kaiten, пауза",
            }),
          );
          await new Promise((r) => setTimeout(r, 2500));
        }
      }

      if (abortRef.current) {
        setStatus(
          formatProgressLine({
            processed: Math.min(processed, totalCount),
            changed: changedSum,
            skipped: skippedSum,
            noCard: noCardSum,
            unmapped: unmappedSum,
            totalCount,
            prefix: "Остановлено",
          }),
        );
        return;
      }

      const summary = formatProgressLine({
        processed: Math.min(processed, totalCount),
        changed: changedSum,
        skipped: skippedSum,
        noCard: noCardSum,
        unmapped: unmappedSum,
        totalCount,
        prefix: "Готово",
      });
      setStatus(summary);
      await onComplete();
      showToast(summary);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка обновления";
      setStatus(msg);
      showToast(msg, true);
    } finally {
      onRunningChange?.(false);
      setRunning(false);
    }
  }, [disabled, formatProgressLine, onComplete, onRunningChange, running, showToast]);

  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const tip =
    "Обновить с Kaiten: колонку и порядок, сроки этапа, срочность, участников/ответственных (наряды CRM не меняет)";

  return (
    <div className="contents">
      <button
        type="button"
        disabled={disabled || running}
        title={tip}
        aria-label={running ? "Обновление…" : "Обновить"}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] text-[var(--kanban-text)] hover:brightness-[0.98] disabled:cursor-wait disabled:opacity-60 dark:hover:brightness-110 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-[0.75rem] sm:font-medium"
        onClick={() => void runBackfill()}
      >
        <IconRefresh className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">{running ? "Обновление…" : "Обновить"}</span>
      </button>
      {running ? (
        <button
          type="button"
          className="hidden rounded-md border border-[var(--kanban-border)] px-2 py-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--kanban-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] sm:inline-flex"
          onClick={() => {
            abortRef.current = true;
          }}
        >
          Стоп
        </button>
      ) : null}
      {running || status ? (
        <div className="basis-full min-w-0 sm:max-w-[min(100%,28rem)]">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/[0.08]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Прогресс обновления с Kaiten"
          >
            <div
              className="h-full rounded-full bg-[var(--kanban-accent)] transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 whitespace-normal text-[0.68rem] leading-snug text-[var(--kanban-text-muted)]">
            {status}
          </p>
        </div>
      ) : null}
    </div>
  );
}
