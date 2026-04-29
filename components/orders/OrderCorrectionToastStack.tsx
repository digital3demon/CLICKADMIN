"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Сессия — sessionStorage; префиксы: correction:, prosthetics: */
const STORAGE_KEY = "dental-lab-app-toast-dismissed";
const LEGACY_CORRECTION_KEY = "dental-lab-crm-correction-toast-dismissed";

type OrderToastRow = {
  id: string;
  text: string;
  orderId: string;
  orderNumber: string;
  createdAt: string;
};

const correctionCardShell =
  "flex gap-2 rounded-lg border border-amber-200/90 bg-amber-50/95 pl-3 pr-1 py-2 text-sm shadow-lg backdrop-blur-sm dark:border-amber-800/60 dark:bg-amber-950/90";

const prostheticsCardShell =
  "flex gap-2 rounded-lg border border-sky-200/90 bg-sky-50/95 pl-3 pr-1 py-2 text-sm shadow-lg backdrop-blur-sm dark:border-sky-800/60 dark:bg-sky-950/90";

function readDismissedPrefixed(): Set<string> {
  if (typeof sessionStorage === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const a = JSON.parse(raw) as unknown;
      return new Set(
        Array.isArray(a) ? a.filter((x): x is string => typeof x === "string") : [],
      );
    }
    const legacy = sessionStorage.getItem(LEGACY_CORRECTION_KEY);
    const arr = legacy ? (JSON.parse(legacy) as unknown) : [];
    const ids = Array.isArray(arr)
      ? arr.filter((x): x is string => typeof x === "string")
      : [];
    return new Set(ids.map((id) => `correction:${id}`));
  } catch {
    return new Set();
  }
}

