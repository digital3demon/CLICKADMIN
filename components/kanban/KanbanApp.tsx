"use client";

import type { KaitenTrackLane } from "@prisma/client";
import type {
  KanbanAppState,
  KanbanBoard,
  KanbanCard,
} from "@/lib/kanban/types";
import { runKanbanAutomations } from "@/lib/kanban/automations";
import {
  applyKaitenApiCardTypesToMirrorBoards,
  buildKanbanDisplayView,
  countActiveKanbanFilters,
  createCard,
  findCard,
  findCardInAppState,
  generateId,
  getActiveBoard,
  isCardBlocked,
  KAITEN_MIRROR_DEFAULT_QUEUE_TITLE,
  KANBAN_KAITEN_CARD_TYPES_SYNCED_EVENT,
  loadKanbanState,
  mergeKaitenLinkedOrdersIntoAppState,
  normalizeDemoKanbanAppState,
  demoTrackLanes,
  pushActivity,
  saveKanbanState,
  isKanbanAggregateBoardId,
  KANBAN_BOARD_DISTRIBUTE_ID,
  KANBAN_BOARD_MY_CARDS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
  withActiveBoard,
} from "@/lib/kanban/model";
import type { KaitenLinkedOrderForKanban } from "@/lib/kanban/kaiten-linked-order";
import {
  applyAggregateCardDrag,
  type AggregateCardDragArgs,
} from "@/lib/kanban/aggregate-card-drag";
import { kanbanLinkedOrdersPullIntervalMs } from "@/lib/kanban-linked-pull-ms";
import { CRM_ORDER_ARCHIVED_EVENT } from "@/lib/crm-client-events";
import { userActivityDisplayLabel } from "@/lib/user-activity-display-label";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KanbanCrmUsersProvider } from "./kanban-crm-users-context";
import { BoardCanvas } from "./BoardCanvas";
import { KanbanCalendar } from "./KanbanCalendar";
import { KanbanCardModal } from "./KanbanCardModal";
import { KanbanFiltersButton } from "./KanbanFiltersButton";
import { KanbanListView } from "./KanbanListView";
import { IconBoard, IconListRows } from "./kanban-icons";

type ToastItem = { id: string; text: string; err?: boolean };

type SessionUserLike = {
  id?: string;
  displayName?: string;
  email?: string;
  mentionHandle?: string | null;
  avatarPresetId?: string | null;
};

function formatActivityActorLabel(u: SessionUserLike | null | undefined): string | undefined {
  if (!u) return undefined;
  const label = userActivityDisplayLabel(u);
  return label === "—" ? undefined : label;
}

