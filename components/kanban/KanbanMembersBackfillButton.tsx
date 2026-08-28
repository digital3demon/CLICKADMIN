"use client";

import { useCallback, useRef, useState } from "react";
import type { KaitenRefreshCardPatch } from "@/lib/kanban/apply-kaiten-refresh-patches";
import type { KanbanKaitenRefreshTarget } from "@/lib/kanban/kanban-linked-order-ids";
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
  patches?: KaitenRefreshCardPatch[];
  error?: string;
};

type KanbanMembersBackfillButtonProps = {
  disabled?: boolean;
  /** Все карточки канбана (колонки + СТОП). */
  refreshTargets?: KanbanKaitenRefreshTarget[];
  /** Сколько карточек на доске, если targets ещё не передали. */
  linkedOrderCount?: number;
  /** Сначала записать живой снимок в tenant — иначе сервер не найдёт cardId. */
  onBeforeRefresh?: () => void | Promise<void>;
  onRunningChange?: (running: boolean) => void;
  onComplete: (patches: KaitenRefreshCardPatch[]) => void | Promise<void>;
  showToast: (msg: string, err?: boolean) => void;
};

/** Пачка живых карточек доски; не весь каталог Kaiten. */
const REFRESH_CHUNK = 8;
const CHUNK_TIMEOUT_MS = 90_000;

function backfillFetchSignal(): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(CHUNK_TIMEOUT_MS);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), CHUNK_TIMEOUT_MS);
  return c.signal;
}

async function readBackfillJson(res: Response): Promise<BackfillBatchResponse> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(
      "Сервер оборвал ответ (таймаут). Нажмите обновление ещё раз.",
    );
  }
  try {
    return JSON.parse(text) as BackfillBatchResponse;
  } catch {
    const looksHtml = /^\s*</.test(text);
    throw new Error(
      looksHtml
        ? "Сервер оборвал ответ (таймаут или сбой). Повторите обновление."
        : "Сервер вернул не JSON. Повторите обновление.",
    );
  }
}

function formatFetchError(err: unknown): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return "Обновление слишком долгое. Нажмите ещё раз.";
  }
  if (err instanceof Error && err.name === "AbortError") {
    return "Обновление слишком долгое. Нажмите ещё раз.";
  }
  if (err instanceof Error && /Unexpected end of JSON/i.test(err.message)) {
    return "Сервер оборвал ответ (таймаут). Нажмите обновление ещё раз.";
  }
  return err instanceof Error ? err.message : "Ошибка обновления";
}

/**
 * Подтягивает с Kaiten карточки открытой доски (не «Сдано админам»):
 * колонку, людей, asap, срок этапа. Люди и срок пишутся в наряд CRM.
 */
export function KanbanMembersBackfillButton({
  disabled,
  refreshTargets = [],
  linkedOrderCount = 0,
  onBeforeRefresh,
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
    try {
      await onBeforeRefresh?.();
    } catch {
      /* снимок мог не записаться — сервер всё равно ищет по наряду / Kaiten id */
    }
    onRunningChange?.(true);
    setRunning(true);
    setDone(0);
    const queue = refreshTargets.map((t) => ({ ...t }));
    const totalCount = queue.length;
    setTotal(totalCount);
    setStatus(
      totalCount > 0
        ? `Обновление карточек на доске (${totalCount})…`
        : "Нет карточек на доске для обновления",
    );

    const allPatches: KaitenRefreshCardPatch[] = [];
    let processedSum = 0;
    let changedSum = 0;
    let skippedSum = 0;
    let noCardSum = 0;
    let unmappedSum = 0;
    try {
      if (totalCount === 0) {
        showToast("Нет карточек на доске для обновления");
        return;
      }
      for (let i = 0; i < queue.length; i += REFRESH_CHUNK) {
        if (abortRef.current) {
          setStatus("Остановлено");
          break;
        }
        const chunk = queue.slice(i, i + REFRESH_CHUNK);
        const batchRes = await fetch("/api/kanban/members-backfill", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          signal: backfillFetchSignal(),
          body: JSON.stringify({
            action: "batch",
            all: false,
            total: totalCount,
            targets: chunk,
          }),
        });
        if (abortRef.current) {
          setStatus("Остановлено");
          break;
        }
        const batch = await readBackfillJson(batchRes);
        if (!batchRes.ok) {
          throw new Error(batch.error || "Ошибка обновления");
        }
        processedSum += batch.processed ?? chunk.length;
        changedSum += batch.changed ?? 0;
        skippedSum += batch.skipped ?? 0;
        noCardSum += batch.noCard ?? 0;
        unmappedSum += batch.unmapped ?? 0;
        if (Array.isArray(batch.patches)) {
          allPatches.push(...batch.patches);
        }
        const doneNow = Math.min(processedSum, totalCount);
        setDone(doneNow);
        setStatus(
          formatProgressLine({
            processed: doneNow,
            changed: changedSum,
            skipped: skippedSum,
            noCard: noCardSum,
            unmapped: unmappedSum,
            totalCount,
          }),
        );
      }
      if (allPatches.length > 0) {
        await onComplete(allPatches);
      } else if (!abortRef.current) {
        await onComplete([]);
      }
      if (!abortRef.current) {
        const summary = formatProgressLine({
          processed: Math.min(processedSum, totalCount),
          changed: changedSum,
          skipped: skippedSum,
          noCard: noCardSum,
          unmapped: unmappedSum,
          totalCount,
          prefix: "Готово",
        });
        setStatus(summary);
        showToast(summary);
      }
    } catch (err) {
      if (allPatches.length > 0) {
        try {
          await onComplete(allPatches);
        } catch {
          /* патчи лучше применить, даже если тост уже про ошибку */
        }
      }
      const msg = formatFetchError(err);
      setStatus(msg);
      showToast(msg, true);
    } finally {
      onRunningChange?.(false);
      setRunning(false);
    }
  }, [
    disabled,
    formatProgressLine,
    linkedOrderCount,
    refreshTargets,
    onBeforeRefresh,
    onComplete,
    onRunningChange,
    running,
    showToast,
  ]);

  const pct =
    running && done === 0
      ? 100
      : total > 0
        ? Math.min(100, Math.round((done / total) * 100))
        : 0;
  const tip =
    "Обновить с Kaiten карточки на этой доске (без «Сдано админам»): колонку, сроки, срочность, участников";

  return (
    <div className="contents">
      <button
        type="button"
        disabled={disabled || running}
        title={tip}
        aria-label={running ? "Обновление…" : "Обновить"}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] text-[var(--kanban-text)] hover:brightness-[0.98] disabled:cursor-wait disabled:opacity-60 dark:hover:brightness-110"
        onClick={() => void runBackfill()}
      >
        <IconRefresh className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
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
              className={`h-full rounded-full bg-[var(--kanban-accent)] transition-[width] duration-300 ${
                running && done === 0 ? "animate-pulse" : ""
              }`}
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
