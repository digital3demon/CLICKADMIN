"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { kaitenClientPollIntervalMs } from "@/lib/kaiten-client-poll-ms";
import { kaitenFastLivePollIntervalMs } from "@/lib/kaiten-rate-limit";

const WINDOW = 10;
/**
 * Live-импорт чата из Kaiten на широком списке (chat-corrections).
 * Ротация по всему `ids`, не только по текущему titles-бакету — иначе «!!!»/«???»
 * могут ждать несколько минут, пока заказ снова попадёт в окно колонок.
 */
const LIGHT_COMMENT_PULL_MAX = 8;
/** Без поиска: live-синк всего видимого списка, если он не шире этого. */
const FAST_LIVE_SYNC_MAX_DEFAULT = 8;
/** С активным q: не больше N нарядов за проход, строго по одному (без параллели). */
const FAST_LIVE_SYNC_MAX_SEARCH = 8;
/** Обычный refresh списка (колонки/кликлаб) — не чаще. */
const LIST_REFRESH_MIN_MS = 15_000;
/** Импорт «!!!»/«???» — быстрее, иначе UI ждёт канбан. */
const LIST_REFRESH_IMPORT_MIN_MS = 2_000;

type ChatCorrectionsLivePayload = {
  error?: string;
  importedCorrections?: number;
  importedProsthetics?: number;
  labMentionDbChanged?: boolean;
};

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

function chatCorrectionsImported(data: ChatCorrectionsLivePayload): boolean {
  return (
    (data.importedCorrections ?? 0) > 0 ||
    (data.importedProsthetics ?? 0) > 0 ||
    data.labMentionDbChanged === true
  );
}