export function KanbanApp({ isDemo = false }: { isDemo?: boolean }) {
  /** null до монтирования: иначе SSR и первый клиентский кадр расходятся (localStorage vs default) → #418 и ломается Sortable. */
  const [appState, setAppState] = useState<KanbanAppState | null>(null);
  const [cardModalId, setCardModalId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<{
    message: string;
    onOk: () => void;
  } | null>(null);
  const [moveCardId, setMoveCardId] = useState<string | null>(null);
  const [moveTargetBoardId, setMoveTargetBoardId] = useState("");
  const [activityActorLabel, setActivityActorLabel] = useState<string | undefined>(undefined);
  const [kanbanSessionUserId, setKanbanSessionUserId] = useState<string | null>(null);
  const prevModalCardRef = useRef<string | null>(null);
  const kaitenPullOnceRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname() ?? "/kanban";

  const pullKaitenLinkedOrders = useCallback(async () => {
    try {
      const r = await fetch("/api/kanban/linked-orders", { credentials: "include" });
      if (!r.ok) return;
      const j = (await r.json()) as { orders?: KaitenLinkedOrderForKanban[] };
      const rows = j.orders ?? [];
      setAppState((prev) => {
        if (!prev) return prev;
        const base = isDemo ? normalizeDemoKanbanAppState(prev) : prev;
        const merged = mergeKaitenLinkedOrdersIntoAppState(base, rows, { demo: isDemo });
        return isDemo ? normalizeDemoKanbanAppState(merged) : merged;
      });
    } catch {
      /* offline */
    }
  }, [isDemo]);

  useEffect(() => {
    const loaded = loadKanbanState(isDemo);
    const params = new URLSearchParams(window.location.search);
    const bid = params.get("board");
    let next = isDemo ? normalizeDemoKanbanAppState(loaded) : loaded;
    if (
      !isDemo &&
      bid &&
      (next.boards.some((b) => b.id === bid) || isKanbanAggregateBoardId(bid))
    ) {
      next = structuredClone(next);
      next.activeBoardId = bid;
    }
    const c = params.get("card");
    setAppState(next);
    if (c) setCardModalId(c);
  }, [isDemo]);

  useEffect(() => {
    if (!appState) return;
    saveKanbanState(appState, isDemo);
  }, [appState, isDemo]);

  useEffect(() => {
    if (!appState) {
      kaitenPullOnceRef.current = false;
      return;
    }
    if (!kaitenPullOnceRef.current) {
      kaitenPullOnceRef.current = true;
      void pullKaitenLinkedOrders();
    }
  }, [appState, pullKaitenLinkedOrders]);

  useEffect(() => {
    const pullIfVisible = () => {
      if (document.visibilityState === "visible") void pullKaitenLinkedOrders();
    };
    const iv = window.setInterval(
      () => void pullKaitenLinkedOrders(),
      kanbanLinkedOrdersPullIntervalMs(),
    );
    document.addEventListener("visibilitychange", pullIfVisible);
    window.addEventListener("focus", pullIfVisible);
    return () => {
      window.clearInterval(iv);
      document.removeEventListener("visibilitychange", pullIfVisible);
      window.removeEventListener("focus", pullIfVisible);
    };
  }, [pullKaitenLinkedOrders]);

  useEffect(() => {
    const onOrderArchived = () => {
      void pullKaitenLinkedOrders();
    };
    window.addEventListener(CRM_ORDER_ARCHIVED_EVENT, onOrderArchived);
    return () => {
      window.removeEventListener(CRM_ORDER_ARCHIVED_EVENT, onOrderArchived);
    };
  }, [pullKaitenLinkedOrders]);

  useEffect(() => {
    if (isDemo) return;
    const onKaitenTypesSynced = () => {
      void (async () => {
        try {
          const res = await fetch("/api/kaiten-card-types", {
            credentials: "include",
          });
          if (!res.ok) return;
          const rows = (await res.json()) as Array<{
            id: string;
            name: string;
            sortOrder: number;
          }>;
          if (!Array.isArray(rows) || rows.length === 0) return;
          setAppState((prev) => {
            if (!prev) return prev;
            return applyKaitenApiCardTypesToMirrorBoards(prev, rows);
          });
        } catch {
          /* ignore */
        }
      })();
    };
    window.addEventListener(KANBAN_KAITEN_CARD_TYPES_SYNCED_EVENT, onKaitenTypesSynced);
    return () => {
      window.removeEventListener(
        KANBAN_KAITEN_CARD_TYPES_SYNCED_EVENT,
        onKaitenTypesSynced,
      );
    };
  }, [isDemo]);

  const openKanbanCard = useCallback((cardId: string) => {
    setCardModalId(cardId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/auth/session", { credentials: "include" });
        const j = (await r.json()) as { user?: SessionUserLike | null };
        if (cancelled) return;
        setActivityActorLabel(formatActivityActorLabel(j.user));
        setKanbanSessionUserId(j.user?.id?.trim() ? j.user.id : null);
      } catch {
        if (!cancelled) {
          setActivityActorLabel(undefined);
          setKanbanSessionUserId(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const board = useMemo(
    () => (appState ? getActiveBoard(appState) : null),
    [appState],
  );
  const searchView = useMemo(
    () =>
      appState
        ? buildKanbanDisplayView(appState, { sessionUserId: kanbanSessionUserId })
        : null,
    [appState, kanbanSessionUserId],
  );
  const displayBoard = searchView?.displayBoard ?? null;
  const cardHomeBoardId = searchView?.cardHomeBoardId;

  const resolveCardHomeBoard = useCallback(
    (c: KanbanCard) => {
      if (!appState || !board) {
        return appState?.boards[0] ?? ({} as KanbanBoard);
      }
      const id = cardHomeBoardId?.get(c.id) ?? appState.activeBoardId;
      return appState.boards.find((b) => b.id === id) ?? board;
    },
    [appState, board, cardHomeBoardId],
  );

  const modalBoard = useMemo(() => {
    if (!appState || !board) return null;
    if (!cardModalId) return board;
    return findCardInAppState(appState, cardModalId)?.board ?? board;
  }, [cardModalId, appState, board]);

  const applyModalBoard = useCallback(
    (fn: (b: KanbanBoard) => void) => {
      if (!cardModalId) return;
      setAppState((s) => {
        if (!s) return s;
        const next = structuredClone(s);
        const loc = findCardInAppState(next, cardModalId);
        if (!loc) return s;
        const b = next.boards.find((x) => x.id === loc.board.id);
        if (!b) return s;
        fn(b);
        return next;
      });
    },
    [cardModalId],
  );

  useEffect(() => {
    if (!appState) return;
    if (!cardModalId) {
      if (prevModalCardRef.current) {
        router.replace(pathname, { scroll: false });
      }
      prevModalCardRef.current = null;
      return;
    }
    prevModalCardRef.current = cardModalId;
    const brd =
      findCardInAppState(appState, cardModalId)?.board ?? getActiveBoard(appState);
    router.replace(
      `${pathname}?card=${encodeURIComponent(cardModalId)}&board=${encodeURIComponent(brd.id)}`,
      { scroll: false },
    );
  }, [cardModalId, appState, pathname, router]);

  const showToast = useCallback((text: string, err?: boolean) => {
    const id = generateId("toast");
    setToasts((t) => [...t, { id, text, err }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const syncKaitenMirrorAfterKanbanMove = useCallback(
    async (args: {
      orderId: string;
      kaitenCardId: number;
      columnTitle?: string;
      kaitenTrackLane?: KaitenTrackLane;
      sortOrder: number;
    }) => {
      try {
        const body: Record<string, unknown> = { sortOrder: args.sortOrder };
        const col = args.columnTitle?.trim();
        if (col) body.columnTitle = col;
        if (args.kaitenTrackLane != null) {
          body.kaitenTrackLane = args.kaitenTrackLane;
        }
        const res = await fetch(`/api/orders/${args.orderId}/kaiten`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          showToast(
            data.error ??
              "Не удалось перенести карточку в Kaiten (проверьте название колонки на доске).",
            true,
          );
          void pullKaitenLinkedOrders();
          return;
        }
        void pullKaitenLinkedOrders();
      } catch {
        showToast("Сеть: колонка в Kaiten могла не обновиться", true);
        void pullKaitenLinkedOrders();
      }
    },
    [showToast, pullKaitenLinkedOrders],
  );

  const handleAggregateCardDrag = useCallback(
    (drag: AggregateCardDragArgs) => {
      let kaitenFollowUp:
        | {
            orderId: string;
            kaitenCardId: number;
            columnTitle?: string;
            kaitenTrackLane?: KaitenTrackLane;
            sortOrder: number;
          }
        | undefined;
      setAppState((s) => {
        if (!s || !isKanbanAggregateBoardId(s.activeBoardId)) return s;
        const view = buildKanbanDisplayView(s, { sessionUserId: kanbanSessionUserId });
        const next = structuredClone(s);
        const sid = kanbanSessionUserId?.trim();
        const activityUserId =
          sid ||
          getActiveBoard(s).users[0]?.id ||
          s.boards.find((b) => !isKanbanAggregateBoardId(b.id))?.users[0]?.id ||
          "";
        const res = applyAggregateCardDrag(
          next,
          view.displayBoard,
          view.cardHomeBoardId,
          drag,
          { activityUserId, activityActorLabel },
        );
        if (!res.ok) return s;
        if (res.kaiten) kaitenFollowUp = res.kaiten;
        return isDemo ? normalizeDemoKanbanAppState(next) : next;
      });
      if (!isDemo && kaitenFollowUp) {
        void syncKaitenMirrorAfterKanbanMove(kaitenFollowUp);
      }
    },
    [
      kanbanSessionUserId,
      activityActorLabel,
      isDemo,
      syncKaitenMirrorAfterKanbanMove,
    ],
  );

  const applyToBoard = useCallback((fn: (b: KanbanBoard) => void) => {
    setAppState((s) => {
      if (!s) return s;
      if (isKanbanAggregateBoardId(s.activeBoardId)) return s;
      return withActiveBoard(s, fn);
    });
  }, []);

  const patchApp = useCallback(
    (fn: (s: KanbanAppState) => void) => {
      setAppState((s) => {
        if (!s) return s;
        const next = structuredClone(s);
        fn(next);
        return next;
      });
    },
    [],
  );

  const aggregateView =
    Boolean(appState) && isKanbanAggregateBoardId(appState!.activeBoardId);
  const dndLocked = !!(
    appState &&
    (appState.search.trim() || countActiveKanbanFilters(appState.filters) > 0)
  );

  const addColumn = () => {
    applyToBoard((b) => {
      b.columns.push({
        id: generateId("col"),
        title: "Новая колонка",
        cards: [],
      });
    });
    showToast("Колонка добавлена");
  };

  const renameColumn = (columnId: string) => {
    if (!board) return;
    const col = board.columns.find((c) => c.id === columnId);
    if (!col) return;
    const n = window.prompt("Название колонки:", col.title);
    if (n === null) return;
    const t = n.trim();
    if (!t) return;
    applyToBoard((b) => {
      const c = b.columns.find((x) => x.id === columnId);
      if (c) c.title = t;
    });
  };

  const deleteColumn = (columnId: string) => {
    if (!board) return;
    const col = board.columns.find((c) => c.id === columnId);
    if (!col) return;
    setConfirm({
      message: `Удалить колонку «${col.title}» и все карточки?`,
      onOk: () => {
        applyToBoard((b) => {
          b.columns = b.columns.filter((c) => c.id !== columnId);
        });
        showToast("Колонка удалена");
        setConfirm(null);
      },
    });
  };

  const addCardToColumn = (columnId: string) => {
    let newId = "";
    applyToBoard((b) => {
      const col = b.columns.find((c) => c.id === columnId);
      if (!col) return;
      const uid = b.users[0]?.id;
      const card = createCard({
        title: "Новая карточка",
        createdByUserId: uid,
      });
      const act = activityActorLabel?.trim();
      card.activity = [
        {
          id: generateId("act"),
          type: "create",
          text: "Карточка создана",
          userId: uid ?? "",
          at: card.createdAt,
          ...(act ? { actorLabel: act } : {}),
        },
      ];
      col.cards.push(card);
      newId = card.id;
      runKanbanAutomations(
        b,
        {
          type: "card_created_in_column",
          cardId: card.id,
          columnId,
        },
        0,
        activityActorLabel,
      );
    });
    if (newId) setCardModalId(newId);
    showToast("Карточка создана");
  };

  const deleteCard = (cardId: string) => {
    if (!appState) return;
    const found = findCardInAppState(appState, cardId);
    if (!found) return;
    const linked = found.card.linkedOrderId;
    setConfirm({
      message: linked
        ? `Скрыть с доски карточку наряда (Kaiten)? Сам наряд не удаляется. Вернуть на доску — кнопка «Показать скрытые наряды» вверху.`
        : `Удалить карточку «${found.card.title}»?`,
      onOk: () => {
        setAppState((s) => {
          if (!s) return s;
          const next = structuredClone(s);
          const fc = findCardInAppState(next, cardId);
          if (!fc) return s;
          if (fc.card.linkedOrderId) {
            const hid = new Set(next.hiddenLinkedOrderIds || []);
            hid.add(fc.card.linkedOrderId);
            next.hiddenLinkedOrderIds = [...hid];
          }
          fc.col.cards = fc.col.cards.filter((c) => c.id !== cardId);
          return next;
        });
        setCardModalId(null);
        showToast("Карточка удалена");
        setConfirm(null);
      },
    });
  };

  const copyCardLink = (cardId: string) => {
    if (!appState) return;
    const loc = findCardInAppState(appState, cardId);
    const brd = loc?.board ?? getActiveBoard(appState);
    const url = `${window.location.origin}${pathname}?card=${encodeURIComponent(cardId)}&board=${encodeURIComponent(brd.id)}`;
    void navigator.clipboard.writeText(url);
    showToast("Ссылка на карточку скопирована");
  };

  const confirmMoveToBoard = () => {
    if (!appState || !moveCardId || !moveTargetBoardId) return;
    const titleSnapshot =
      findCardInAppState(appState, moveCardId)?.card.title ?? "карточка";
    setAppState((s) => {
      if (!s) return s;
      const next = structuredClone(s);
      const loc = findCardInAppState(next, moveCardId);
      if (!loc) return s;
      const src = next.boards.find((b) => b.id === loc.board.id);
      const tgt = next.boards.find((b) => b.id === moveTargetBoardId);
      if (!src || !tgt || src.id === tgt.id) return s;
      let extracted: KanbanCard | null = null;
      for (const col of src.columns) {
        const ix = col.cards.findIndex((c) => c.id === moveCardId);
        if (ix >= 0) {
          extracted = col.cards[ix];
          col.cards.splice(ix, 1);
          break;
        }
      }
      if (!extracted) return s;
      if (!tgt.columns.length) {
        tgt.columns.push({
          id: generateId("col"),
          title: KAITEN_MIRROR_DEFAULT_QUEUE_TITLE,
          cards: [],
        });
      }
      tgt.columns[0].cards.push(extracted);
      const now = new Date().toISOString();
      extracted.lastMovedAt = now;
      extracted.updatedAt = now;
      pushActivity(
        extracted,
        `Перенос на доску «${tgt.title}»`,
        tgt.users[0]?.id ?? "",
        tgt,
        activityActorLabel,
      );
      next.activeBoardId = tgt.id;
      return next;
    });
    const id = moveCardId;
    setMoveCardId(null);
    setMoveTargetBoardId("");
    setCardModalId(id);
    showToast(`Карточка «${titleSnapshot}» перенесена`);
  };

  const moveCardToNextStage = (cardId: string) => {
    if (!appState) return;
    const found = findCardInAppState(appState, cardId);
    if (!found) return;
    if (isCardBlocked(found.card)) {
      showToast("Снимите блокировку", true);
      return;
    }
    const home = found.board;
    const colIdx = home.columns.findIndex((c) => c.id === found.col.id);
    if (colIdx < 0 || colIdx >= home.columns.length - 1) {
      showToast("Это последняя колонка", true);
      return;
    }
    const nextTitle = home.columns[colIdx + 1].title;
    const nextCol = home.columns[colIdx + 1];
    const linkedSorts = nextCol.cards
      .filter((c) => c.linkedOrderId)
      .map((c) => c.kaitenCardSortOrder)
      .filter((x): x is number => x != null && Number.isFinite(x));
    const sortOrder = (linkedSorts.length ? Math.max(...linkedSorts) : 0) + 1;
    const cardSnapshot = found.card;
    setAppState((s) => {
      if (!s) return s;
      const next = structuredClone(s);
      const b = next.boards.find((x) => x.id === home.id);
      if (!b) return s;
      const f = findCard(b, cardId);
      if (!f) return s;
      const fromColId = f.col.id;
      const c = f.card;
      f.col.cards = f.col.cards.filter((x) => x.id !== cardId);
      const nextCol = b.columns[colIdx + 1];
      nextCol.cards.push(c);
      const now = new Date().toISOString();
      c.lastMovedAt = now;
      c.updatedAt = now;
      pushActivity(c, `Перемещена в «${nextCol.title}»`, b.users[0]?.id, b, activityActorLabel);
      runKanbanAutomations(
        b,
        {
          type: "card_moved_to_column",
          cardId,
          fromColumnId: fromColId,
          toColumnId: nextCol.id,
        },
        0,
        activityActorLabel,
      );
      return next;
    });
    if (
      !isDemo &&
      cardSnapshot.linkedOrderId &&
      typeof cardSnapshot.kaitenCardId === "number" &&
      Number.isFinite(cardSnapshot.kaitenCardId)
    ) {
      void syncKaitenMirrorAfterKanbanMove({
        orderId: cardSnapshot.linkedOrderId,
        kaitenCardId: cardSnapshot.kaitenCardId,
        columnTitle: nextTitle,
        sortOrder,
      });
    }
    showToast(`Этап: «${nextTitle}»`);
  };

  if (!appState || !board || !displayBoard) {
    return (
      <div className="flex h-[calc(100dvh)] min-h-0 w-full flex-col items-center justify-center overflow-hidden bg-[var(--kanban-workspace-bg)] text-[var(--kanban-text-muted)]">
        <span className="text-[0.95rem]">Загрузка доски…</span>
      </div>
    );
  }

  return (
    <KanbanCrmUsersProvider>
    <div className="flex h-[calc(100dvh)] min-h-0 w-full flex-col overflow-hidden bg-[var(--kanban-workspace-bg)] text-[var(--kanban-text)]">
      <header className="flex max-w-full flex-col gap-3 border-b border-[var(--kanban-border)] bg-[var(--kanban-rail-bg)] px-3 py-2.5 shadow-[0_1px_0_rgba(0,0,0,0.03)] sm:px-4 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-3 md:gap-y-2">
        <div className="flex min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2 md:flex-1">
          <label className="flex min-w-0 max-w-full max-md:ms-[max(3.25rem,calc(env(safe-area-inset-left,0px)+2.75rem+0.25rem))] md:ms-0 sm:items-center">
            <select
              className="min-h-[2.75rem] w-full min-w-0 max-w-full rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] px-2.5 py-2 text-[0.875rem] font-semibold text-[var(--kanban-text)] max-md:max-w-[min(100%,18rem)] sm:min-w-[10rem] sm:max-w-[min(100vw-10rem,32rem)] sm:shrink sm:grow"
              value={
                isKanbanAggregateBoardId(appState.activeBoardId)
                  ? (appState.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)?.id ??
                      appState.boards[0]?.id ??
                      "")
                  : appState.activeBoardId
              }
              aria-label="Выбор доски"
              onChange={(e) => {
                const id = e.target.value;
                patchApp((s) => {
                  s.activeBoardId = id;
                });
                const label = appState.boards.find((x) => x.id === id)?.title;
                if (label) showToast(`Доска: ${label}`);
              }}
            >
              {appState.boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </label>
          <Link
            href="/directory/kanban-boards#kanban-automations"
            className="min-w-0 shrink-0 text-[0.8125rem] leading-snug text-[var(--kanban-text-muted)] underline-offset-2 hover:text-[var(--kanban-text)] hover:underline"
          >
            Настройки, правила и резервная копия
          </Link>
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:w-auto md:shrink-0">
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Виртуальные доски"
          >
            <button
              type="button"
              className={`rounded-full border px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-wide transition-colors sm:px-3.5 sm:py-2 sm:text-[0.68rem] ${
                appState.activeBoardId === KANBAN_BOARD_MY_CARDS_ID
                  ? "border-[var(--kanban-text)] bg-black/[0.08] text-[var(--kanban-text)] dark:bg-white/[0.12]"
                  : "border-white/30 text-[var(--kanban-text-muted)] hover:border-white/45 hover:text-[var(--kanban-text)]"
              }`}
              onClick={() => {
                patchApp((s) => {
                  s.activeBoardId = KANBAN_BOARD_MY_CARDS_ID;
                });
                showToast("Доска: Мои");
              }}
            >
              Мои
            </button>
            <button
              type="button"
              className={`rounded-full border px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-wide transition-colors sm:px-3.5 sm:py-2 sm:text-[0.68rem] ${
                appState.activeBoardId === KANBAN_BOARD_DISTRIBUTE_ID
                  ? "border-[var(--kanban-text)] bg-black/[0.08] text-[var(--kanban-text)] dark:bg-white/[0.12]"
                  : "border-white/30 text-[var(--kanban-text-muted)] hover:border-white/45 hover:text-[var(--kanban-text)]"
              }`}
              onClick={() => {
                patchApp((s) => {
                  s.activeBoardId = KANBAN_BOARD_DISTRIBUTE_ID;
                });
                showToast("Доска: Распределить");
              }}
            >
              Распределить
            </button>
          </div>
          <div
            className="flex min-w-0 flex-1 flex-wrap items-stretch gap-2 sm:flex-initial sm:items-center"
            role="group"
            aria-label="Вид доски"
          >
          <button
            type="button"
            className={`inline-flex min-h-[2.75rem] flex-1 items-center justify-center gap-2 rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] px-2 py-2 text-[0.8125rem] hover:brightness-[0.98] dark:hover:brightness-110 sm:flex-initial sm:px-3 sm:text-[0.875rem] ${
              appState.viewMode === "board"
                ? "border-[var(--kanban-text)] bg-black/[0.05] font-semibold dark:bg-white/[0.08]"
                : ""
            }`}
            onClick={() => patchApp((s) => (s.viewMode = "board"))}
          >
            <IconBoard /> Доска
          </button>
          <button
            type="button"
            className={`min-h-[2.75rem] flex-1 rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] px-2 py-2 text-[0.8125rem] hover:brightness-[0.98] dark:hover:brightness-110 sm:flex-initial sm:px-3 sm:text-[0.875rem] ${
              appState.viewMode === "calendar"
                ? "border-[var(--kanban-text)] bg-black/[0.05] font-semibold dark:bg-white/[0.08]"
                : ""
            }`}
            onClick={() => patchApp((s) => (s.viewMode = "calendar"))}
          >
            Календарь
          </button>
          <button
            type="button"
            className={`inline-flex min-h-[2.75rem] flex-1 items-center justify-center gap-2 rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] px-2 py-2 text-[0.8125rem] hover:brightness-[0.98] dark:hover:brightness-110 sm:flex-initial sm:px-3 sm:text-[0.875rem] ${
              appState.viewMode === "list"
                ? "border-[var(--kanban-text)] bg-black/[0.05] font-semibold dark:bg-white/[0.08]"
                : ""
            }`}
            onClick={() => patchApp((s) => (s.viewMode = "list"))}
          >
            <IconListRows /> Список
          </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative z-20 flex max-w-full flex-wrap items-center gap-2.5 border-b border-[var(--kanban-border)] bg-[var(--kanban-rail-bg)] px-3 py-2.5 sm:px-4">
            <input
              type="search"
              placeholder="Поиск…"
              value={appState.search}
              onChange={(e) =>
                patchApp((s) => {
                  s.search = e.target.value;
                })
              }
              className="min-h-[2.75rem] min-w-0 w-full max-w-full flex-[1_1_12rem] rounded-lg border border-[var(--kanban-border)] bg-[var(--kanban-workspace-bg)] px-3 py-2 text-base text-[var(--kanban-text)] placeholder:text-[var(--kanban-text-muted)] dark:bg-[#262626] sm:max-w-[320px] sm:text-[0.875rem]"
            />
            <KanbanFiltersButton
              board={board}
              filters={appState.filters}
              filterTemplates={appState.filterTemplates ?? []}
              patchApp={patchApp}
              showToast={showToast}
            />
            {(appState.hiddenLinkedOrderIds?.length ?? 0) > 0 ? (
              <button
                type="button"
                className="rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] px-2 py-1.5 text-[0.75rem] font-medium text-[var(--kanban-text)] hover:brightness-[0.98] dark:hover:brightness-110"
                onClick={() =>
                  patchApp((s) => {
                    s.hiddenLinkedOrderIds = [];
                  })
                }
              >
                Показать скрытые наряды ({appState.hiddenLinkedOrderIds?.length})
              </button>
            ) : null}
            {dndLocked && (
              <span className="text-[0.75rem] text-amber-700 dark:text-amber-300">
                Перетаскивание карточек отключено при поиске/фильтрах
              </span>
            )}
          </div>

          {appState.viewMode === "board" ? (
            <BoardCanvas
              appState={appState}
              board={displayBoard}
              resolveCardHomeBoard={resolveCardHomeBoard}
              activityActorLabel={activityActorLabel}
              dndLocked={dndLocked}
              aggregateLayoutLocked={aggregateView}
              onAggregateCardDrag={aggregateView ? handleAggregateCardDrag : undefined}
              onPatchBoard={applyToBoard}
              onOpenCard={openKanbanCard}
              onAddColumn={addColumn}
              onRenameColumn={renameColumn}
              onDeleteColumn={deleteColumn}
              onAddCard={addCardToColumn}
              onCopyCardLink={copyCardLink}
              onRequestMoveCard={(cid) => {
                setMoveCardId(cid);
                setMoveTargetBoardId("");
              }}
              onRequestDeleteCard={deleteCard}
              allowMoveToOtherBoard={appState.boards.length > 1}
              onLinkedOrderMovedToKaitenMirror={
                isDemo ? undefined : syncKaitenMirrorAfterKanbanMove
              }
            />
          ) : appState.viewMode === "calendar" ? (
            <KanbanCalendar
              appState={appState}
              board={displayBoard}
              resolveCardHomeBoard={resolveCardHomeBoard}
              onOpenCard={openKanbanCard}
              onPrevMonth={() =>
                patchApp((s) => {
                  let { y, m } = s.calendarMonth;
                  m -= 1;
                  if (m < 0) {
                    m = 11;
                    y -= 1;
                  }
                  s.calendarMonth = { y, m };
                })
              }
              onNextMonth={() =>
                patchApp((s) => {
                  let { y, m } = s.calendarMonth;
                  m += 1;
                  if (m > 11) {
                    m = 0;
                    y += 1;
                  }
                  s.calendarMonth = { y, m };
                })
              }
            />
          ) : (
            <KanbanListView
              appState={appState}
              board={displayBoard}
              cardHomeBoardId={cardHomeBoardId}
              onOpenCard={openKanbanCard}
              onAdvanceCardColumn={moveCardToNextStage}
            />
          )}
      </div>

      <KanbanCardModal
        cardId={cardModalId}
        board={modalBoard ?? board}
        activityActorLabel={activityActorLabel}
        commentAuthorUserId={kanbanSessionUserId ?? undefined}
        onClose={() => setCardModalId(null)}
        onApply={applyModalBoard}
        toast={showToast}
        onMoveNextStage={(id) => {
          moveCardToNextStage(id);
          setCardModalId(id);
        }}
        onCopyCardLink={copyCardLink}
        trackLaneOptions={isDemo ? [...demoTrackLanes()] : undefined}
        trackLaneFieldLabel={isDemo ? "Доска" : undefined}
        isDemo={isDemo}
      />

      {moveCardId && appState.boards.length > 1 && (
        <div
          className="fixed inset-0 z-[215] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMoveCardId(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-[var(--app-text)] shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="m-0 text-base font-semibold">Перенос на другую доску</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Карточка будет добавлена в первый столбец выбранной доски.
            </p>
            <select
              className="mt-4 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--app-text)]"
              value={moveTargetBoardId}
              onChange={(e) => setMoveTargetBoardId(e.target.value)}
              autoFocus
            >
              <option value="">— Выберите доску —</option>
              {appState.boards
                .filter((b) => b.id !== appState.activeBoardId)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm hover:bg-[var(--surface-hover)]"
                onClick={() => setMoveCardId(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-40"
                disabled={!moveTargetBoardId}
                onClick={confirmMoveToBoard}
              >
                Перенести
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 p-4"
          role="alertdialog"
          aria-modal
        >
          <div className="w-full max-w-md rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-[var(--app-text)] shadow-xl">
            <p className="m-0 text-sm leading-relaxed">{confirm.message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm hover:bg-[var(--surface-hover)]"
                onClick={() => setConfirm(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
                onClick={confirm.onOk}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed bottom-4 right-4 z-[230] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-md px-4 py-2 text-sm text-white shadow-lg ${
              t.err ? "bg-red-800" : "bg-zinc-800"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
    </KanbanCrmUsersProvider>
  );
}
