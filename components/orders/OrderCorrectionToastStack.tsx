"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readClientState, writeClientState } from "@/lib/client-state-client";
import { orderChatToastTitle } from "@/lib/order-chat-trigger-author";
import { orderPathById } from "@/lib/order-public-ref";
import { isPublicStickerHubPath } from "@/lib/sticker-public-path";

const STORAGE_KEY = "orderToastDismissedV1";

type OrderToastRow = {
  id: string;
  text: string;
  authorLabel?: string | null;
  orderId: string;
  orderNumber: string;
  createdAt: string;
};

type ToastKind = "chat" | "correction" | "prosthetics";

const shells: Record<ToastKind, string> = {
  chat:
    "flex gap-2 rounded-lg border border-violet-200/90 bg-violet-50/95 pl-3 pr-1 py-2 text-sm shadow-lg backdrop-blur-sm dark:border-violet-800/60 dark:bg-violet-950/90",
  correction:
    "flex gap-2 rounded-lg border border-amber-200/90 bg-amber-50/95 pl-3 pr-1 py-2 text-sm shadow-lg backdrop-blur-sm dark:border-amber-800/60 dark:bg-amber-950/90",
  prosthetics:
    "flex gap-2 rounded-lg border border-sky-200/90 bg-sky-50/95 pl-3 pr-1 py-2 text-sm shadow-lg backdrop-blur-sm dark:border-sky-800/60 dark:bg-sky-950/90",
};

const titleTone: Record<ToastKind, string> = {
  chat: "text-violet-900/90 dark:text-violet-200/90",
  correction: "text-amber-900/90 dark:text-amber-200/90",
  prosthetics: "text-sky-800/90 dark:text-sky-200/90",
};

const dismissTone: Record<ToastKind, string> = {
  chat: "text-violet-900/70 hover:bg-violet-200/80 dark:text-violet-100/80 dark:hover:bg-violet-900/50",
  correction:
    "text-amber-900/70 hover:bg-amber-200/80 dark:text-amber-100/80 dark:hover:bg-amber-900/50",
  prosthetics:
    "text-sky-900/70 hover:bg-sky-200/80 dark:text-sky-100/80 dark:hover:bg-sky-900/50",
};

const linkTone: Record<ToastKind, string> = {
  chat: "text-violet-950 hover:underline dark:text-violet-50",
  correction: "text-amber-950 hover:underline dark:text-amber-50",
  prosthetics: "text-sky-950 hover:underline dark:text-sky-50",
};

function writeDismissedPrefixed(ids: Set<string>) {
  void writeClientState("user", STORAGE_KEY, [...ids]);
}

function snippet(text: string, max = 56): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function pollMs(): number {
  const raw = process.env.NEXT_PUBLIC_ORDER_CORRECTION_TOAST_POLL_MS;
  const n =
    raw != null && String(raw).trim()
      ? Number.parseInt(String(raw).trim(), 10)
      : 4000;
  if (!Number.isFinite(n)) return 4000;
  return Math.min(Math.max(n, 2500), 30_000);
}

function parseRetryAfterMs(value: string | null): number {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const asSeconds = Number.parseInt(raw, 10);
  if (Number.isFinite(asSeconds) && asSeconds > 0) return asSeconds * 1000;
  const dateMs = Date.parse(raw);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  return 0;
}

const MAX_PER_COLUMN = 5;

function dismissKey(kind: ToastKind, id: string): string {
  return `${kind}:${id}`;
}

