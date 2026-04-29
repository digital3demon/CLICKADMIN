"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type OrderChatCorrectionInitial = {
  id: string;
  text: string;
  source: "KAITEN" | "DEMO_KANBAN";
  createdAt: string;
  resolvedAt: string | null;
  rejectedAt: string | null;
};

function correctionsFingerprint(list: OrderChatCorrectionInitial[]): string {
  return [...list]
    .map((c) => `${c.id}:${c.resolvedAt ?? ""}:${c.rejectedAt ?? ""}:${c.source}`)
    .sort()
    .join("|");
}

/**
 * Интервал опроса GET /chat-corrections (мс). На сервере при каждом запросе
 * подтягиваются комментарии из Kaiten. Диапазон 2000–30000, по умолчанию 5000.
 */
function orderChatCorrectionsPollMs(): number {
  if (typeof window === "undefined") return 5000;
  const raw = process.env.NEXT_PUBLIC_ORDER_CHAT_CORRECTIONS_POLL_MS;
  const n =
    raw != null && String(raw).trim()
      ? Number.parseInt(String(raw).trim(), 10)
      : 5000;
  if (!Number.isFinite(n)) return 5000;
  return Math.min(Math.max(n, 2000), 30_000);
}

export function OrderChatCorrectionsPanel({
  orderId,
  corrections,
  canAccept,
}: {
  orderId: string;
  corrections: OrderChatCorrectionInitial[];
  canAccept: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [live, setLive] = useState<OrderChatCorrectionInitial[]>(corrections);
  const lastFpRef = useRef(correctionsFingerprint(corrections));
  /** Архив по умолчанию свёрнут. */
  const [archiveOpen, setArchiveOpen] = useState(false);

  /** Только при смене наряда: иначе устаревшие props после router.refresh затирали актуальный live. */
  useEffect(() => {
    setLive(corrections);
    lastFpRef.current = correctionsFingerprint(corrections);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- сброс по props только при orderId; обновления — опрос + refetch после accept/reject
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    const pollMs = orderChatCorrectionsPollMs();

    const tick = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/orders/${orderId}/chat-corrections`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const j = (await res.json().catch(() => ({}))) as {
          corrections?: OrderChatCorrectionInitial[];
        };
        const next = j.corrections;
        if (!Array.isArray(next) || cancelled) return;
        const fp = correctionsFingerprint(next);
        if (fp !== lastFpRef.current) {
          lastFpRef.current = fp;
          setLive(next);
        }
      } catch {
        /* ignore */
      }
    };

    const t0 = window.setTimeout(() => void tick(), 250);
    const id = window.setInterval(() => void tick(), pollMs);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        window.setTimeout(() => void tick(), 200);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearTimeout(t0);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [orderId]);

  const pullListFromApi = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/orders/${orderId}/chat-corrections`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return false;
      const j = (await res.json().catch(() => ({}))) as {
        corrections?: OrderChatCorrectionInitial[];
      };
      if (!Array.isArray(j.corrections)) return false;
      lastFpRef.current = correctionsFingerprint(j.corrections);
      setLive(j.corrections);
      return true;
    } catch {
      return false;
    }
  }, [orderId]);

  const { pending, archived } = useMemo(() => {
    const p = live
      .filter((c) => !c.resolvedAt && !c.rejectedAt)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const a = live
      .filter((c) => Boolean(c.resolvedAt) || Boolean(c.rejectedAt))
      .sort((x, y) => {
        const tx = new Date(
          x.resolvedAt ?? x.rejectedAt ?? x.createdAt,
        ).getTime();
        const ty = new Date(
          y.resolvedAt ?? y.rejectedAt ?? y.createdAt,
        ).getTime();
        return ty - tx;
      });
    return { pending: p, archived: a };
  }, [live]);

  const accept = useCallback(
    async (correctionId: string) => {
      setErr(null);
      setBusyId(correctionId);
      try {
        const res = await fetch(
          `/api/orders/${orderId}/chat-corrections/${correctionId}/accept`,
          { method: "POST", credentials: "include" },
        );
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setErr(j.error ?? "Не удалось принять");
          return;
        }
        await pullListFromApi();
        router.refresh();
      } catch {
        setErr("Сеть недоступна");
      } finally {
        setBusyId(null);
      }
    },
    [orderId, router, pullListFromApi],
  );

  const reject = useCallback(
    async (correctionId: string) => {
      setErr(null);
      setBusyId(correctionId);
      try {
        const res = await fetch(
          `/api/orders/${orderId}/chat-corrections/${correctionId}/reject`,
          { method: "POST", credentials: "include" },
        );
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setErr(j.error ?? "Не удалось отклонить");
          return;
        }
        await pullListFromApi();
        router.refresh();
      } catch {
        setErr("Сеть недоступна");
      } finally {
        setBusyId(null);
      }
    },
    [orderId, router, pullListFromApi],
  );

  const srcLabel = (s: OrderChatCorrectionInitial["source"]) =>
    s === "KAITEN" ? "Kaiten" : "Канбан";

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <h3 className="shrink-0 text-sm font-semibold uppercase tracking-wide text-[var(--app-text)]">
        Корректировки
      </h3>
      {err ? (
        <p className="text-xs text-red-600" role="alert">
          {err}
        </p>
      ) : null}
      {pending.length === 0 && archived.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">
          Пока нет корректировок из чата.
        </p>
      ) : null}
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {pending.map((c) => (
          <li
            key={c.id}
            className="flex items-start gap-2 rounded-md border border-amber-200/80 bg-amber-50/50 px-2 py-1.5 text-sm dark:border-amber-800/50 dark:bg-amber-950/25"
          >
            <p className="min-w-0 flex-1 whitespace-pre-wrap text-[var(--text-body)]">
              {c.text}
            </p>
            {canAccept ? (
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={busyId != null}
                  title="Изменения по составу внесены — отправить «корректировка занесена» в Kaiten"
                  aria-label="Принять корректировку"
                  className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                  onClick={() => void accept(c.id)}
                >
                  ✓
                </button>
                <button
                  type="button"
                  disabled={busyId != null}
                  title="Не принять корректировку — в Kaiten уйдёт «корректировка не принята»"
                  aria-label="Отклонить корректировку"
                  className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                  onClick={() => void reject(c.id)}
                >
                  ✕
                </button>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {archived.length > 0 ? (
        <div className="mt-1 border-t border-[var(--card-border)] pt-2">
          <button
            type="button"
            id={`order-corrections-archive-toggle-${orderId}`}
            aria-expanded={archiveOpen}
            aria-controls={`order-corrections-archive-list-${orderId}`}
            title={archiveOpen ? "Свернуть архив" : "Развернуть архив"}
            onClick={() => setArchiveOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left text-[0.65rem] leading-snug text-[var(--text-muted)] hover:bg-[var(--surface-muted)]/80"
          >
            <span>
              Архив корректировок
              <span className="ml-1.5 tabular-nums text-[var(--text-secondary)]">
                ({archived.length})
              </span>
            </span>
            <span
              className="shrink-0 text-[10px] font-medium text-[var(--text-secondary)]"
              aria-hidden
            >
              {archiveOpen ? "▼" : "▶"}
            </span>
          </button>
          {archiveOpen ? (
            <ul
              id={`order-corrections-archive-list-${orderId}`}
              className="mt-1.5 space-y-1.5"
              role="list"
            >
              {archived.map((c) => (
                <li
                  key={c.id}
                  className="rounded border border-[var(--card-border)]/60 bg-[var(--surface-subtle)]/50 px-2 py-1 text-xs italic text-[var(--text-muted)] opacity-80"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">
                      {srcLabel(c.source)}
                    </span>
                    {c.rejectedAt ? (
                      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold not-italic text-rose-900 dark:bg-rose-950/50 dark:text-rose-100">
                        Отклонено
                      </span>
                    ) : c.resolvedAt ? (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold not-italic text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
                        Принято
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap">{c.text}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
