"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  kaitenListTitlesPollIntervalMs,
  shouldRefreshListFromKaitenPoll,
} from "@/lib/order-list-live-refresh";

const WINDOW = 10;
/** Retry failed CRM→Kaiten comments: rarely, not every titles tick. */
const CHAT_RETRY_MIN_MS = 150_000;
/** Обычный refresh списка после импорта с Kaiten — не чаще. */
const LIST_REFRESH_MIN_MS = 15_000;
const LIST_REFRESH_IMPORT_MIN_MS = 2_000;

function isRateLimited(res: Response, data: { error?: string }): boolean {
  if (res.status === 429) return true;
  const m = (data.error ?? "").toLowerCase();
  return (
    m.includes("много запросов") ||
    m.includes("too many") ||
    m.includes("rate_limit")
  );
}

function parseRetryAfterMs(value: string | null): number {
  const raw = String(value || "").trim();
  if (!raw) return 90_000;
  const asSeconds = Number.parseInt(raw, 10);
  if (Number.isFinite(asSeconds) && asSeconds > 0) return Math.min(asSeconds * 1000, 120_000);
  const dateMs = Date.parse(raw);
  if (Number.isFinite(dateMs)) return Math.max(0, Math.min(dateMs - Date.now(), 120_000));
  return 90_000;
}

/**
 * Редкий фон: зеркало карточки Kaiten в БД.
 * Корр / протетика / чат / упоминания с канбана — через тосты (SQLite), не этот поллер.
 */
export function OrderListKaitenPoller({
  orderIds,
  searchActive = false,
  onSyncExtras,
}: {
  orderIds: string[];
  searchActive?: boolean;
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
  const offsetRef = useRef(0);
  const backoffRef = useRef(0);
  const mentionStateRef = useRef("");
  const inFlightRef = useRef(false);
  const lastListRefreshAtRef = useRef(0);
  const lastRetryAtRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const aliveRef = useRef(true);

  const refreshListDebounced = useCallback(
    (opts?: { importHit?: boolean }) => {
      if (!aliveRef.current) return;
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      const minMs = opts?.importHit
        ? LIST_REFRESH_IMPORT_MIN_MS
        : LIST_REFRESH_MIN_MS;
      if (now - lastListRefreshAtRef.current < minMs) return;
      lastListRefreshAtRef.current = now;
      router.refresh();
    },
    [router],
  );

  const tick = useCallback(async () => {
    if (ids.length === 0) return;
    if (!aliveRef.current) return;
    if (document.visibilityState !== "visible") return;
    if (Date.now() < backoffRef.current) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const n = ids.length;
    const includeComments = n <= WINDOW && !searchActive;

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
        signal: ac.signal,
      });
      if (ac.signal.aborted || !aliveRef.current) return;
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        listUiChanged?: boolean;
        newCorrectionsImported?: boolean;
        newProstheticsImported?: boolean;
        clicklabByOrderId?: Record<string, boolean>;
        kaitenLabMentionDbChanged?: boolean;
      };
      if (!res.ok || isRateLimited(res, data)) {
        const waitMs = parseRetryAfterMs(res.headers.get("Retry-After"));
        backoffRef.current = Date.now() + waitMs;
        return;
      }

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
      const importHit =
        data.newCorrectionsImported === true ||
        data.newProstheticsImported === true ||
        data.kaitenLabMentionDbChanged === true;
      if (
        shouldRefreshListFromKaitenPoll({
          importHit,
          mentionChanged,
          listUiChanged: data.listUiChanged === true,
        })
      ) {
        refreshListDebounced({ importHit });
      }

      const now = Date.now();
      if (now - lastRetryAtRef.current >= CHAT_RETRY_MIN_MS) {
        lastRetryAtRef.current = now;
        void fetch("/api/orders/kanban-chat-retry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderIds: batch }),
          signal: ac.signal,
        }).catch(() => {});
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      /* ignore */
    } finally {
      inFlightRef.current = false;
    }
  }, [ids, refreshListDebounced, onSyncExtras, searchActive]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    offsetRef.current = 0;
  }, [idsKey]);

  useEffect(() => {
    if (ids.length === 0) return;
    const pollMs = kaitenListTitlesPollIntervalMs(
      process.env.NEXT_PUBLIC_KAITEN_LIST_TITLES_POLL_MS,
    );
    let initialId: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (initialId != null) {
        window.clearTimeout(initialId);
        initialId = null;
      }
      if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
      abortRef.current?.abort();
    };

    const start = () => {
      if (document.visibilityState !== "visible") return;
      if (initialId != null || intervalId != null) return;
      initialId = window.setTimeout(() => {
        initialId = null;
        void tick();
        intervalId = window.setInterval(() => void tick(), pollMs);
      }, 12_000);
    };

    const onVis = () => {
      if (document.visibilityState === "visible") {
        window.setTimeout(() => void tick(), 800);
        start();
        return;
      }
      stop();
    };

    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ids.length, tick]);

  return null;
}