function ToastCard({
  kind,
  row,
  onDismiss,
}: {
  kind: ToastKind;
  row: OrderToastRow;
  onDismiss: () => void;
}) {
  return (
    <div className={shells[kind]}>
      <Link
        href={orderPathById(row.orderId)}
        onClick={onDismiss}
        className={`min-w-0 flex-1 text-left leading-snug ${linkTone[kind]}`}
      >
        <span
          className={`block text-[0.65rem] font-semibold tracking-wide ${titleTone[kind]}`}
        >
          {orderChatToastTitle(kind, row.authorLabel)}
        </span>
        <span className="mt-0.5 block text-[var(--text-body)]">
          по наряду{" "}
          <span className="font-mono font-semibold tabular-nums">
            {row.orderNumber}
          </span>
          : «{snippet(row.text)}»
        </span>
      </Link>
      <button
        type="button"
        className={`shrink-0 self-start rounded px-1.5 py-0.5 text-lg leading-none ${dismissTone[kind]}`}
        aria-label="Скрыть уведомление"
        title="Скрыть"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}

export function OrderCorrectionToastStack() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const isLogin = pathname === "/login" || pathname.startsWith("/login/");
  const isKanban = pathname === "/kanban" || pathname.startsWith("/kanban/");
  const isPublicSticker = isPublicStickerHubPath(pathname);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [chatMessages, setChatMessages] = useState<OrderToastRow[]>([]);
  const [corrections, setCorrections] = useState<OrderToastRow[]>([]);
  const [prostheticsRequests, setProstheticsRequests] = useState<OrderToastRow[]>(
    [],
  );
  const lastFpRef = useRef<string>("");
  const pollInFlightRef = useRef(false);
  const nextPollAllowedAtRef = useRef(0);
  const pollBackoffMsRef = useRef(0);

  const mergeDismissed = useCallback((update: (prev: Set<string>) => Set<string>) => {
    setDismissed((prev) => {
      const next = update(prev);
      writeDismissedPrefixed(next);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const raw = await readClientState<unknown>("user", STORAGE_KEY);
      if (cancelled) return;
      if (Array.isArray(raw)) {
        setDismissed(
          new Set(raw.filter((x): x is string => typeof x === "string")),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLogin || isKanban || isPublicSticker) {
      setChatMessages([]);
      setCorrections([]);
      setProstheticsRequests([]);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      const now = Date.now();
      if (pollInFlightRef.current) return;
      if (nextPollAllowedAtRef.current > now) return;
      pollInFlightRef.current = true;
      try {
        const [resChat, resCorr, resPro] = await Promise.all([
          fetch("/api/order-chat-messages/toasts", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/order-chat-corrections/toasts", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/order-prosthetics-requests/toasts", {
            credentials: "include",
            cache: "no-store",
          }),
        ]);
        if (cancelled) return;
        const retryMs = Math.max(
          resChat.status === 429 ? parseRetryAfterMs(resChat.headers.get("Retry-After")) : 0,
          resCorr.status === 429 ? parseRetryAfterMs(resCorr.headers.get("Retry-After")) : 0,
          resPro.status === 429 ? parseRetryAfterMs(resPro.headers.get("Retry-After")) : 0,
        );
        if (retryMs > 0) {
          nextPollAllowedAtRef.current = Date.now() + Math.max(1000, retryMs);
          return;
        }

        let chatList: OrderToastRow[] = [];
        if (resChat.status !== 403 && resChat.status !== 401 && resChat.ok) {
          const j = (await resChat.json().catch(() => ({}))) as {
            messages?: OrderToastRow[];
          };
          chatList = Array.isArray(j.messages) ? j.messages : [];
        }

        let corrList: OrderToastRow[] = [];
        if (resCorr.status !== 403 && resCorr.status !== 401 && resCorr.ok) {
          const j = (await resCorr.json().catch(() => ({}))) as {
            corrections?: OrderToastRow[];
          };
          corrList = Array.isArray(j.corrections) ? j.corrections : [];
        }

        let proList: OrderToastRow[] = [];
        if (resPro.status !== 403 && resPro.status !== 401 && resPro.ok) {
          const j = (await resPro.json().catch(() => ({}))) as {
            requests?: OrderToastRow[];
          };
          proList = Array.isArray(j.requests) ? j.requests : [];
        }

        const fp = `h:${chatList.map((x) => x.id).join(",")}|c:${corrList.map((x) => x.id).join(",")}|p:${proList.map((x) => x.id).join(",")}`;
        if (fp !== lastFpRef.current) {
          lastFpRef.current = fp;
          setChatMessages(chatList);
          setCorrections(corrList);
          setProstheticsRequests(proList);
          if (
            pathname === "/orders" ||
            pathname.startsWith("/orders/") ||
            pathname === "/finance-office" ||
            pathname.startsWith("/finance-office/") ||
            pathname === "/shipments" ||
            pathname.startsWith("/shipments/")
          ) {
            router.refresh();
          }
        }
        pollBackoffMsRef.current = 0;
        nextPollAllowedAtRef.current = 0;
      } catch {
        pollBackoffMsRef.current = Math.min(
          60_000,
          Math.max(4000, pollBackoffMsRef.current * 2 || 4000),
        );
        nextPollAllowedAtRef.current = Date.now() + pollBackoffMsRef.current;
      } finally {
        pollInFlightRef.current = false;
      }
    };
    const ms = pollMs();
    const t0 = window.setTimeout(() => void tick(), 500);
    const id = window.setInterval(() => void tick(), ms);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        window.setTimeout(() => void tick(), 400);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearTimeout(t0);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isLogin, isKanban, isPublicSticker, pathname, router]);

  const { chatVisible, correctionVisible, prostheticsVisible } = useMemo(() => {
    const chat = chatMessages
      .filter((r) => !dismissed.has(dismissKey("chat", r.id)))
      .slice(0, MAX_PER_COLUMN);
    const corr = corrections
      .filter((r) => !dismissed.has(dismissKey("correction", r.id)))
      .slice(0, MAX_PER_COLUMN);
    const pro = prostheticsRequests
      .filter((r) => !dismissed.has(dismissKey("prosthetics", r.id)))
      .slice(0, MAX_PER_COLUMN);
    return {
      chatVisible: chat,
      correctionVisible: corr,
      prostheticsVisible: pro,
    };
  }, [chatMessages, corrections, prostheticsRequests, dismissed]);

  const visibleCount =
    chatVisible.length + correctionVisible.length + prostheticsVisible.length;

  const hideAll = useCallback(() => {
    mergeDismissed((prev) => {
      const next = new Set(prev);
      for (const r of chatMessages) next.add(dismissKey("chat", r.id));
      for (const r of corrections) next.add(dismissKey("correction", r.id));
      for (const r of prostheticsRequests) next.add(dismissKey("prosthetics", r.id));
      return next;
    });
  }, [chatMessages, corrections, prostheticsRequests, mergeDismissed]);

  const dismissOne = useCallback(
    (kind: ToastKind, id: string) => {
      mergeDismissed((prev) => new Set(prev).add(dismissKey(kind, id)));
    },
    [mergeDismissed],
  );

  if (isLogin || isKanban || isPublicSticker || visibleCount === 0) {
    return null;
  }

  const columns: Array<{
    key: ToastKind;
    label: string;
    items: OrderToastRow[];
  }> = [
    { key: "chat" as const, label: "Чат", items: chatVisible },
    { key: "correction" as const, label: "Корректировки", items: correctionVisible },
    { key: "prosthetics" as const, label: "Заказ протетики", items: prostheticsVisible },
  ].filter(
    (c): c is { key: ToastKind; label: string; items: OrderToastRow[] } =>
      c.items.length > 0,
  );

  return (
    <div
      className="pointer-events-none fixed z-[95] bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] left-[max(1rem,env(safe-area-inset-left,0px))] flex flex-col items-end gap-2 sm:left-auto"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex max-w-full flex-col items-end gap-2">
        <div className="flex max-w-full flex-row items-start justify-end gap-2 overflow-x-auto pb-0.5">
          {columns.map((col) => (
            <div
              key={col.key}
              className="flex w-[min(11.5rem,calc((100vw-3rem)/3))] shrink-0 flex-col gap-1.5"
            >
              <p className="px-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {col.label}
              </p>
              <div className="flex flex-col gap-1.5">
                {col.items.map((r) => (
                  <ToastCard
                    key={`${col.key}-${r.id}`}
                    kind={col.key}
                    row={r}
                    onDismiss={() => dismissOne(col.key, r.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={hideAll}
          className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)]/95 px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] shadow hover:bg-[var(--surface-muted)]"
        >
          Скрыть все
        </button>
      </div>
    </div>
  );
}