function writeDismissedPrefixed(ids: Set<string>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
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

const MAX_VISIBLE = 8;

export function OrderCorrectionToastStack() {
  const pathname = usePathname() ?? "";
  const isLogin = pathname === "/login" || pathname.startsWith("/login/");
  const isKanban = pathname === "/kanban" || pathname.startsWith("/kanban/");
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [corrections, setCorrections] = useState<OrderToastRow[]>([]);
  const [prostheticsRequests, setProstheticsRequests] = useState<OrderToastRow[]>(
    [],
  );
  const lastFpRef = useRef<string>("");

  const mergeDismissed = useCallback((update: (prev: Set<string>) => Set<string>) => {
    setDismissed((prev) => {
      const next = update(prev);
      writeDismissedPrefixed(next);
      return next;
    });
  }, []);

  useEffect(() => {
    setDismissed(readDismissedPrefixed());
  }, []);

  useEffect(() => {
    if (isLogin || isKanban) {
      setCorrections([]);
      setProstheticsRequests([]);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        const [resCorr, resPro] = await Promise.all([
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

        let corrList: OrderToastRow[] = [];
        if (resCorr.status === 403 || resCorr.status === 401) {
          corrList = [];
        } else if (resCorr.ok) {
          const j = (await resCorr.json().catch(() => ({}))) as {
            corrections?: OrderToastRow[];
          };
          corrList = Array.isArray(j.corrections) ? j.corrections : [];
        }

        let proList: OrderToastRow[] = [];
        if (resPro.status === 403 || resPro.status === 401) {
          proList = [];
        } else if (resPro.ok) {
          const j = (await resPro.json().catch(() => ({}))) as {
            requests?: OrderToastRow[];
          };
          proList = Array.isArray(j.requests) ? j.requests : [];
        }

        const fp = `c:${corrList.map((x) => x.id).join(",")}|p:${proList.map((x) => x.id).join(",")}`;
        if (fp !== lastFpRef.current) {
          lastFpRef.current = fp;
          setCorrections(corrList);
          setProstheticsRequests(proList);
        }
      } catch {
        /* ignore */
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
  }, [isLogin, isKanban]);

  const { correctionVisible, prostheticsVisible } = useMemo(() => {
    const corr = corrections
      .filter((r) => !dismissed.has(`correction:${r.id}`))
      .slice(0, 5);
    const rest = Math.max(0, MAX_VISIBLE - corr.length);
    const pro = prostheticsRequests
      .filter((r) => !dismissed.has(`prosthetics:${r.id}`))
      .slice(0, rest);
    return {
      correctionVisible: corr,
      prostheticsVisible: pro,
    };
  }, [corrections, prostheticsRequests, dismissed]);

  const visibleCount = correctionVisible.length + prostheticsVisible.length;

  const hideAll = useCallback(() => {
    if (corrections.length === 0 && prostheticsRequests.length === 0) return;
    mergeDismissed((prev) => {
      const next = new Set(prev);
      for (const r of corrections) {
        next.add(`correction:${r.id}`);
      }
      for (const r of prostheticsRequests) {
        next.add(`prosthetics:${r.id}`);
      }
      return next;
    });
  }, [corrections, prostheticsRequests, mergeDismissed]);

  const dismissOne = useCallback(
    (prefix: "correction" | "prosthetics", id: string) => {
      mergeDismissed((prev) => new Set(prev).add(`${prefix}:${id}`));
    },
    [mergeDismissed],
  );

  if (isLogin || isKanban || visibleCount === 0) return null;

  return (
    <div
      className="pointer-events-none fixed z-[95] flex w-[min(22rem,calc(100vw-2rem))] flex-col items-stretch gap-2 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex flex-col gap-2">
        {correctionVisible.map((r) => (
          <div key={`c-${r.id}`} className={correctionCardShell}>
            <Link
              href={`/orders/${r.orderId}`}
              onClick={() => dismissOne("correction", r.id)}
              className="min-w-0 flex-1 text-left leading-snug text-amber-950 hover:underline dark:text-amber-50"
            >
              <span className="block text-[0.65rem] font-semibold uppercase tracking-wide text-amber-900/90 dark:text-amber-200/90">
                Корректировка
              </span>
              <span className="mt-0.5 block text-[var(--text-body)]">
                по наряду{" "}
                <span className="font-mono font-semibold tabular-nums">
                  {r.orderNumber}
                </span>
                : «{snippet(r.text)}»
              </span>
            </Link>
            <button
              type="button"
              className="shrink-0 self-start rounded px-1.5 py-0.5 text-lg leading-none text-amber-900/70 hover:bg-amber-200/80 dark:text-amber-100/80 dark:hover:bg-amber-900/50"
              aria-label="Скрыть уведомление"
              title="Скрыть"
              onClick={() => dismissOne("correction", r.id)}
            >
              ×
            </button>
          </div>
        ))}
        {prostheticsVisible.map((r) => (
          <div key={`p-${r.id}`} className={prostheticsCardShell}>
            <Link
              href={`/orders/${r.orderId}`}
              onClick={() => dismissOne("prosthetics", r.id)}
              className="min-w-0 flex-1 text-left leading-snug text-sky-950 hover:underline dark:text-sky-50"
            >
              <span className="block text-[0.65rem] font-semibold uppercase tracking-wide text-sky-800/90 dark:text-sky-200/90">
                Протетика
              </span>
              <span className="mt-0.5 block text-[var(--text-body)]">
                по наряду{" "}
                <span className="font-mono font-semibold tabular-nums">
                  {r.orderNumber}
                </span>
                : «{snippet(r.text)}»
              </span>
            </Link>
            <button
              type="button"
              className="shrink-0 self-start rounded px-1.5 py-0.5 text-lg leading-none text-sky-900/70 hover:bg-sky-200/80 dark:text-sky-100/80 dark:hover:bg-sky-900/50"
              aria-label="Скрыть уведомление"
              title="Скрыть"
              onClick={() => dismissOne("prosthetics", r.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={hideAll}
        className="pointer-events-auto self-end rounded-md border border-[var(--card-border)] bg-[var(--card-bg)]/95 px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] shadow hover:bg-[var(--surface-muted)]"
      >
        Скрыть все
      </button>
    </div>
  );
}
