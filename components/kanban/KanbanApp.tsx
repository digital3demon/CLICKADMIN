"use client";

import type { KaitenTrackLane, UserRole } from "@prisma/client";
import type {
  KanbanAppState,
  KanbanArchivedCard,
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  KanbanStoppedCard,
} from "@/lib/kanban/types";
import { runKanbanAutomations } from "@/lib/kanban/automations";
import {
  canUserAccessBoard,
  applyKaitenApiCardTypesToMirrorBoards,
  applyBoardArchivePolicies,
  archiveCardByIdOnBoard,
  buildKanbanDisplayView,
  countActiveKanbanFilters,
  createCard,
  findCard,
  findCardInAppState,
  generateId,
  getActiveBoard,
  getCardTypeAccent,
  KAITEN_MIRROR_DEFAULT_QUEUE_TITLE,
  KANBAN_KAITEN_CARD_TYPES_SYNCED_EVENT,
  loadKanbanState,
  mergeKaitenLinkedOrdersIntoAppState,
  normalizeDemoKanbanAppState,
  demoTrackLanes,
  pushActivity,
  restoreArchivedCardOnBoard,
  restoreStoppedCardOnBoard,
  saveKanbanState,
  stopCardByIdOnBoard,
  isKanbanAggregateBoardId,
  KANBAN_BOARD_DISTRIBUTE_ID,
  KANBAN_BOARD_MY_CARDS_ID,
  KANBAN_BOARD_ORTHODONTICS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
  kanbanStateForPersistence,
  mergeKanbanStatePreservingLocalBoards,
  withActiveBoard,
} from "@/lib/kanban/model";
import {
  autoArchiveReadyProductionChildren,
  expandProductionChecklistFromArchives,
  isProductionChildDone,
  markProductionChildReadyState,
  moveParentToAssemblyIfReady,
  normalizeProductionSettings,
  parentCanMoveToAssembly,
  syncProductionChecklistSnapshotsAcrossBoards,
  syncProductionChildrenForParent,
  warnIfChildMovedToDoneWithIncompleteChecklist,
} from "@/lib/kanban/production";
import type { KaitenLinkedOrderForKanban } from "@/lib/kanban/kaiten-linked-order";
import {
  applyStandaloneRowsFromServer,
  extractStandaloneRowsForSync,
  type StandaloneRow,
} from "@/lib/kanban/standalone-board-sync";
import {
  applyAggregateCardDrag,
  type AggregateCardDragArgs,
} from "@/lib/kanban/aggregate-card-drag";
import { kanbanLinkedOrdersPullIntervalMs } from "@/lib/kanban-linked-pull-ms";
import { kanbanCardAbsoluteUrl } from "@/lib/kanban-card-browser-url";
import { kanbanCardIdFromSearchParams } from "@/lib/kanban-order-card-url";
import { canUserManageKanbanBlockForCard } from "@/lib/kanban-block-permissions";
import { postKanbanTelegramNotify } from "@/lib/kanban-crm-telegram-notify-client";
import { CRM_ORDER_ARCHIVED_EVENT } from "@/lib/crm-client-events";
import { telegramHtmlLink } from "@/lib/telegram-html";
import { userActivityDisplayLabel } from "@/lib/user-activity-display-label";
import { readClientState, writeClientState } from "@/lib/client-state-client";
import {
  applyKanbanArchiveSettings,
  extractKanbanArchiveSettings,
  KANBAN_ARCHIVE_SETTINGS_KEY,
} from "@/lib/kanban/archive-settings-sync";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KanbanCrmUsersProvider } from "./kanban-crm-users-context";
import { TOAST_AUTO_HIDE_MS } from "@/components/ui/toast-store";
import { BoardCanvas } from "./BoardCanvas";
import { KanbanFiltersButton } from "./KanbanFiltersButton";
import { KanbanViewModePicker } from "./KanbanViewModePicker";

const KanbanCalendar = dynamic(
  () => import("./KanbanCalendar").then((m) => m.KanbanCalendar),
  { ssr: false, loading: () => null },
);
const KanbanListView = dynamic(
  () => import("./KanbanListView").then((m) => m.KanbanListView),
  { ssr: false, loading: () => null },
);
const KanbanCardModal = dynamic(
  () => import("./KanbanCardModal").then((m) => m.KanbanCardModal),
  { ssr: false, loading: () => null },
);

type ToastItem = { id: string; text: string; err?: boolean };

type SessionUserLike = {
  id?: string;
  displayName?: string;
  email?: string;
  role?: UserRole;
  mentionHandle?: string | null;
  avatarPresetId?: string | null;
  moduleAccess?: Partial<
    Record<
      | "KANBAN_EDIT_TITLE"
      | "KANBAN_EDIT_DUE_DATE"
      | "KANBAN_EDIT_TRACK"
      | "KANBAN_MANAGE_ASSIGNEES"
      | "KANBAN_MANAGE_PARTICIPANTS"
      | "KANBAN_MOVE_TO_OTHER_BOARD"
      | "KANBAN_MANAGE_CHECKLIST"
      | "KANBAN_MANAGE_TIMER",
      boolean
    >
  >;
};

function formatActivityActorLabel(u: SessionUserLike | null | undefined): string | undefined {
  if (!u) return undefined;
  const label = userActivityDisplayLabel(u);
  return label === "—" ? undefined : label;
}

function columnMatchesStage(columnTitle: string, stageTitle: string): boolean {
  const col = String(columnTitle || "").trim().toLowerCase();
  const stage = String(stageTitle || "").trim().toLowerCase();
  if (!col || !stage) return false;
  return col === stage || col.endsWith(`· ${stage}`);
}

const PRODUCTION_BOARD_ID = "kanban-board-production";

function normalizeBoardTitle(title: string | null | undefined): string {
  return String(title || "").trim().toLowerCase();
}

function kaitenLaneForKanbanBoardId(boardId: string): KaitenTrackLane | undefined {
  if (boardId === KANBAN_BOARD_ORTHOPEDICS_ID) return "ORTHOPEDICS";
  if (boardId === KANBAN_BOARD_ORTHODONTICS_ID) return "ORTHODONTICS";
  return undefined;
}

