"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readClientState, writeClientState } from "@/lib/client-state-client";
import { orderChatToastTitle } from "@/lib/order-chat-trigger-author";
import { orderPathById } from "@/lib/order-public-ref";
import { isPublicStickerHubPath } from "@/lib/sticker-public-path";

const STORAGE_KEY = "orderToastDismissedV1";
const STORAGE_KEY_COLLAPSED = "orderToastStackCollapsedV1";

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

function writeStackCollapsed(collapsed: boolean) {
  void writeClientState("user", STORAGE_KEY_COLLAPSED, collapsed);
}

function writeDismissedPrefixed(ids: Set<string>) {
  void writeClientState("user", STORAGE_KEY, [...ids]);
}

function dismissKey(kind: ToastKind, id: string): string {
  return `${kind}:${id}`;
}

function toastRowKeys(
  chatList: OrderToastRow[],
  corrList: OrderToastRow[],
  proList: OrderToastRow[],
): Set<string> {
  const keys = new Set<string>();
  for (const r of chatList) keys.add(dismissKey("chat", r.id));
  for (const r of corrList) keys.add(dismissKey("correction", r.id));
  for (const r of proList) keys.add(dismissKey("prosthetics", r.id));
  return keys;
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
      : 2000;
  if (!Number.isFinite(n)) return 2000;
  return Math.min(Math.max(n, 1500), 30_000);
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
  const [stackCollapsed, setStackCollapsed] = useState(false);
  const [chatMessages, setChatMessages] = useState<OrderToastRow[]>([]);
  const [corrections, setCorrections] = useState<OrderToastRow[]>([]);
  const [prostheticsRequests, setProstheticsRequests] = useState<OrderToastRow[]>(
    [],
  );
  const lastFpRef = useRef<string>("");
  const prevToastKeysRef = useRef<Set<string>>(new Set());
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
      const [dismissedRaw, collapsedRaw] = await Promise.all([
        readClientState<unknown>("user", STORAGE_KEY),
        readClientState<unknown>("user", STORAGE_KEY_COLLAPSED),
      ]);
      if (cancelled) return;
      if (Array.isArray(dismissedRaw)) {
        setDismissed(
          new Set(dismissedRaw.filter((x): x is string => typeof x === "string")),
        );
      }
      if (collapsedRaw === true) {
        setStackCollapsed(true);
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
        const res = await fetch("/api/order-notifications/toasts", {
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled) return;
        const retryMs =
          res.status === 429
            ? parseRetryAfterMs(res.headers.get("Retry-After"))
            : 0;

        const j = (await res.json().catch(() => ({}))) as {
          messages?: OrderToastRow[];
          corrections?: OrderToastRow[];
          requests?: OrderToastRow[];
        };

        if (res.status === 401 || res.status === 403) {
          if (retryMs > 0) {
            nextPollAllowedAtRef.current = Date.now() + Math.max(1000, retryMs);
          }
          return;
        }

        const chatList = Array.isArray(j.messages) ? j.messages : [];
        const corrList = Array.isArray(j.corrections) ? j.corrections : [];
        const proList = Array.isArray(j.requests) ? j.requests : [];

        const fp = `h:${chatList.map((x) => x.id).join(",")}|c:${corrList.map((x) => x.id).join(",")}|p:${proList.map((x) => x.id).join(",")}`;
        if (fp !== lastFpRef.current) {
          const hadPrevious = lastFpRef.current.length > 0;
          const nextKeys = toastRowKeys(chatList, corrList, proList);
          let hasNewToast = false;
          if (hadPrevious) {
            for (const key of nextKeys) {
              if (!prevToastKeysRef.current.has(key)) {
                hasNewToast = true;
                break;
              }
            }
          }
          lastFpRef.current = fp;
          prevToastKeysRef.current = nextKeys;
          setChatMessages(chatList);
          setCorrections(corrList);
          setProstheticsRequests(proList);
          if (hasNewToast) {
            setStackCollapsed(false);
            writeStackCollapsed(false);
          }
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
        nextPollAllowedAtRef.current =
          retryMs > 0 ? Date.now() + Math.max(1000, retryMs) : 0;
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
    void tick();
    const id = window.setInterval(() => void tick(), ms);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void tick();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isLogin, isKanban, isPublicSticker, pathname, router]);

  const pending = useMemo(() => {
    const chat = chatMessages.filter(
      (r) => !dismissed.has(dismissKey("chat", r.id)),
    );
    const corr = corrections.filter(
      (r) => !dismissed.has(dismissKey("correction", r.id)),
    );
    const pro = prostheticsRequests.filter(
      (r) => !dismissed.has(dismissKey("prosthetics", r.id)),
    );
    return { chat, corr, pro };
  }, [chatMessages, corrections, prostheticsRequests, dismissed]);

  const pendingCount =
    pending.chat.length + pending.corr.length + pending.pro.length;

  const { chatVisible, correctionVisible, prostheticsVisible } = useMemo(() => {
    return {
      chatVisible: pending.chat.slice(0, MAX_PER_COLUMN),
      correctionVisible: pending.corr.slice(0, MAX_PER_COLUMN),
      prostheticsVisible: pending.pro.slice(0, MAX_PER_COLUMN),
    };
  }, [pending]);

  const hideAll = useCallback(() => {
    setStackCollapsed(true);
    writeStackCollapsed(true);
  }, []);

  const showAll = useCallback(() => {
    setStackCollapsed(false);
    writeStackCollapsed(false);
  }, []);

  const dismissOne = useCallback(
    (kind: ToastKind, id: string) => {
      mergeDismissed((prev) => new Set(prev).add(dismissKey(kind, id)));
    },
    [mergeDismissed],
  );

  useEffect(() => {
    if (pendingCount === 0 && stackCollapsed) {
      setStackCollapsed(false);
      writeStackCollapsed(false);
    }
  }, [pendingCount, stackCollapsed]);

  if (isLogin || isKanban || isPublicSticker) {
    return null;
  }

  if (stackCollapsed && pendingCount > 0) {
    return (
      <div
        className="pointer-events-none fixed z-[120] bottom-[max(3.25rem,calc(1rem+env(safe-area-inset-bottom,0px)))] right-[max(1rem,env(safe-area-inset-right,0px))] flex flex-col items-end"
        aria-live="polite"
      >
        <button
          type="button"
          onClick={showAll}
          className="pointer-events-auto rounded-md border border-[var(--card-border)] bg-[var(--card-bg)]/95 px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] shadow hover:bg-[var(--surface-muted)]"
        >
          Показать уведомления ({pendingCount})
        </button>
      </div>
    );
  }

  if (pendingCount === 0) {
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
      className="pointer-events-none fixed z-[120] bottom-[max(3.25rem,calc(1rem+env(safe-area-inset-bottom,0px)))] right-[max(1rem,env(safe-area-inset-right,0px))] left-[max(1rem,env(safe-area-inset-left,0px))] flex flex-col items-end gap-2 sm:left-auto"
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
