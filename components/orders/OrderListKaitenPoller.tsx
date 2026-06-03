"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { kaitenClientPollIntervalMs } from "@/lib/kaiten-client-poll-ms";

const WINDOW = 10;
/** Узкий список / поиск: live GET /chat-corrections (как в редактировании наряда). */
const FAST_LIVE_SYNC_MAX_DEFAULT = 5;
const FAST_LIVE_SYNC_MAX_SEARCH = 25;
const FAST_LIVE_POLL_MS = 4000;

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
  searchActive = false,
  onSyncExtras,
}: {
  orderIds: string[];
  searchActive?: boolean;
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
  const idsKey = useMemo(() => ids.join("|"), [ids]);
  const fastLiveMax = searchActive
    ? FAST_LIVE_SYNC_MAX_SEARCH
    : FAST_LIVE_SYNC_MAX_DEFAULT;
  const offsetRef = useRef(0);
  const backoffRef = useRef(0);
  const mentionStateRef = useRef("");
  /** Тяжёлый POST kaiten-titles-sync (колонки + чат пачкой) — не параллелим. */
  const inFlightRef = useRef(false);
  const fastInFlightRef = useRef(false);
  const fastSyncGenRef = useRef(0);

  /**
   * Тот же live-синк, что в редактировании наряда (панели «!!!» и «???»):
   * GET /chat-corrections → syncOrderChatCorrectionsFromKaitenLive (корректировки + заявки протетики).
   */
  const pullKaitenChatFeedLiveForVisible = useCallback(async (): Promise<void> => {
    if (ids.length === 0 || ids.length > fastLiveMax) return;
    if (document.visibilityState !== "visible") return;
    if (fastInFlightRef.current) return;
    fastInFlightRef.current = true;
    const gen = ++fastSyncGenRef.current;
    try {
      await Promise.all(
        ids.map((orderId) =>
          fetch(`/api/orders/${encodeURIComponent(orderId)}/chat-corrections`, {
            credentials: "include",
            cache: "no-store",
          }).catch(() => null),
        ),
      );
    } finally {
      fastInFlightRef.current = false;
    }
    if (gen !== fastSyncGenRef.current) return;
  }, [ids, fastLiveMax]);

  const tick = useCallback(async () => {
    if (ids.length === 0) return;
    if (document.visibilityState !== "visible") return;
    if (Date.now() < backoffRef.current) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    /** «!!!»/«???» для узкого списка — через быстрый GET; здесь в основном колонки и @лаба. */
    const includeComments =
      ids.length > fastLiveMax &&
      (searchActive ? ids.length > FAST_LIVE_SYNC_MAX_SEARCH : true);

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
        kaitenLabMentionDbChanged?: boolean;
      };
      if (!res.ok || isRateLimited(res, data)) {
        backoffRef.current = Date.now() + 90_000;
        return;
      }
      void fetch("/api/orders/kanban-chat-retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: batch }),
      }).catch(() => {});
      if (n > WINDOW) {
        offsetRef.current = (offsetRef.current + WINDOW) % n;
      }
      if (data.clicklabByOrderId && Object.keys(data.clicklabByOrderId).length > 0) {
        onSyncExtras?.({ clicklabByOrderId: data.clicklabByOrderId });
      }
      const mentionKey = data.clicklabByOrderId
        ? Object.entries(data.clicklabByOrderId)
            .filter(([, v]) => v === true)
            .map(([id]) => id)
            .sort()
            .join("|")
        : "";
      const mentionChanged = mentionKey !== mentionStateRef.current;
      mentionStateRef.current = mentionKey;
      if (
        (data.syncedCount ?? 0) > 0 ||
        data.newCorrectionsImported ||
        data.newProstheticsImported ||
        data.kaitenLabMentionDbChanged === true ||
        mentionChanged
      ) {
        router.refresh();
      }
    } catch {
      /* ignore */
    } finally {
      inFlightRef.current = false;
    }
  }, [ids, router, onSyncExtras, fastLiveMax, searchActive]);

  const runFastLiveThenRefresh = useCallback(async () => {
    if (ids.length === 0 || ids.length > fastLiveMax) return;
    await pullKaitenChatFeedLiveForVisible();
    router.refresh();
  }, [ids.length, fastLiveMax, pullKaitenChatFeedLiveForVisible, router]);

  /** Смена списка (поиск «2605-060»): наряд мог не быть в очереди poller до q. */
  useEffect(() => {
    if (ids.length === 0) return;
    offsetRef.current = 0;
    backoffRef.current = 0;
    inFlightRef.current = false;
    let cancelled = false;
    void (async () => {
      await pullKaitenChatFeedLiveForVisible();
      if (cancelled) return;
      router.refresh();
      if (!cancelled) void tick();
    })();
    return () => {
      cancelled = true;
    };
  }, [idsKey, pullKaitenChatFeedLiveForVisible, router, tick]);

  /** Пока на экране мало строк — повторяем live-синк, не ждём тяжёлого POST (~30 с). */
  useEffect(() => {
    if (ids.length === 0 || ids.length > fastLiveMax) return;
    const t0 = window.setTimeout(() => void runFastLiveThenRefresh(), 80);
    const id = window.setInterval(() => void runFastLiveThenRefresh(), FAST_LIVE_POLL_MS);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(id);
    };
  }, [idsKey, ids.length, fastLiveMax, runFastLiveThenRefresh]);

  useEffect(() => {
    if (ids.length === 0) return;
    const pollMs =
      ids.length <= 3
        ? Math.min(5000, kaitenClientPollIntervalMs())
        : kaitenClientPollIntervalMs();
    const t0 = window.setTimeout(() => void tick(), 200);
    const id = window.setInterval(() => void tick(), pollMs);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(id);
    };
  }, [ids.length, tick]);

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