function KanbanStopView({
  board,
  stoppedCards,
  onOpenCard,
  onRestore,
}: {
  board: KanbanBoard;
  stoppedCards: KanbanStoppedCard[];
  onOpenCard: (cardId: string) => void;
  onRestore: (stoppedId: string) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto bg-[var(--kanban-workspace-bg)] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-wide text-[var(--kanban-text)]">
            СТОП
          </h2>
          <p className="text-sm text-[var(--kanban-text-muted)]">
            Карточки, временно убранные из дорожек: {stoppedCards.length}
          </p>
        </div>
      </div>
      {stoppedCards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] p-6 text-center text-sm text-[var(--kanban-text-muted)]">
          Перетащите карточку на кнопку СТОП или отправьте её через меню карточки.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-2">
          {stoppedCards.map((row) => {
            return (
              <StoppedKanbanCard
                key={row.id}
                board={board}
                row={row}
                onOpenCard={onOpenCard}
                onRestore={onRestore}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function StoppedKanbanCard({
  board,
  row,
  onOpenCard,
  onRestore,
}: {
  board: KanbanBoard;
  row: KanbanStoppedCard;
  onOpenCard: (cardId: string) => void;
  onRestore: (stoppedId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const accent = getCardTypeAccent(board, row.card.cardTypeId);
  const typeName = board.cardTypes.find((t) => t.id === row.card.cardTypeId)?.name ?? "";
  return (
    <article className="relative rounded-xl border border-[var(--kanban-border)] bg-[var(--kanban-card-bg)] p-3 pr-10 shadow-[var(--kanban-shadow)]">
      <div ref={menuRef} className="absolute right-2 top-2">
        <button
          type="button"
          className="rounded-md p-1 text-[var(--kanban-text-muted)] hover:bg-black/10 hover:text-[var(--kanban-text)] dark:hover:bg-white/10"
          aria-label="Меню карточки в стопе"
          title="Действия"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
        >
          ⋮
        </button>
        {menuOpen ? (
          <div className="absolute right-0 z-30 mt-1 w-48 rounded-lg border border-[var(--kanban-border)] bg-[var(--kanban-card-bg)] py-1 text-sm text-[var(--kanban-text)] shadow-lg">
            <button
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-black/[0.06] dark:hover:bg-white/[0.06]"
              onClick={(e) => {
                e.stopPropagation();
                onRestore(row.id);
                setMenuOpen(false);
              }}
            >
              Вернуть из стопа
            </button>
          </div>
        ) : null}
      </div>
      {typeName ? (
        <div
          className="mb-2 rounded-md px-2 py-1 text-[0.68rem] font-bold uppercase tracking-wide"
          style={{
            color: `color-mix(in srgb, ${accent} 75%, var(--kanban-text))`,
            background: `color-mix(in srgb, ${accent} 12%, var(--kanban-card-bg))`,
          }}
        >
          {typeName}
        </div>
      ) : null}
      <button
        type="button"
        className="block w-full text-left text-sm font-semibold leading-snug text-[var(--kanban-text)] hover:underline"
        onClick={() => onOpenCard(row.card.id)}
      >
        {row.card.title}
      </button>
      <div className="mt-2 text-[0.72rem] leading-snug text-[var(--kanban-text-muted)]">
        Было: {row.sourceColumnTitle || "колонка"} ·{" "}
        {new Date(row.stoppedAt).toLocaleDateString("ru-RU")}
      </div>
    </article>
  );
}

export function KanbanApp({ isDemo = false }: { isDemo?: boolean }) {
  /** null до монтирования: иначе SSR и первый клиентский кадр расходятся (server state vs default) → #418 и ломается Sortable. */
  const [appState, setAppState] = useState<KanbanAppState | null>(null);
  const [kanbanStateReady, setKanbanStateReady] = useState(isDemo);
  const appStateRef = useRef<KanbanAppState | null>(null);
  appStateRef.current = appState;
  const [cardModalId, setCardModalId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<{
    message: string;
    onOk: () => void;
  } | null>(null);
  const [moveCardId, setMoveCardId] = useState<string | null>(null);
  const [moveTargetBoardId, setMoveTargetBoardId] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [activityActorLabel, setActivityActorLabel] = useState<string | undefined>(undefined);
  const [kanbanSessionUserId, setKanbanSessionUserId] = useState<string | null>(null);
  const [kanbanSessionRole, setKanbanSessionRole] = useState<UserRole | null>(null);
  const [kanbanCardPerms, setKanbanCardPerms] = useState({
    editTitle: true,
    editDueDate: true,
    editTrack: true,
    manageAssignees: true,
    manageParticipants: true,
    moveToOtherBoard: true,
    manageKanbanChecklist: true,
    manageKanbanTimer: true,
  });
  const prevModalCardRef = useRef<string | null>(null);
  const kaitenPullOnceRef = useRef(false);
  const standalonePushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const standalonePushInFlightRef = useRef(false);
  const mirrorSyncInFlightRef = useRef(false);
  const mirrorSyncQueuedRef = useRef(false);
  const kanbanStateSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const childChecklistExpandInFlightRef = useRef<Set<string>>(new Set());
  const archiveSettingsReadyRef = useRef(false);
  const lastArchiveSettingsSigRef = useRef("");
  /** Перед первым GET отдаём локальные карточки без наряда на сервер — иначе пустой ответ затрёт их. */
  const standalonePrimedRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname() ?? "/kanban";

  /** Наряды с сервера + локальные карточки без наряда (общие для тенанта). */
  const syncKanbanMirrorFromApi = useCallback(async () => {
    if (mirrorSyncInFlightRef.current) {
      mirrorSyncQueuedRef.current = true;
      return;
    }
    mirrorSyncInFlightRef.current = true;
    try {
      if (isDemo) {
        const r = await fetch("/api/kanban/linked-orders", { credentials: "include" });
        if (!r.ok) return;
        const j = (await r.json()) as { orders?: KaitenLinkedOrderForKanban[] };
        const rows = j.orders ?? [];
        setAppState((prev) => {
          if (!prev) return prev;
          const base = normalizeDemoKanbanAppState(prev);
          const merged = mergeKaitenLinkedOrdersIntoAppState(base, rows, { demo: true });
          return normalizeDemoKanbanAppState(merged);
        });
        return;
      }
      const cur = appStateRef.current;
      if (cur && !standalonePrimedRef.current) {
        standalonePrimedRef.current = true;
        const primeRows = extractStandaloneRowsForSync(cur);
        try {
          await fetch("/api/kanban/standalone-cards", {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows: primeRows }),
          });
        } catch {
          /* сеть — продолжаем GET */
        }
      }
      const [rLinked, rStandalone] = await Promise.all([
        fetch("/api/kanban/linked-orders", { credentials: "include" }),
        fetch("/api/kanban/standalone-cards", { credentials: "include" }),
      ]);
      if (!rLinked.ok) return;
      const jL = (await rLinked.json()) as { orders?: KaitenLinkedOrderForKanban[] };
      const linkedRows = jL.orders ?? [];
      let standaloneRows: StandaloneRow[] = [];
      if (rStandalone.ok) {
        const jS = (await rStandalone.json()) as { rows?: StandaloneRow[] };
        standaloneRows = Array.isArray(jS.rows) ? jS.rows : [];
      }
      setAppState((prev) => {
        if (!prev) return prev;
        let next = mergeKaitenLinkedOrdersIntoAppState(prev, linkedRows, {
          demo: false,
        });
        next = applyStandaloneRowsFromServer(next, standaloneRows);
        return next;
      });
    } catch {
      /* offline */
    } finally {
      mirrorSyncInFlightRef.current = false;
      if (mirrorSyncQueuedRef.current) {
        mirrorSyncQueuedRef.current = false;
        window.setTimeout(() => {
          void syncKanbanMirrorFromApi();
        }, 120);
      }
    }
  }, [isDemo]);

  useEffect(() => {
    if (!appState || isDemo || !kanbanStateReady) return;
    if (standalonePushTimerRef.current) clearTimeout(standalonePushTimerRef.current);
    standalonePushTimerRef.current = setTimeout(() => {
      standalonePushTimerRef.current = null;
      const cur = appStateRef.current;
      if (!cur || standalonePushInFlightRef.current) return;
      standalonePushInFlightRef.current = true;
      const rows = extractStandaloneRowsForSync(cur);
      void fetch("/api/kanban/standalone-cards", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })
        .catch(() => {})
        .finally(() => {
          standalonePushInFlightRef.current = false;
        });
    }, 2800);
    return () => {
      if (standalonePushTimerRef.current) clearTimeout(standalonePushTimerRef.current);
    };
  }, [appState, isDemo, kanbanStateReady]);

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
    const c = kanbanCardIdFromSearchParams(params);
    setAppState(next);
    if (c) setCardModalId(c);
  }, [isDemo]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const key = isDemo ? "kanbanAppStateV3Demo" : "kanbanAppStateV3";
      const scope = isDemo ? "user" : "tenant";
      const remote = await readClientState<unknown>(scope, key);
      if (cancelled) return;
      if (remote && typeof remote === "object") {
        setAppState((prev) => {
          if (!prev) return prev;
          const currentCard = cardModalId;
          const remoteState = isDemo
            ? normalizeDemoKanbanAppState(remote as KanbanAppState)
            : (remote as KanbanAppState);
          const merged = mergeKanbanStatePreservingLocalBoards(prev, remoteState);
          if (currentCard && !findCardInAppState(merged, currentCard)) {
            setCardModalId(null);
          }
          saveKanbanState(merged, isDemo);
          return merged;
        });
      }
      setKanbanStateReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  useEffect(() => {
    if (isDemo) {
      archiveSettingsReadyRef.current = true;
      return;
    }
    let cancelled = false;
    const pullArchiveSettings = async () => {
      const remote = await readClientState<unknown>("tenant", KANBAN_ARCHIVE_SETTINGS_KEY);
      if (cancelled) return;
      if (remote) {
        lastArchiveSettingsSigRef.current = JSON.stringify(remote);
        setAppState((prev) => (prev ? applyKanbanArchiveSettings(prev, remote) : prev));
      }
      if (!archiveSettingsReadyRef.current) {
        archiveSettingsReadyRef.current = true;
      }
    };
    void pullArchiveSettings();
    const onVisibleOrFocus = () => {
      if (document.visibilityState !== "visible") return;
      void pullArchiveSettings();
    };
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void pullArchiveSettings();
    }, 15_000);
    document.addEventListener("visibilitychange", onVisibleOrFocus);
    window.addEventListener("focus", onVisibleOrFocus);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibleOrFocus);
      window.removeEventListener("focus", onVisibleOrFocus);
    };
  }, [isDemo]);

  useEffect(() => {
    if (!appState || !kanbanStateReady) return;
    saveKanbanState(appState, isDemo);
    const key = isDemo ? "kanbanAppStateV3Demo" : "kanbanAppStateV3";
    const scope = isDemo ? "user" : "tenant";
    const payload = kanbanStateForPersistence(appState);
    if (kanbanStateSaveTimerRef.current) {
      clearTimeout(kanbanStateSaveTimerRef.current);
    }
    kanbanStateSaveTimerRef.current = setTimeout(() => {
      kanbanStateSaveTimerRef.current = null;
      void writeClientState(scope, key, payload);
    }, 550);
    return () => {
      if (kanbanStateSaveTimerRef.current) {
        clearTimeout(kanbanStateSaveTimerRef.current);
        kanbanStateSaveTimerRef.current = null;
      }
    };
  }, [appState, isDemo, kanbanStateReady]);

  useEffect(() => {
    const demo = isDemo;
    return () => {
      const cur = appStateRef.current;
      if (!cur) return;
      const key = demo ? "kanbanAppStateV3Demo" : "kanbanAppStateV3";
      const scope = demo ? "user" : "tenant";
      void writeClientState(scope, key, kanbanStateForPersistence(cur));
    };
  }, [isDemo]);

  useEffect(() => {
    if (isDemo || !appState || !kanbanStateReady || !archiveSettingsReadyRef.current) return;
    const payload = extractKanbanArchiveSettings(appState);
    const sig = JSON.stringify(payload);
    if (sig === lastArchiveSettingsSigRef.current) return;
    lastArchiveSettingsSigRef.current = sig;
    void writeClientState("tenant", KANBAN_ARCHIVE_SETTINGS_KEY, payload);
  }, [appState, isDemo, kanbanStateReady]);

  useEffect(() => {
    if (!appState || !kanbanStateReady) {
      kaitenPullOnceRef.current = false;
      return;
    }
    if (!kaitenPullOnceRef.current) {
      kaitenPullOnceRef.current = true;
      void syncKanbanMirrorFromApi();
    }
  }, [appState, kanbanStateReady, syncKanbanMirrorFromApi]);

  useEffect(() => {
    if (!kanbanStateReady) return;
    const pullIfVisible = () => {
      if (document.visibilityState === "visible") void syncKanbanMirrorFromApi();
    };
    const iv = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void syncKanbanMirrorFromApi();
    }, kanbanLinkedOrdersPullIntervalMs());
    document.addEventListener("visibilitychange", pullIfVisible);
    window.addEventListener("focus", pullIfVisible);
    return () => {
      window.clearInterval(iv);
      document.removeEventListener("visibilitychange", pullIfVisible);
      window.removeEventListener("focus", pullIfVisible);
    };
  }, [kanbanStateReady, syncKanbanMirrorFromApi]);

  useEffect(() => {
    if (!kanbanStateReady) return;
    const onOrderArchived = () => {
      void syncKanbanMirrorFromApi();
    };
    window.addEventListener(CRM_ORDER_ARCHIVED_EVENT, onOrderArchived);
    return () => {
      window.removeEventListener(CRM_ORDER_ARCHIVED_EVENT, onOrderArchived);
    };
  }, [kanbanStateReady, syncKanbanMirrorFromApi]);

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
        setKanbanSessionRole(j.user?.role ?? null);
        const access = j.user?.moduleAccess ?? {};
        setKanbanCardPerms({
          editTitle: access.KANBAN_EDIT_TITLE !== false,
          editDueDate: access.KANBAN_EDIT_DUE_DATE !== false,
          editTrack: access.KANBAN_EDIT_TRACK !== false,
          manageAssignees: access.KANBAN_MANAGE_ASSIGNEES !== false,
          manageParticipants: access.KANBAN_MANAGE_PARTICIPANTS !== false,
          moveToOtherBoard: access.KANBAN_MOVE_TO_OTHER_BOARD !== false,
          manageKanbanChecklist: access.KANBAN_MANAGE_CHECKLIST !== false,
          manageKanbanTimer: access.KANBAN_MANAGE_TIMER !== false,
        });
      } catch {
        if (!cancelled) {
          setActivityActorLabel(undefined);
          setKanbanSessionUserId(null);
          setKanbanSessionRole(null);
          setKanbanCardPerms({
            editTitle: true,
            editDueDate: true,
            editTrack: true,
            manageAssignees: true,
            manageParticipants: true,
            moveToOtherBoard: true,
            manageKanbanChecklist: true,
            manageKanbanTimer: true,
          });
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
  const visibleBoards = useMemo(() => {
    if (!appState) return [];
    return appState.boards.filter((b) =>
      canUserAccessBoard(b, kanbanSessionUserId, kanbanSessionRole),
    );
  }, [appState, kanbanSessionUserId, kanbanSessionRole]);
  const searchView = useMemo(
    () =>
      appState
        ? buildKanbanDisplayView(appState, {
            sessionUserId: kanbanSessionUserId,
            sessionUserRole: kanbanSessionRole,
          })
        : null,
    [appState, kanbanSessionUserId, kanbanSessionRole],
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

  const modalCardForBlockPerm = useMemo(() => {
    if (!appState || !cardModalId) return null;
    return findCardInAppState(appState, cardModalId)?.card ?? null;
  }, [appState, cardModalId]);

  const canManageKanbanBlock = useMemo(() => {
    if (isDemo) return true;
    if (!modalCardForBlockPerm) return false;
    return canUserManageKanbanBlockForCard(
      kanbanSessionUserId,
      kanbanSessionRole,
      modalCardForBlockPerm,
    );
  }, [isDemo, modalCardForBlockPerm, kanbanSessionUserId, kanbanSessionRole]);

  const archivedCards = useMemo<KanbanArchivedCard[]>(() => {
    if (!board) return [];
    return [...(board.archivedCards || [])].sort((a, b) =>
      String(b.archivedAt).localeCompare(String(a.archivedAt)),
    );
  }, [board]);
  const stoppedCards = useMemo(() => {
    if (!board) return [];
    return [...(board.stoppedCards || [])].sort((a, b) =>
      String(b.stoppedAt).localeCompare(String(a.stoppedAt)),
    );
  }, [board]);

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
        syncProductionChecklistSnapshotsAcrossBoards(next.boards);
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
    }, err ? TOAST_AUTO_HIDE_MS.error : TOAST_AUTO_HIDE_MS.default);
  }, []);

  useEffect(() => {
    if (!appState) return;
    const runSweep = () => {
      let archivedCount = 0;
      let deletedCount = 0;
      let productionArchivedCount = 0;
      setAppState((s) => {
        if (!s) return s;
        const next = structuredClone(s);
        syncProductionChecklistSnapshotsAcrossBoards(next.boards);
        for (const b of next.boards) {
          const out = applyBoardArchivePolicies(b);
          archivedCount += out.archivedCount;
          deletedCount += out.deletedCount;
          productionArchivedCount += autoArchiveReadyProductionChildren(b);
        }
        if (archivedCount === 0 && deletedCount === 0 && productionArchivedCount === 0) return s;
        return next;
      });
      if (archivedCount + productionArchivedCount > 0) {
        showToast(`В архив перемещено карточек: ${archivedCount + productionArchivedCount}`);
      }
      if (deletedCount > 0) {
        showToast(`Из архива удалено по сроку: ${deletedCount}`);
      }
    };
    runSweep();
    const iv = window.setInterval(runSweep, 60_000);
    return () => window.clearInterval(iv);
  }, [appState, showToast]);

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
          void syncKanbanMirrorFromApi();
          return;
        }
        void syncKanbanMirrorFromApi();
      } catch {
        showToast("Сеть: колонка в Kaiten могла не обновиться", true);
        void syncKanbanMirrorFromApi();
      }
    },
    [showToast, syncKanbanMirrorFromApi],
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
        const view = buildKanbanDisplayView(s, {
          sessionUserId: kanbanSessionUserId,
          sessionUserRole: kanbanSessionRole,
        });
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
      kanbanSessionRole,
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

  useEffect(() => {
    if (!appState) return;
    if (isKanbanAggregateBoardId(appState.activeBoardId)) return;
    if (canUserAccessBoard(getActiveBoard(appState), kanbanSessionUserId, kanbanSessionRole)) {
      return;
    }
    const nextBoardId = appState.boards.find((b) =>
      canUserAccessBoard(b, kanbanSessionUserId, kanbanSessionRole),
    )?.id;
    if (!nextBoardId) return;
    patchApp((s) => {
      s.activeBoardId = nextBoardId;
    });
  }, [appState, kanbanSessionUserId, kanbanSessionRole, patchApp]);

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

  const archiveCard = (cardId: string) => {
    if (!appState) return;
    const found = findCardInAppState(appState, cardId);
    if (!found) return;
    const titleSnapshot = (found.card.title || "").trim() || "карточка";
    setAppState((s) => {
      if (!s) return s;
      const next = structuredClone(s);
      const loc = findCardInAppState(next, cardId);
      if (!loc) return s;
      const boardRef = next.boards.find((b) => b.id === loc.board.id);
      if (!boardRef) return s;
      const ok = archiveCardByIdOnBoard(boardRef, cardId, "manual");
      if (!ok) return s;
      return next;
    });
    if (cardModalId === cardId) setCardModalId(null);
    showToast(`Карточка «${titleSnapshot}» отправлена в архив`);
  };

  const stopCard = (cardId: string) => {
    if (!appState) return;
    const found = findCardInAppState(appState, cardId);
    if (!found) return;
    const titleSnapshot = (found.card.title || "").trim() || "карточка";
    setAppState((s) => {
      if (!s) return s;
      const next = structuredClone(s);
      const loc = findCardInAppState(next, cardId);
      if (!loc) return s;
      const boardRef = next.boards.find((b) => b.id === loc.board.id);
      if (!boardRef) return s;
      const ok = stopCardByIdOnBoard(boardRef, cardId);
      if (!ok) return s;
      syncProductionChecklistSnapshotsAcrossBoards(next.boards);
      return next;
    });
    if (cardModalId === cardId) setCardModalId(null);
    showToast(`Карточка «${titleSnapshot}» перемещена в СТОП`);
  };

  const restoreStoppedCard = (stoppedId: string) => {
    setAppState((s) => {
      if (!s) return s;
      const next = structuredClone(s);
      const b = getActiveBoard(next);
      const ok = restoreStoppedCardOnBoard(b, stoppedId);
      if (!ok) return s;
      syncProductionChecklistSnapshotsAcrossBoards(next.boards);
      return next;
    });
    showToast("Карточка возвращена из СТОП");
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
    const home = found.board;
    const colIdx = home.columns.findIndex((c) => c.id === found.col.id);
    if (colIdx < 0 || colIdx >= home.columns.length - 1) {
      showToast("Это последняя колонка", true);
      return;
    }
    const nextTitle = home.columns[colIdx + 1].title;
    const nextCol = home.columns[colIdx + 1];
    const settings = normalizeProductionSettings(home);
    const doneTitle = settings.childDoneColumnTitle.trim().toLowerCase();
    const nextTitleRaw = nextTitle.trim().toLowerCase();
    const childIncomplete =
      Boolean(found.card.parentCardId) &&
      (nextTitleRaw === doneTitle || nextTitleRaw.endsWith(`· ${doneTitle}`)) &&
      (found.card.productionChecklist || []).some((x) => !x.completed);
    if (childIncomplete) {
      const ok = window.confirm(
        "Не все пункты производственного чеклиста отмечены как готовые. Перенести карточку в «Готово»?",
      );
      if (!ok) return;
    }
    const linkedSorts = nextCol.cards
      .filter((c) => c.linkedOrderId)
      .map((c) => c.kaitenCardSortOrder)
      .filter((x): x is number => x != null && Number.isFinite(x));
    const sortOrder = (linkedSorts.length ? Math.max(...linkedSorts) : 0) + 1;
    const cardSnapshot = found.card;
    let expandBoardId = "";
    let expandChildIds: string[] = [];
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
      const movedCard = findCard(b, cardId)?.card;
      if (movedCard?.parentCardId) {
        markProductionChildReadyState(b, cardId);
        if (parentCanMoveToAssembly(b, movedCard.parentCardId)) {
          moveParentToAssemblyIfReady(b, movedCard.parentCardId, activityActorLabel);
        }
      } else if (movedCard) {
        const enteredTrigger = columnMatchesStage(nextCol.title, settings.triggerColumnTitle);
        const hasRedoFiles = (movedCard.files || []).some((f) => f.productionRedo === true);
        if (enteredTrigger && (hasRedoFiles || (movedCard.childCardIds || []).length > 0)) {
          const prodBoard = ensureProductionBoard(next, b);
          const syncResult = syncProductionChildrenForParent(
            prodBoard,
            movedCard.id,
            activityActorLabel,
            movedCard,
          );
          if (syncResult.childIds.length > 0) {
            movedCard.childCardIds = syncResult.childIds;
            expandBoardId = prodBoard.id;
            expandChildIds = syncResult.childIds;
          }
        }
      }
      syncProductionChecklistSnapshotsAcrossBoards(next.boards);
      return next;
    });
    if (expandBoardId && expandChildIds.length > 0) {
      for (const childId of expandChildIds) {
        enrichProductionChecklistForChild(expandBoardId, childId);
      }
    }
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

  const moveCardToPrevStage = (cardId: string) => {
    if (!appState) return;
    const found = findCardInAppState(appState, cardId);
    if (!found) return;
    const home = found.board;
    const colIdx = home.columns.findIndex((c) => c.id === found.col.id);
    if (colIdx <= 0) {
      showToast("Это первая колонка", true);
      return;
    }
    const prevTitle = home.columns[colIdx - 1].title;
    const prevCol = home.columns[colIdx - 1];
    const linkedSorts = prevCol.cards
      .filter((c) => c.linkedOrderId)
      .map((c) => c.kaitenCardSortOrder)
      .filter((x): x is number => x != null && Number.isFinite(x));
    const sortOrder = (linkedSorts.length ? Math.max(...linkedSorts) : 0) + 1;
    const cardSnapshot = found.card;
    const settings = normalizeProductionSettings(home);
    let expandBoardId = "";
    let expandChildIds: string[] = [];
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
      const prevCol = b.columns[colIdx - 1];
      prevCol.cards.push(c);
      const now = new Date().toISOString();
      c.lastMovedAt = now;
      c.updatedAt = now;
      pushActivity(c, `Перемещена в «${prevCol.title}»`, b.users[0]?.id, b, activityActorLabel);
      runKanbanAutomations(
        b,
        {
          type: "card_moved_to_column",
          cardId,
          fromColumnId: fromColId,
          toColumnId: prevCol.id,
        },
        0,
        activityActorLabel,
      );
      const movedCard = findCard(b, cardId)?.card;
      if (movedCard && !movedCard.parentCardId) {
        const enteredTrigger = columnMatchesStage(prevCol.title, settings.triggerColumnTitle);
        const hasRedoFiles = (movedCard.files || []).some((f) => f.productionRedo === true);
        if (enteredTrigger && (hasRedoFiles || (movedCard.childCardIds || []).length > 0)) {
          const prodBoard = ensureProductionBoard(next, b);
          const syncResult = syncProductionChildrenForParent(
            prodBoard,
            movedCard.id,
            activityActorLabel,
            movedCard,
          );
          if (syncResult.childIds.length > 0) {
            movedCard.childCardIds = syncResult.childIds;
            expandBoardId = prodBoard.id;
            expandChildIds = syncResult.childIds;
          }
        }
      }
      if (c.parentCardId) {
        markProductionChildReadyState(b, cardId);
      }
      syncProductionChecklistSnapshotsAcrossBoards(next.boards);
      return next;
    });
    if (expandBoardId && expandChildIds.length > 0) {
      for (const childId of expandChildIds) {
        enrichProductionChecklistForChild(expandBoardId, childId);
      }
    }
    if (
      !isDemo &&
      cardSnapshot.linkedOrderId &&
      typeof cardSnapshot.kaitenCardId === "number" &&
      Number.isFinite(cardSnapshot.kaitenCardId)
    ) {
      void syncKaitenMirrorAfterKanbanMove({
        orderId: cardSnapshot.linkedOrderId,
        kaitenCardId: cardSnapshot.kaitenCardId,
        columnTitle: prevTitle,
        kaitenTrackLane: kaitenLaneForKanbanBoardId(home.id),
        sortOrder,
      });
    }
    showToast(`Этап: «${prevTitle}»`);
  };

  const moveCardToColumn = useCallback(
    (cardId: string, targetColumnId: string) => {
      if (!appState) return;
      const found = findCardInAppState(appState, cardId);
      if (!found) return;
      const home = found.board;
      const fromCol = found.col;
      const targetCol = home.columns.find((c) => c.id === targetColumnId);
      if (!targetCol || targetCol.id === fromCol.id) return;
      const linkedSorts = targetCol.cards
        .filter((c) => c.linkedOrderId)
        .map((c) => c.kaitenCardSortOrder)
        .filter((x): x is number => x != null && Number.isFinite(x));
      const sortOrder = (linkedSorts.length ? Math.max(...linkedSorts) : 0) + 1;
      const cardSnapshot = found.card;
      const settings = normalizeProductionSettings(home);
      let expandBoardId = "";
      let expandChildIds: string[] = [];
      setAppState((s) => {
        if (!s) return s;
        const next = structuredClone(s);
        const b = next.boards.find((x) => x.id === home.id);
        if (!b) return s;
        const loc = findCard(b, cardId);
        if (!loc) return s;
        const toCol = b.columns.find((c) => c.id === targetColumnId);
        if (!toCol || toCol.id === loc.col.id) return s;
        const c = loc.card;
        loc.col.cards = loc.col.cards.filter((x) => x.id !== cardId);
        toCol.cards.push(c);
        const now = new Date().toISOString();
        c.lastMovedAt = now;
        c.updatedAt = now;
        pushActivity(c, `Перемещена в «${toCol.title}»`, b.users[0]?.id, b, activityActorLabel);
        runKanbanAutomations(
          b,
          {
            type: "card_moved_to_column",
            cardId,
            fromColumnId: loc.col.id,
            toColumnId: toCol.id,
          },
          0,
          activityActorLabel,
        );
        if (c.parentCardId) {
          markProductionChildReadyState(b, cardId);
          if (parentCanMoveToAssembly(b, c.parentCardId)) {
            moveParentToAssemblyIfReady(b, c.parentCardId, activityActorLabel);
          }
        } else {
          const enteredTrigger = columnMatchesStage(toCol.title, settings.triggerColumnTitle);
          const hasRedoFiles = (c.files || []).some((f) => f.productionRedo === true);
          if (enteredTrigger && (hasRedoFiles || (c.childCardIds || []).length > 0)) {
            const prodBoard = ensureProductionBoard(next, b);
            const syncResult = syncProductionChildrenForParent(
              prodBoard,
              c.id,
              activityActorLabel,
              c,
            );
            if (syncResult.childIds.length > 0) {
              c.childCardIds = syncResult.childIds;
              expandBoardId = prodBoard.id;
              expandChildIds = syncResult.childIds;
            }
          }
        }
        syncProductionChecklistSnapshotsAcrossBoards(next.boards);
        return next;
      });
      if (expandBoardId && expandChildIds.length > 0) {
        for (const childId of expandChildIds) {
          enrichProductionChecklistForChild(expandBoardId, childId);
        }
      }
      if (
        !isDemo &&
        cardSnapshot.linkedOrderId &&
        typeof cardSnapshot.kaitenCardId === "number" &&
        Number.isFinite(cardSnapshot.kaitenCardId)
      ) {
        void syncKaitenMirrorAfterKanbanMove({
          orderId: cardSnapshot.linkedOrderId,
          kaitenCardId: cardSnapshot.kaitenCardId,
          columnTitle: targetCol.title,
          kaitenTrackLane: kaitenLaneForKanbanBoardId(home.id),
          sortOrder,
        });
      }
      showToast(`Этап: «${targetCol.title}»`);
    },
    [appState, activityActorLabel, isDemo, showToast, syncKaitenMirrorAfterKanbanMove],
  );

  const enrichProductionChecklistForChild = useCallback(async (boardId: string, childId: string) => {
    const cur = appStateRef.current;
    if (!cur) return;
    const next = structuredClone(cur);
    const b = next.boards.find((x) => x.id === boardId);
    if (!b) return;
    await expandProductionChecklistFromArchives(b, childId);
    syncProductionChecklistSnapshotsAcrossBoards(next.boards);
    setAppState(next);
  }, []);

  useEffect(() => {
    if (!cardModalId || !appState) return;
    const loc = findCardInAppState(appState, cardModalId);
    if (!loc) return;
    const card = loc.card;
    if (!card.parentCardId) return;
    const hasZipSource = (card.files || []).some((f) => {
      const name = String(f.name || "").trim().toLowerCase();
      const mime = String(f.mime || "").trim().toLowerCase();
      return name.endsWith(".zip") || mime.includes("zip");
    });
    if (!hasZipSource) return;
    const hasArchiveRows = (card.productionChecklist || []).some((row) => row.fromArchive === true);
    if (hasArchiveRows) return;
    const inFlight = childChecklistExpandInFlightRef.current;
    if (inFlight.has(card.id)) return;
    inFlight.add(card.id);
    void enrichProductionChecklistForChild(loc.board.id, card.id).finally(() => {
      inFlight.delete(card.id);
    });
  }, [appState, cardModalId, enrichProductionChecklistForChild]);

  const syncParentProductionChildrenAfterFilesAttach = useCallback(
    (cardId: string) => {
      let expandBoardId = "";
      let expandChildIds: string[] = [];
      let notifyCreated: Array<{ childId: string; laneName: string }> = [];
      setAppState((s) => {
        if (!s) return s;
        const next = structuredClone(s);
        const loc = findCardInAppState(next, cardId);
        if (!loc) return s;
        if (loc.card.parentCardId) return s;
        const settings = normalizeProductionSettings(loc.board);
        const inTriggerColumn = columnMatchesStage(
          loc.col.title,
          settings.triggerColumnTitle,
        );
        if (!inTriggerColumn) return s;
        const prodBoard = ensureProductionBoard(next, loc.board);
        const syncResult = syncProductionChildrenForParent(
          prodBoard,
          cardId,
          activityActorLabel,
          loc.card,
        );
        notifyCreated = syncResult.newlyCreated;
        if (!syncResult.childIds.length) return s;
        loc.card.childCardIds = syncResult.childIds;
        expandBoardId = prodBoard.id;
        expandChildIds = syncResult.childIds;
        return next;
      });
      if (!expandBoardId || expandChildIds.length === 0) return;
      for (const childId of expandChildIds) {
        enrichProductionChecklistForChild(expandBoardId, childId);
      }
      if (!isDemo && notifyCreated.length > 0) {
        for (const { childId, laneName } of notifyCreated) {
          const nextState = appStateRef.current;
          const pb = nextState?.boards.find((x) => x.id === expandBoardId);
          const childCard = pb ? findCard(pb, childId)?.card : null;
          const titleT = (childCard?.title || "").trim() || "Без названия";
          const url = kanbanCardAbsoluteUrl(childId, expandBoardId);
          const linkHtml = telegramHtmlLink(url, titleT);
          postKanbanTelegramNotify({
            event: "tg_production_new_card",
            lines: [
              `Новая карточка производства, дорожка «${laneName}»: ${linkHtml}`,
            ],
            parseMode: "HTML",
            recipientRoles: ["PRODUCTION", "SENIOR_PRODUCTION"],
          });
        }
      }
    },
    [activityActorLabel, enrichProductionChecklistForChild, isDemo],
  );

  const ensureProductionBoard = useCallback(
    (state: KanbanAppState, sourceBoard: KanbanBoard): KanbanBoard => {
      const sourceSettings = normalizeProductionSettings(sourceBoard);
      const lanes = sourceSettings.lanes.length
        ? sourceSettings.lanes
        : [{ id: "lane_print", name: "Печать", keywords: [] }];
      const existing =
        state.boards.find((x) => x.id === PRODUCTION_BOARD_ID) ||
        state.boards.find((x) => normalizeBoardTitle(x.title) === "производство");
      if (existing) {
        if (existing.id !== PRODUCTION_BOARD_ID) {
          const oldId = existing.id;
          existing.id = PRODUCTION_BOARD_ID;
          if (state.activeBoardId === oldId) {
            state.activeBoardId = PRODUCTION_BOARD_ID;
          }
        }
        const neededTitles: string[] = [];
        for (const lane of lanes) {
          neededTitles.push(`${lane.name} · ${sourceSettings.childTodoColumnTitle}`);
          neededTitles.push(`${lane.name} · ${sourceSettings.childInProgressColumnTitle}`);
          neededTitles.push(`${lane.name} · ${sourceSettings.childDoneColumnTitle}`);
        }
        const existingTitles = new Set(
          existing.columns.map((col) => String(col.title || "").trim().toLowerCase()),
        );
        for (const title of neededTitles) {
          const key = title.trim().toLowerCase();
          if (existingTitles.has(key)) continue;
          existing.columns.push({ id: generateId("col"), title, cards: [] });
          existingTitles.add(key);
        }
        existing.productionSettings = structuredClone(sourceSettings);
        existing.users = structuredClone(sourceBoard.users || []);
        existing.cardTypes = structuredClone(sourceBoard.cardTypes || []);
        existing.excludedCrmUserIds = structuredClone(sourceBoard.excludedCrmUserIds || []);
        return existing;
      }
      const mk = (title: string): KanbanColumn => ({ id: generateId("col"), title, cards: [] });
      const columns: KanbanColumn[] = [];
      for (const lane of lanes) {
        columns.push(mk(`${lane.name} · ${sourceSettings.childTodoColumnTitle}`));
        columns.push(mk(`${lane.name} · ${sourceSettings.childInProgressColumnTitle}`));
        columns.push(mk(`${lane.name} · ${sourceSettings.childDoneColumnTitle}`));
      }
      const board: KanbanBoard = {
        id: PRODUCTION_BOARD_ID,
        title: "Производство",
        isPrivate: false,
        allowProductionRoleAccess: true,
        accessUserIds: [],
        columns,
        users: structuredClone(sourceBoard.users || []),
        excludedCrmUserIds: structuredClone(sourceBoard.excludedCrmUserIds || []),
        cardTypes: structuredClone(sourceBoard.cardTypes || []),
        automations: [],
        autoArchiveRules: [],
        archiveRetentionDays: sourceBoard.archiveRetentionDays ?? 365,
        archivedCards: [],
        productionSettings: structuredClone(sourceSettings),
      };
      state.boards.push(board);
      return board;
    },
    [],
  );

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
                  ? (visibleBoards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)?.id ??
                      visibleBoards[0]?.id ??
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
              {visibleBoards.map((b) => (
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
                if (!visibleBoards.length) return;
                const fallbackId =
                  visibleBoards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)?.id ??
                  visibleBoards[0]!.id;
                if (appState.activeBoardId === KANBAN_BOARD_MY_CARDS_ID) {
                  patchApp((s) => {
                    s.activeBoardId = fallbackId;
                  });
                  const label = appState.boards.find((x) => x.id === fallbackId)?.title;
                  showToast(label ? `Доска: ${label}` : "Доска");
                } else {
                  patchApp((s) => {
                    s.activeBoardId = KANBAN_BOARD_MY_CARDS_ID;
                  });
                  showToast("Доска: Мои");
                }
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
                if (!visibleBoards.length) return;
                const fallbackId =
                  visibleBoards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)?.id ??
                  visibleBoards[0]!.id;
                if (appState.activeBoardId === KANBAN_BOARD_DISTRIBUTE_ID) {
                  patchApp((s) => {
                    s.activeBoardId = fallbackId;
                  });
                  const label = appState.boards.find((x) => x.id === fallbackId)?.title;
                  showToast(label ? `Доска: ${label}` : "Доска");
                } else {
                  patchApp((s) => {
                    s.activeBoardId = KANBAN_BOARD_DISTRIBUTE_ID;
                  });
                  showToast("Доска: Ответственный");
                }
              }}
            >
              Ответственный
            </button>
          </div>
          <KanbanViewModePicker
            viewMode={appState.viewMode}
            onChange={(mode) => patchApp((s) => (s.viewMode = mode))}
          />
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
            <button
              id="kanban-stop-drop-target"
              type="button"
              className={`rounded-md border px-3 py-1.5 text-[0.95rem] font-extrabold tracking-wide shadow-sm hover:brightness-[0.98] dark:hover:brightness-110 ${
                stopOpen
                  ? "border-white/70 bg-white text-black ring-2 ring-white/70"
                  : "border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] text-[var(--kanban-text)]"
              }`}
              title="Перетащите карточку сюда или нажмите, чтобы открыть СТОП"
              onClick={() => setStopOpen((v) => !v)}
            >
              СТОП {stoppedCards.length}
            </button>
            <button
              type="button"
              className="rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] px-2 py-1.5 text-[0.75rem] font-medium text-[var(--kanban-text)] hover:brightness-[0.98] dark:hover:brightness-110"
              onClick={() => setArchiveOpen(true)}
            >
              Архив ({archivedCards.length})
            </button>
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

          {stopOpen ? (
            <KanbanStopView
              board={board}
              stoppedCards={stoppedCards}
              onOpenCard={openKanbanCard}
              onRestore={restoreStoppedCard}
            />
          ) : appState.viewMode === "board" ? (
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
                if (!kanbanCardPerms.moveToOtherBoard) return;
                setMoveCardId(cid);
                setMoveTargetBoardId("");
              }}
              onRequestArchiveCard={archiveCard}
              onRequestStopCard={stopCard}
              onRequestDeleteCard={deleteCard}
              allowMoveToOtherBoard={
                appState.boards.length > 1 && kanbanCardPerms.moveToOtherBoard
              }
              onLinkedOrderMovedToKaitenMirror={
                isDemo
                  ? undefined
                  : (args) =>
                      syncKaitenMirrorAfterKanbanMove({
                        ...args,
                        kaitenTrackLane: kaitenLaneForKanbanBoardId(board.id),
                      })
              }
              onCardColumnChanged={({ cardId, toColumnId }) => {
                let productionTelegramCreates: Array<{
                  childId: string;
                  laneName: string;
                  prodBoardId: string;
                }> = [];
                let expandBoardId = "";
                let expandChildIds: string[] = [];
                setAppState((s) => {
                  if (!s || isKanbanAggregateBoardId(s.activeBoardId)) return s;
                  const next = structuredClone(s);
                  const b = getActiveBoard(next);
                  const settings = normalizeProductionSettings(b);
                  const toCol = b.columns.find((c) => c.id === toColumnId);
                  if (!toCol) return s;
                  const card = findCard(b, cardId)?.card;
                  if (!card) return s;
                  if (card.parentCardId) {
                    const doneRaw = settings.childDoneColumnTitle.trim().toLowerCase();
                    const toRaw = toCol.title.trim().toLowerCase();
                    const needWarn =
                      (toRaw === doneRaw || toRaw.endsWith(`· ${doneRaw}`)) &&
                      warnIfChildMovedToDoneWithIncompleteChecklist(b, cardId);
                    if (needWarn) {
                      window.alert(
                        "Внимание: не все пункты производственного чеклиста отмечены как готовые.",
                      );
                    }
                    markProductionChildReadyState(b, cardId);
                    const parentLoc = findCardInAppState(next, card.parentCardId);
                    if (parentLoc) {
                      const allDone = (parentLoc.card.childCardIds || []).every((cid) =>
                        next.boards.some((bb) => isProductionChildDone(bb, cid)),
                      );
                      if (allDone) {
                        const parentSettings = normalizeProductionSettings(parentLoc.board);
                        const assembly = parentLoc.board.columns.find(
                          (col) =>
                            col.title.trim().toLowerCase() ===
                            parentSettings.parentDoneColumnTitle.trim().toLowerCase(),
                        );
                        if (assembly && parentLoc.col.id !== assembly.id) {
                          parentLoc.col.cards = parentLoc.col.cards.filter((x) => x.id !== parentLoc.card.id);
                          assembly.cards.unshift(parentLoc.card);
                          parentLoc.card.lastMovedAt = new Date().toISOString();
                          pushActivity(
                            parentLoc.card,
                            `Перемещена в «${assembly.title}»`,
                            parentLoc.board.users[0]?.id,
                            parentLoc.board,
                            activityActorLabel,
                          );
                        }
                      }
                    }
                  } else {
                    const enteredTrigger = columnMatchesStage(
                      toCol.title,
                      settings.triggerColumnTitle,
                    );
                    const hasRedoFiles = (card.files || []).some((f) => f.productionRedo === true);
                    if (enteredTrigger && (hasRedoFiles || (card.childCardIds || []).length > 0)) {
                      const prodBoard = ensureProductionBoard(next, b);
                      const syncResult = syncProductionChildrenForParent(
                        prodBoard,
                        card.id,
                        activityActorLabel,
                        card,
                      );
                      if (syncResult.childIds.length > 0) {
                        card.childCardIds = syncResult.childIds;
                        expandBoardId = prodBoard.id;
                        expandChildIds = syncResult.childIds;
                      }
                    }
                  }
                  syncProductionChecklistSnapshotsAcrossBoards(next.boards);
                  return next;
                });
                if (expandBoardId && expandChildIds.length > 0) {
                  for (const childId of expandChildIds) {
                    enrichProductionChecklistForChild(expandBoardId, childId);
                  }
                }
                if (!isDemo && productionTelegramCreates.length > 0) {
                  queueMicrotask(() => {
                    const st = appStateRef.current;
                    for (const row of productionTelegramCreates) {
                      const pb = st?.boards.find((x) => x.id === row.prodBoardId);
                      const childCard = pb ? findCard(pb, row.childId)?.card : null;
                      const titleT = (childCard?.title || "").trim() || "Без названия";
                      const url = kanbanCardAbsoluteUrl(row.childId, row.prodBoardId);
                      const linkHtml = telegramHtmlLink(url, titleT);
                      postKanbanTelegramNotify({
                        event: "tg_production_new_card",
                        lines: [
                          `Новая карточка производства, дорожка «${row.laneName}»: ${linkHtml}`,
                        ],
                        parseMode: "HTML",
                        recipientRoles: ["PRODUCTION", "SENIOR_PRODUCTION"],
                      });
                    }
                  });
                }
              }}
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
        allBoards={appState.boards}
        activityActorLabel={activityActorLabel}
        commentAuthorUserId={kanbanSessionUserId ?? undefined}
        sessionUserRole={kanbanSessionRole}
        onClose={() => setCardModalId(null)}
        onApply={applyModalBoard}
        toast={showToast}
        onMovePrevStage={(id) => {
          moveCardToPrevStage(id);
          setCardModalId(id);
        }}
        onMoveNextStage={(id) => {
          moveCardToNextStage(id);
          setCardModalId(id);
        }}
        onMoveToColumn={(id, targetColumnId) => {
          moveCardToColumn(id, targetColumnId);
          setCardModalId(id);
        }}
        onCopyCardLink={copyCardLink}
        canEditTitle={kanbanCardPerms.editTitle}
        canEditDueDate={kanbanCardPerms.editDueDate}
        canEditTrack={kanbanCardPerms.editTrack}
        canManageAssignees={kanbanCardPerms.manageAssignees}
        canManageParticipants={kanbanCardPerms.manageParticipants}
        canManageKanbanChecklist={kanbanCardPerms.manageKanbanChecklist}
        canManageKanbanTimer={kanbanCardPerms.manageKanbanTimer}
        canManageKanbanBlock={canManageKanbanBlock}
        onOpenLinkedCard={(id) => setCardModalId(id)}
        onParentProductionFilesUpdated={syncParentProductionChildrenAfterFilesAttach}
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
                .filter(
                  (b) =>
                    b.id !== appState.activeBoardId &&
                    canUserAccessBoard(b, kanbanSessionUserId, kanbanSessionRole),
                )
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

      {archiveOpen && (
        <div
          className="fixed inset-0 z-[216] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setArchiveOpen(false);
          }}
        >
          <div
            className="w-full max-w-5xl rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-[var(--app-text)] shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="m-0 text-base font-semibold">Архив карточек</h3>
              <button
                type="button"
                className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)]"
                onClick={() => setArchiveOpen(false)}
              >
                Закрыть
              </button>
            </div>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Доска: {board.title}. Хранение:{" "}
              {(() => {
                const d = Number.isFinite(board.archiveRetentionDays)
                  ? Number(board.archiveRetentionDays)
                  : 365;
                const y = d / 365;
                const s =
                  d % 365 === 0
                    ? String(Math.round(y))
                    : y.toLocaleString("ru-RU", {
                        maximumFractionDigits: 3,
                        minimumFractionDigits: 0,
                      });
                return `${s} г.`;
              })()}
            </p>
            {archivedCards.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                Архив пуст.
              </p>
            ) : (
              <div className="mt-4 max-h-[70vh] overflow-auto rounded border border-[var(--card-border)]">
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                      <th className="px-3 py-2">Карточка</th>
                      <th className="px-3 py-2">Из колонки</th>
                      <th className="px-3 py-2">Причина</th>
                      <th className="px-3 py-2">В архиве с</th>
                      <th className="px-3 py-2">Удалится</th>
                      <th className="px-3 py-2 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedCards.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-[var(--border-subtle)] hover:bg-[var(--table-row-hover)]"
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium text-[var(--text-strong)]">
                            {row.card.title}
                          </div>
                          {row.card.linkedOrderId ? (
                            <div className="text-xs text-[var(--text-muted)]">
                              Наряд: {row.card.linkedOrderId}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">{row.sourceColumnTitle}</td>
                        <td className="px-3 py-2">
                          {row.reason === "auto" ? "Авто" : "Вручную"}
                        </td>
                        <td className="px-3 py-2">
                          {new Date(row.archivedAt).toLocaleString("ru-RU")}
                        </td>
                        <td className="px-3 py-2">
                          {new Date(row.deleteAfterAt).toLocaleString("ru-RU")}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              className="rounded-md border border-[var(--card-border)] px-2.5 py-1 text-xs hover:bg-[var(--surface-hover)]"
                              onClick={() => {
                                let restoredTitle = row.card.title;
                                setAppState((s) => {
                                  if (!s) return s;
                                  const next = structuredClone(s);
                                  const b = next.boards.find((x) => x.id === board.id);
                                  if (!b) return s;
                                  const ok = restoreArchivedCardOnBoard(b, row.id);
                                  if (!ok) return s;
                                  return next;
                                });
                                showToast(`Карточка «${restoredTitle}» восстановлена`);
                              }}
                            >
                              Восстановить
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-red-400/50 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                              onClick={() => {
                                setAppState((s) => {
                                  if (!s) return s;
                                  const next = structuredClone(s);
                                  const b = next.boards.find((x) => x.id === board.id);
                                  if (!b) return s;
                                  b.archivedCards = (b.archivedCards || []).filter(
                                    (x) => x.id !== row.id,
                                  );
                                  return next;
                                });
                                showToast("Карточка удалена из архива");
                              }}
                            >
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
