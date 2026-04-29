"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type OrderProstheticsRequestInitial = {
  id: string;
  text: string;
  source: "KAITEN" | "DEMO_KANBAN";
  createdAt: string;
  resolvedAt: string | null;
  rejectedAt: string | null;
};

function requestsFingerprint(list: OrderProstheticsRequestInitial[]): string {
  return [...list]
    .map((c) => `${c.id}:${c.resolvedAt ?? ""}:${c.rejectedAt ?? ""}:${c.source}`)
    .sort()
    .join("|");
}

/** Тот же интервал, что у корректировок (`NEXT_PUBLIC_ORDER_CHAT_CORRECTIONS_POLL_MS`). */
function orderProstheticsRequestsPollMs(): number {
  if (typeof window === "undefined") return 2500;
  const raw = process.env.NEXT_PUBLIC_ORDER_CHAT_CORRECTIONS_POLL_MS;
  const n =
    raw != null && String(raw).trim()
      ? Number.parseInt(String(raw).trim(), 10)
      : 2500;
  if (!Number.isFinite(n)) return 2500;
  return Math.min(Math.max(n, 1500), 30_000);
}

export function OrderProstheticsRequestsPanel({
  orderId,
  requests,
  canAccept,
}: {
  orderId: string;
  requests: OrderProstheticsRequestInitial[];
  canAccept: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [live, setLive] = useState<OrderProstheticsRequestInitial[]>(requests);
  const lastFpRef = useRef(requestsFingerprint(requests));
  const [archiveOpen, setArchiveOpen] = useState(false);

  /** Только при смене наряда — иначе устаревшие props после accept/reject затирали live. */
  useEffect(() => {
    setLive(requests);
    lastFpRef.current = requestsFingerprint(requests);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    const pollMs = orderProstheticsRequestsPollMs();

    const tick = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/orders/${orderId}/prosthetics-requests`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const j = (await res.json().catch(() => ({}))) as {
          requests?: OrderProstheticsRequestInitial[];
        };
        const next = j.requests;
        if (!Array.isArray(next) || cancelled) return;
        const fp = requestsFingerprint(next);
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
      const res = await fetch(`/api/orders/${orderId}/prosthetics-requests`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return false;
      const j = (await res.json().catch(() => ({}))) as {
        requests?: OrderProstheticsRequestInitial[];
      };
      if (!Array.isArray(j.requests)) return false;
      lastFpRef.current = requestsFingerprint(j.requests);
      setLive(j.requests);
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
    async (requestId: string) => {
      setErr(null);
      setBusyId(requestId);
      try {
        const res = await fetch(
          `/api/orders/${orderId}/prosthetics-requests/${requestId}/accept`,
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
    async (requestId: string) => {
      setErr(null);
      setBusyId(requestId);
      try {
        const res = await fetch(
          `/api/orders/${orderId}/prosthetics-requests/${requestId}/reject`,
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

  const srcLabel = (s: OrderProstheticsRequestInitial["source"]) =>
    s === "KAITEN" ? "Kaiten" : "Канбан";

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-2">
      <h3 className="shrink-0 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Что заказать / выдать
      </h3>
      {err ? (
        <p className="text-xs text-red-600" role="alert">
          {err}
        </p>
      ) : null}
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {pending.map((c) => (
          <li
            key={c.id}
            className="flex items-start gap-2 rounded-md border border-rose-200/80 bg-rose-50/50 px-2 py-1.5 text-sm dark:border-rose-900/50 dark:bg-rose-950/25"
          >
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-wrap text-[var(--text-body)]">
                {c.text}
              </p>
              <p className="mt-0.5 text-[0.65rem] text-[var(--text-muted)]">
                {srcLabel(c.source)}
              </p>
            </div>
            {canAccept ? (
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={busyId != null}
                  title="Занесено в наряд — в Kaiten уйдёт «протетика в пути»"
                  aria-label="Принять заявку"
                  className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                  onClick={() => void accept(c.id)}
                >
                  ✓
                </button>
                <button
                  type="button"
                  disabled={busyId != null}
                  title="Отклонить — в Kaiten уйдёт «отказ по протетике»"
                  aria-label="Отклонить заявку"
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
            id={`order-prosthetics-archive-toggle-${orderId}`}
            aria-expanded={archiveOpen}
            aria-controls={`order-prosthetics-archive-list-${orderId}`}
            title={archiveOpen ? "Свернуть" : "Развернуть"}
            onClick={() => setArchiveOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left text-[0.65rem] leading-snug text-[var(--text-muted)] hover:bg-[var(--surface-muted)]/80"
          >
            <span>
              Обработанные
              <span className="ml-1.5 tabular-nums text-[var(--text-secondary)]">
                ({archived.length})
              </span>
            </span>
            <span className="tabular-nums text-[var(--text-muted)]">
              {archiveOpen ? "▲" : "▼"}
            </span>
          </button>
          {archiveOpen ? (
            <ul
              id={`order-prosthetics-archive-list-${orderId}`}
              className="mt-2 space-y-1.5"
              aria-labelledby={`order-prosthetics-archive-toggle-${orderId}`}
            >
              {archived.map((c) => (
                <li
                  key={c.id}
                  className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)]/60 px-2 py-1 text-xs text-[var(--text-secondary)]"
                >
                  <p className="whitespace-pre-wrap">{c.text}</p>
                  <p className="mt-0.5 text-[0.6rem] text-[var(--text-muted)]">
                    {c.resolvedAt
                      ? "Принято"
                      : c.rejectedAt
                        ? "Отклонено"
                        : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
