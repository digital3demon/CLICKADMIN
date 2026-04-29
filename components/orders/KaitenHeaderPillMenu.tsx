"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  kaitenColumnTitleFromBoard,
  kaitenStatusDisplay,
} from "@/lib/kaiten-column-title";
import { LAB_WORK_STATUS_PILL_STYLES } from "@/lib/lab-work-status";
import { useMenuDismiss } from "@/components/orders/LabStatusPillMenu";
import { kaitenClientPollIntervalMs } from "@/lib/kaiten-client-poll-ms";

function isKaitenRateLimitError(message: string | undefined, status: number): boolean {
  if (status === 429 || status === 502 || status === 503) return true;
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("много запросов") ||
    m.includes("rate_limit") ||
    m.includes("too many requests")
  );
}

function ChevronMini({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 opacity-75 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

type KaitenSnap = {
  columns?: Array<{ id: number; title?: string; name?: string }>;
  card?: Record<string, unknown>;
  error?: string;
};

function DemoKanbanHeaderPill({
  kaitenCardId,
  initialColumnTitle,
  demoKanbanColumn,
  demoCardTypeName,
}: {
  kaitenCardId: number | null;
  initialColumnTitle: string | null;
  demoKanbanColumn?: string | null;
  demoCardTypeName?: string | null;
}) {
  const hasCol = Boolean(demoKanbanColumn?.trim());
  const label = hasCol
    ? kaitenStatusDisplay({
        kaitenColumnTitle: initialColumnTitle,
        kaitenCardId,
        demoKanbanColumn: demoKanbanColumn ?? null,
        demoCardTypeName: demoCardTypeName ?? null,
      })
    : "Канбан CRM";
  return (
    <div
      className={`inline-flex min-h-9 max-w-[min(100vw-8rem,16rem)] items-center gap-1.5 rounded-full px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide shadow-sm sm:min-h-10 sm:px-3 sm:text-xs ${LAB_WORK_STATUS_PILL_STYLES.TO_SCAN}`}
      title="Колонка на доске «Работы» (канбан демо)"
      role="status"
    >
      <span className="truncate">{label}</span>
    </div>
  );
}

function KaitenHeaderPillMenuWithKaiten({
  orderId,
  kaitenCardId,
  initialColumnTitle,
}: {
  orderId: string;
  kaitenCardId: number | null;
  initialColumnTitle: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useMenuDismiss(open, close, wrapRef);

  const [columnTitle, setColumnTitle] = useState(() =>
    kaitenStatusDisplay({
      kaitenColumnTitle: initialColumnTitle,
      kaitenCardId,
    }),
  );
  const [snap, setSnap] = useState<KaitenSnap | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const openRef = useRef(open);
  const backoffUntilRef = useRef(0);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    setColumnTitle(
      kaitenStatusDisplay({
        kaitenColumnTitle: initialColumnTitle,
        kaitenCardId,
      }),
    );
  }, [initialColumnTitle, kaitenCardId]);

  const syncFromKaiten = useCallback(
    async (opts: { refresh: boolean; forMenu: boolean }) => {
      if (kaitenCardId == null) return;
      if (opts.refresh && Date.now() < backoffUntilRef.current) return;

      if (opts.forMenu) {
        setLoading(true);
        setLoadError(null);
      }
      try {
        const q = opts.refresh ? "?refresh=1" : "";
        const res = await fetch(`/api/orders/${orderId}/kaiten${q}`);
        const data = (await res.json()) as KaitenSnap;
        if (!res.ok) {
          if (opts.forMenu) {
            setLoadError(data.error ?? `Ошибка ${res.status}`);
            setSnap(null);
          }
          if (isKaitenRateLimitError(data.error, res.status)) {
            backoffUntilRef.current = Date.now() + 90_000;
          }
          return;
        }
        if (openRef.current) {
          setSnap(data);
        }
        const card = data.card;
        const cols = data.columns ?? [];
        if (card && typeof card === "object") {
          const t = kaitenColumnTitleFromBoard(
            card as Record<string, unknown>,
            cols,
          );
          if (t) setColumnTitle(t);
        }
      } catch {
        if (opts.forMenu) {
          setLoadError("Сеть недоступна");
          setSnap(null);
        }
      } finally {
        if (opts.forMenu) {
          setLoading(false);
        }
      }
    },
    [orderId, kaitenCardId],
  );

  useEffect(() => {
    if (!open || kaitenCardId == null) return;
    void syncFromKaiten({ refresh: true, forMenu: true });
  }, [open, kaitenCardId, syncFromKaiten]);

  useEffect(() => {
    if (kaitenCardId == null) return;
    const pollMs = kaitenClientPollIntervalMs();
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() < backoffUntilRef.current) return;
      void syncFromKaiten({ refresh: true, forMenu: false });
    };
    const t0 = window.setTimeout(() => {
      if (document.visibilityState === "visible") tick();
    }, 200);
    const id = window.setInterval(tick, pollMs);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(id);
    };
  }, [kaitenCardId, syncFromKaiten]);

  useEffect(() => {
    if (kaitenCardId == null) return;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      window.setTimeout(() => {
        void syncFromKaiten({ refresh: true, forMenu: false });
      }, 180);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [kaitenCardId, syncFromKaiten]);

  const pillClass = LAB_WORK_STATUS_PILL_STYLES.TO_SCAN;
  const disabled = kaitenCardId == null;

  const onPickColumn = async (columnId: number) => {
    if (kaitenCardId == null) return;
    setSavingId(columnId);
    setLoadError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/kaiten`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        card?: Record<string, unknown>;
      };
      if (!res.ok) {
        setLoadError(data.error ?? "Не удалось сменить колонку");
        return;
      }
      const card = data.card;
      const cols = snap?.columns ?? [];
      const fromList = cols.find((x) => x.id === columnId);
      const rawList = fromList?.title ?? fromList?.name;
      if (typeof rawList === "string" && rawList.trim()) {
        setColumnTitle(rawList.trim());
      } else if (card && typeof card === "object" && cols.length > 0) {
        const t = kaitenColumnTitleFromBoard(
          card as Record<string, unknown>,
          cols,
        );
        if (t) setColumnTitle(t);
      }
      setOpen(false);
      router.refresh();
    } catch {
      setLoadError("Сеть недоступна");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="relative z-[60]" ref={wrapRef}>
      <button
        type="button"
        disabled={disabled}
        className={`inline-flex min-h-9 max-w-[min(100vw-8rem,16rem)] items-center gap-1.5 rounded-full px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide shadow-sm sm:min-h-10 sm:px-3 sm:text-xs ${pillClass} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        aria-expanded={open}
        aria-haspopup={disabled ? undefined : "listbox"}
        aria-label={
          disabled
            ? "Колонка Kaiten: нет карточки"
            : `Колонка Kaiten: ${columnTitle}. Открыть список`
        }
        title={
          disabled
            ? "Карточка Kaiten не создана"
            : "Колонка на доске Kaiten (синхронизируется с API)"
        }
        onClick={() => {
          if (!disabled) setOpen((o) => !o);
        }}
      >
        <span className="truncate">{columnTitle}</span>
        {!disabled ? <ChevronMini open={open} /> : null}
      </button>
      {open && !disabled ? (
        <ul
          className="absolute left-0 top-full z-[200] mt-1 max-h-72 min-w-[12.5rem] overflow-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] py-1 shadow-xl"
          role="listbox"
          aria-label="Колонка Kaiten"
        >
          {loading ? (
            <li className="px-3 py-2 text-xs text-[var(--text-muted)]">
              Загрузка…
            </li>
          ) : loadError ? (
            <li className="px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {loadError}
            </li>
          ) : snap?.columns?.length ? (
            snap.columns.map((col) => {
              const title = String(col.title ?? col.name ?? "").trim() || "—";
              const currentId =
                snap.card && typeof snap.card.column_id === "number"
                  ? snap.card.column_id
                  : null;
              const selected = col.id === currentId;
              return (
                <li key={col.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    disabled={savingId != null}
                    aria-selected={selected}
                    className={`flex w-full items-center px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide hover:bg-[var(--surface-hover)] ${
                      selected
                        ? "bg-[var(--surface-hover)] text-[var(--app-text)]"
                        : "text-[var(--text-body)]"
                    }`}
                    onClick={() => void onPickColumn(col.id)}
                  >
                    {savingId === col.id ? "…" : title}
                  </button>
                </li>
              );
            })
          ) : (
            <li className="px-3 py-2 text-xs text-[var(--text-muted)]">
              Нет колонок
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}

/** Пилюля в шапке наряда: колонка Kaiten (синхронизация) или в демо — колонка встроенного канбана. */
export function KaitenHeaderPillMenu({
  orderId,
  kaitenCardId,
  initialColumnTitle,
  isDemoMode = false,
  demoKanbanColumn,
  demoCardTypeName,
}: {
  orderId: string;
  kaitenCardId: number | null;
  initialColumnTitle: string | null;
  isDemoMode?: boolean;
  demoKanbanColumn?: string | null;
  demoCardTypeName?: string | null;
}) {
  if (isDemoMode) {
    return (
      <DemoKanbanHeaderPill
        kaitenCardId={kaitenCardId}
        initialColumnTitle={initialColumnTitle}
        demoKanbanColumn={demoKanbanColumn}
        demoCardTypeName={demoCardTypeName}
      />
    );
  }
  return (
    <KaitenHeaderPillMenuWithKaiten
      orderId={orderId}
      kaitenCardId={kaitenCardId}
      initialColumnTitle={initialColumnTitle}
    />
  );
}
