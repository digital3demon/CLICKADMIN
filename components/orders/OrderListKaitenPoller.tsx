"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { kaitenClientPollIntervalMs } from "@/lib/kaiten-client-poll-ms";

const WINDOW = 10;
/** Каждый N-й тик — полный синк с комментариями (@clicklab, корректировки из чата). */
const FULL_COMMENT_SYNC_EVERY_N_TICKS = 3;

function isRateLimited(res: Response, data: { error?: string }): boolean {
  if (res.status === 429) return true;
  const m = (data.error ?? "").toLowerCase();
  return (
    m.includes("много запросов") ||
    m.includes("too many") ||
    m.includes("rate_limit")
  );
}

/**
 * Фоновая синхронизация колонок Kaiten в БД для строк списка и последующий router.refresh().
 * За один проход не более WINDOW нарядов (остальные — по кругу на следующих тиках).
 */
export function OrderListKaitenPoller({
  orderIds,
  onSyncExtras,
}: {
  orderIds: string[];
  /** Доп. данные из ответа синхронизации (например, упоминания @clicklab в чате). */
  onSyncExtras?: (payload: {
    clicklabByOrderId?: Record<string, boolean>;
  }) => void;
}) {
  const router = useRouter();
  const ids = useMemo(
    () => [...new Set(orderIds.map((x) => x.trim()).filter(Boolean))],
    [orderIds],
  );
  const offsetRef = useRef(0);
  const backoffRef = useRef(0);
  const tickIndexRef = useRef(0);
  /** Синк с Kaiten длится десятки секунд — не запускаем новый POST, пока предыдущий не завершён. */
  const inFlightRef = useRef(false);

  const tick = useCallback(async () => {
    if (ids.length === 0) return;
    if (document.visibilityState !== "visible") return;
    if (Date.now() < backoffRef.current) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    tickIndexRef.current += 1;
    const includeComments =
      tickIndexRef.current % FULL_COMMENT_SYNC_EVERY_N_TICKS === 0;

    const n = ids.length;
    let batch: string[];
    if (n <= WINDOW) {
      batch = ids;
    } else {
      const start = offsetRef.current;
      const picked = new Set<string>();
      for (let i = 0; i < WINDOW; i += 1) {
        picked.add(ids[(start + i) % n]!);
      }
      batch = [...picked];
    }

    try {
      const res = await fetch("/api/orders/kaiten-titles-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: batch, includeComments }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        syncedCount?: number;
        newCorrectionsImported?: boolean;
        newProstheticsImported?: boolean;
        clicklabByOrderId?: Record<string, boolean>;
      };
      if (!res.ok || isRateLimited(res, data)) {
        backoffRef.current = Date.now() + 90_000;
        return;
      }
      if (n > WINDOW) {
        offsetRef.current = (offsetRef.current + WINDOW) % n;
      }
      if (data.clicklabByOrderId && Object.keys(data.clicklabByOrderId).length > 0) {
        onSyncExtras?.({ clicklabByOrderId: data.clicklabByOrderId });
      }
      if (
        (data.syncedCount ?? 0) > 0 ||
        data.newCorrectionsImported ||
        data.newProstheticsImported
      ) {
        router.refresh();
      }
    } catch {
      /* ignore */
    } finally {
      inFlightRef.current = false;
    }
  }, [ids, router, onSyncExtras]);

  useEffect(() => {
    if (ids.length === 0) return;
    const pollMs = kaitenClientPollIntervalMs();
    const t0 = window.setTimeout(() => void tick(), 200);
    const id = window.setInterval(() => void tick(), pollMs);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(id);
    };
  }, [ids, tick]);

  useEffect(() => {
    if (ids.length === 0) return;
    const onVis = () => {
      if (document.visibilityState === "visible") {
        window.setTimeout(() => void tick(), 150);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [ids, tick]);

  return null;
}