/**
 * Фоновая синхронизация колонок Kaiten в БД для строк списка и последующий router.refresh().
 * Kaiten ~5 req/s: без параллельных всплесков, приоритет у действий пользователя (очередь kaitenFetch).
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
  const fastLiveMax = searchActive
    ? FAST_LIVE_SYNC_MAX_SEARCH
    : FAST_LIVE_SYNC_MAX_DEFAULT;
  const offsetRef = useRef(0);
  const lightCommentOffsetRef = useRef(0);
  const backoffRef = useRef(0);
  const fastBackoffRef = useRef(0);
  const mentionStateRef = useRef("");
  const inFlightRef = useRef(false);
  const fastInFlightRef = useRef(false);
  const fastSyncGenRef = useRef(0);
  const lastListRefreshAtRef = useRef(0);

  const refreshListDebounced = useCallback(
    (opts?: { importHit?: boolean }) => {
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

  /**
   * GET /chat-corrections → syncOrderChatCorrectionsFromKaitenLive (корректировки + протетика).
   * Запросы к CRM — по одному, чтобы на сервере не устроить всплеск kaitenListComments.
   */
  const pullKaitenChatFeedLiveForVisible = useCallback(async (): Promise<{
    ok: boolean;
    imported: boolean;
  }> => {
    if (ids.length === 0 || ids.length > fastLiveMax) {
      return { ok: false, imported: false };
    }
    if (document.visibilityState !== "visible") {
      return { ok: false, imported: false };
    }
    if (Date.now() < fastBackoffRef.current || Date.now() < backoffRef.current) {
      return { ok: false, imported: false };
    }
    if (fastInFlightRef.current || inFlightRef.current) {
      return { ok: false, imported: false };
    }
    fastInFlightRef.current = true;
    const gen = ++fastSyncGenRef.current;
    let rateLimited = false;
    let imported = false;
    try {
      for (const orderId of ids) {
        if (gen !== fastSyncGenRef.current) break;
        if (Date.now() < fastBackoffRef.current) break;
        try {
          const res = await fetch(
            `/api/orders/${encodeURIComponent(orderId)}/chat-corrections`,
            { credentials: "include", cache: "no-store" },
          );
          if (res.status === 429) {
            rateLimited = true;
            fastBackoffRef.current =
              Date.now() + parseRetryAfterMs(res.headers.get("Retry-After"));
            backoffRef.current = fastBackoffRef.current;
            break;
          }
          if (!res.ok) continue;
          const data = (await res.json().catch(() => ({}))) as ChatCorrectionsLivePayload;
          if (chatCorrectionsImported(data)) imported = true;
        } catch {
          /* ignore */
        }
      }
    } finally {
      fastInFlightRef.current = false;
    }
    return {
      ok: gen === fastSyncGenRef.current && !rateLimited,
      imported,
    };
  }, [ids, fastLiveMax]);

  const tick = useCallback(async () => {
    if (ids.length === 0) return;
    if (document.visibilityState !== "visible") return;
    if (Date.now() < backoffRef.current) return;
    if (inFlightRef.current || fastInFlightRef.current) return;
    inFlightRef.current = true;

    const n = ids.length;
    /**
     * Узкий список (≤ WINDOW): comments в titles-sync.
     * Широкий: titles без comments + ротация live chat-corrections по всему списку.
     */
    const includeComments = n <= WINDOW;

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
        const waitMs = parseRetryAfterMs(res.headers.get("Retry-After"));
        backoffRef.current = Date.now() + waitMs;
        fastBackoffRef.current = backoffRef.current;
        return;
      }

      let lightImported = false;
      if (!includeComments && ids.length > fastLiveMax) {
        const lightStart = lightCommentOffsetRef.current % n;
        const lightIds: string[] = [];
        const lightTake = Math.min(LIGHT_COMMENT_PULL_MAX, n);
        for (let i = 0; i < lightTake; i += 1) {
          lightIds.push(ids[(lightStart + i) % n]!);
        }
        lightCommentOffsetRef.current = lightStart + lightTake;
        for (const orderId of lightIds) {
          if (Date.now() < backoffRef.current) break;
          try {
            const ccRes = await fetch(
              `/api/orders/${encodeURIComponent(orderId)}/chat-corrections`,
              { credentials: "include", cache: "no-store" },
            );
            if (ccRes.status === 429) {
              const waitMs = parseRetryAfterMs(ccRes.headers.get("Retry-After"));
              backoffRef.current = Date.now() + waitMs;
              fastBackoffRef.current = backoffRef.current;
              break;
            }
            if (!ccRes.ok) continue;
            const ccData = (await ccRes
              .json()
              .catch(() => ({}))) as ChatCorrectionsLivePayload;
            if (chatCorrectionsImported(ccData)) lightImported = true;
          } catch {
            /* ignore */
          }
        }
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
      const importHit =
        lightImported ||
        data.newCorrectionsImported === true ||
        data.newProstheticsImported === true ||
        data.kaitenLabMentionDbChanged === true;
      /* Не refresh от голого ok chat-corrections — иначе каждые ~12с шторм RSC. */
      if (
        importHit ||
        (data.syncedCount ?? 0) > 0 ||
        mentionChanged
      ) {
        refreshListDebounced({ importHit });
      }
    } catch {
      /* ignore */
    } finally {
      inFlightRef.current = false;
    }
  }, [ids, refreshListDebounced, onSyncExtras, fastLiveMax]);

  const runFastLiveThenRefresh = useCallback(async () => {
    if (ids.length === 0 || ids.length > fastLiveMax) return;
    const result = await pullKaitenChatFeedLiveForVisible();
    if (result.imported) {
      refreshListDebounced({ importHit: true });
    }
  }, [
    ids.length,
    fastLiveMax,
    pullKaitenChatFeedLiveForVisible,
    refreshListDebounced,
  ]);

  /** Смена списка (поиск): один live-проход, тяжёлый tick — с паузой, без наложения на PATCH карточки. */
  useEffect(() => {
    if (ids.length === 0) return;
    offsetRef.current = 0;
    lightCommentOffsetRef.current = 0;
    let cancelled = false;
    void (async () => {
      const result = await pullKaitenChatFeedLiveForVisible();
      if (cancelled) return;
      if (result.ok || result.imported) {
        refreshListDebounced({ importHit: result.imported });
      }
      if (!cancelled) {
        window.setTimeout(() => {
          if (!cancelled) void tick();
        }, 2500);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idsKey, pullKaitenChatFeedLiveForVisible, refreshListDebounced, tick]);

  useEffect(() => {
    if (ids.length === 0) return;
    const pollMs = kaitenClientPollIntervalMs();
    const t0 = window.setTimeout(() => void tick(), 800);
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
        window.setTimeout(() => void tick(), 500);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [ids, tick]);

  useEffect(() => {
    if (ids.length === 0 || ids.length > fastLiveMax) return;
    const fastMs = kaitenFastLivePollIntervalMs();
    /** Сдвиг на пол-интервала — не совпадать с основным tick списка. */
    const t0 = window.setTimeout(
      () => void runFastLiveThenRefresh(),
      Math.floor(fastMs / 2),
    );
    const id = window.setInterval(() => {
      void runFastLiveThenRefresh();
    }, fastMs);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(id);
    };
  }, [ids.length, fastLiveMax, runFastLiveThenRefresh]);

  return null;
}
