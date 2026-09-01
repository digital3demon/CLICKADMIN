"use client";

import type { AppModule, KaitenTrackLane, UserRole } from "@prisma/client";
import type {
  KanbanAppState,
  KanbanArchivedCard,
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  KanbanStoppedCard,
} from "@/lib/kanban/types";
import {
  applyKanbanAutomationDelayedArchives,
  runKanbanAutomations,
} from "@/lib/kanban/automations";
import {
  canUserAccessBoard,
  annulKanbanStageTimerOnMemberAdvance,
  applyKaitenApiCardTypesToMirrorBoards,
  applyBoardArchivePolicies,
  archiveCardByIdOnBoard,
  buildKanbanDisplayView,
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
  removeLinkedOrderCardsFromAppState,
  normalizeDemoKanbanAppState,
  pushActivity,
  restoreArchivedCardOnBoard,
  restoreStoppedCardOnBoard,
  saveKanbanState,
  stopCardByIdOnBoard,
  boardIdAfterLeavingKanbanAggregate,
  isKanbanAggregateBoardId,
  kanbanAggregateKeepsCard,
  kanbanAggregateMode,
  KANBAN_BOARD_DISTRIBUTE_ID,
  KANBAN_BOARD_MY_CARDS_ID,
  KANBAN_BOARD_ORTHODONTICS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
  mergeKanbanStatePreservingLocalBoards,
  withActiveBoard,
} from "@/lib/kanban/model";
import { applyOptimisticKaitenBlocksToLinkedRows } from "@/lib/kanban/optimistic-kaiten-block";
import {
  applyPendingKanbanColumnMoves,
  clearPendingKanbanColumnMove,
  listPendingKanbanColumnMoves,
} from "@/lib/kanban/pending-column-moves";
import {
  applyKanbanLegacyStageDueClearMigration,
  forEachKanbanCardInState,
  setKanbanStageDue,
} from "@/lib/kanban/kanban-stage-due";
import { applyKaitenRefreshPatchesToState } from "@/lib/kanban/apply-kaiten-refresh-patches";
import { parseKanbanAppState } from "@/lib/kanban/chat-sync";
import {
  applyKanbanMembersByOrderId,
  overlayLocalKanbanCardHeadOntoRemote,
} from "@/lib/kanban/preserve-kanban-card-head";
import {
  forgetOptimisticKanbanStageDue,
  rememberOptimisticKanbanStageDue,
} from "@/lib/kanban/optimistic-kaiten-stage-due";
import {
  fetchOrderKaitenCardHeadForKanban,
  patchOrderKaitenCard,
} from "@/lib/kanban/kaiten-linked-kanban-sync";
import { isKaitenIntegrationDisabledResponse } from "@/lib/kanban/kaiten-client-disabled";
import { showKanbanKaitenRefreshButton } from "@/lib/kaiten-integration/ui";
import { collectSharedArchivedCards } from "@/lib/kanban/collect-shared-archived-cards";
import { collectSharedStoppedCards } from "@/lib/kanban/collect-shared-stopped-cards";
import type { KanbanCardOpenOrigin } from "@/lib/kanban/card-modal-animation";
import {
  applyKanbanCardMembersOnBoard,
  notifyKanbanCardDueChange,
  notifyKanbanCardMemberChange,
  type KanbanMemberPickerMode,
} from "@/lib/kanban/kanban-card-members-client";
import {
  persistCrmBoardFieldsClient,
  persistCrmBoardFieldsFromKaitenRefreshPatches,
  persistKanbanLinkedCardTimer,
  commitKanbanColumnFromKaitenRefresh,
  rememberCrmKanbanColumnLocal,
  crmColumnPersistFromLinkedMove,
  persistMissingCrmPeopleFromState,
  persistMissingCrmStageDuesFromState,
  persistMissingCrmTimersFromState,
  persistMissingCrmChecklistsFromState,
} from "@/lib/kanban/persist-crm-board-fields-client";
import { applyCrmBoardTilesToAppState } from "@/lib/kanban/apply-crm-board-tiles";
import type { CrmBoardTile } from "@/lib/kanban/crm-board-tile";
import {
  appointmentSnapsFromCrmTiles,
  loadCrmBoardTilesCache,
  mergeCrmBoardTilesCache,
  saveCrmBoardTilesCache,
} from "@/lib/kanban/crm-board-tiles-cache";
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
import { applyKanbanCardTrackLaneChange } from "@/lib/kanban/apply-card-track-lane";
import { kanbanLinkedOrdersPullIntervalMs } from "@/lib/kanban-linked-pull-ms";
import { canUseKanbanActualAppointmentFilter } from "@/lib/auth/permissions";
import {
  applyKanbanActualAppointmentView,
  kanbanShouldApplyActualAppointmentView,
  linkedOrdersToAppointmentMap,
  type KanbanLinkedAppointmentSnap,
} from "@/lib/kanban/kanban-actual-appointment";
import { kanbanCardAbsoluteUrl } from "@/lib/kanban-card-browser-url";
import { kanbanCardIdFromSearchParams } from "@/lib/kanban-order-card-url";
import { canUserManageKanbanBlockForCard } from "@/lib/kanban-block-permissions";
import { postKanbanTelegramNotify } from "@/lib/kanban-crm-telegram-notify-client";
import { buildKanbanColumnMoveTelegramLines } from "@/lib/kanban/kanban-column-move-telegram";
import { shouldSkipCrmKanbanTelegram } from "@/lib/kanban/crm-kanban-telegram";
import {
  CRM_ORDER_ARCHIVED_EVENT,
  CRM_ORDER_KANBAN_COLUMN_EVENT,
} from "@/lib/crm-client-events";
import { kanbanCardTelegramMemberIds } from "@/lib/telegram-kanban-card-scope";
import { telegramHtmlLink, escapeTelegramHtml } from "@/lib/telegram-html";
import { userActivityDisplayLabel } from "@/lib/user-activity-display-label";
import {
  readClientState,
  readClientStateDetailed,
  writeClientState,
} from "@/lib/client-state-client";
import {
  writePersistedKanbanState,
  writePersistedKanbanStateNow,
} from "@/lib/kanban/persist-kanban-comments-client";
import {
  applyKanbanCardHeadsCache,
  collectLinkedOrderIdsFromHeadsCache,
  loadKanbanCardHeadsCache,
  loadStickyLinkedOrderIds,
  mergeStickyLinkedOrderIds,
  persistStickyLinkedOrderIds,
} from "@/lib/kanban/kanban-card-heads-cache";
import { shouldSkipSparseKanbanTenantWrite } from "@/lib/kanban/kanban-tenant-write-guard";
import { linkedOrdersApiUrl } from "@/lib/kanban/linked-orders-hydrate";
import {
  applyKanbanArchiveSettings,
  extractKanbanArchiveSettings,
  KANBAN_ARCHIVE_SETTINGS_KEY,
} from "@/lib/kanban/archive-settings-sync";
import {
  applyKanbanAutomations,
  KANBAN_AUTOMATIONS_KEY,
} from "@/lib/kanban/automations-sync";
import {
  applyKanbanCardTypeLanes,
  extractKanbanCardTypeLanes,
  mergeCardTypeLaneSnapshots,
  KANBAN_CARD_TYPE_LANES_KEY,
  type KanbanCardTypeLanesSnapshot,
} from "@/lib/kanban/card-type-lanes-sync";
import {
  KANBAN_BOARD_UI_KEY,
  applyKanbanBoardUiState,
  extractKanbanBoardUiState,
  loadKanbanBoardUiLocal,
  normalizeKanbanBoardUiState,
  saveKanbanBoardUiLocal,
} from "@/lib/kanban/user-board-ui-state";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { KanbanMembersBackfillButton } from "./KanbanMembersBackfillButton";
import { collectKanbanKaitenRefreshTargets } from "@/lib/kanban/kanban-linked-order-ids";
import { KanbanCrmUsersProvider } from "./kanban-crm-users-context";
import { TOAST_AUTO_HIDE_MS } from "@/components/ui/toast-store";
import { BoardCanvas } from "./BoardCanvas";
import { KanbanFilterQuickAccess } from "./KanbanFilterQuickAccess";
import { KanbanFiltersButton } from "./KanbanFiltersButton";
import { KanbanViewModePicker } from "./KanbanViewModePicker";
import { KanbanViewSortSelect } from "./KanbanViewSortSelect";
import { IconArchiveBox } from "./kanban-icons";
import {
  BOARD_COLUMN_SORT_MANUAL,
  boardColumnSortFromViewPref,
  kanbanViewSortRemoteKey,
  listSortFromViewPref,
  loadKanbanViewSortPrefLocal,
  parseKanbanViewSortPref,
  saveKanbanViewSortPrefLocal,
  type KanbanViewSortPref,
} from "@/lib/kanban/list-view-sort";

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
  moduleAccess?: Partial<Record<AppModule, boolean>>;
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

function notifyKanbanColumnTelegram(
  card: KanbanCard,
  boardId: string,
  fromTitle: string,
  toTitle: string,
  actorLabel?: string,
) {
  const from = String(fromTitle || "").trim();
  const to = String(toTitle || "").trim();
  if (!to || from.toLocaleLowerCase("ru-RU") === to.toLocaleLowerCase("ru-RU")) {
    return;
  }
  const titleLine = (card.title || "").trim() || "Без названия";
  const linkHtml = telegramHtmlLink(
    kanbanCardAbsoluteUrl(card.id, boardId),
    titleLine,
  );
  const oid = card.linkedOrderId?.trim() || "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const built = buildKanbanColumnMoveTelegramLines({
    cardLinkHtml: linkHtml,
    fromTitle: from,
    toTitle: to,
    actorLabel: actorLabel || "Пользователь",
    ...(oid
      ? {
          cardWord: telegramHtmlLink(kanbanCardAbsoluteUrl(card.id, boardId), "карточке"),
          orderWord: telegramHtmlLink(
            `${origin}/orders/${encodeURIComponent(oid)}`,
            "заказе",
          ),
        }
      : {}),
  });
  postKanbanTelegramNotify({
    kaitenCardId: card.kaitenCardId,
    event: "tg_kanban_crm_sync",
    parseMode: "HTML",
    targetUserIds: kanbanCardTelegramMemberIds(card),
    orderId: oid || undefined,
    lines: built.lines,
    linesSelf: built.linesSelf,
    ...(built.linesAdmin ? { linesAdmin: built.linesAdmin } : {}),
    ...(built.linesSelfAdmin ? { linesSelfAdmin: built.linesSelfAdmin } : {}),
  });
}

const STOP_HOVER_PREVIEW_OFFSET = 14;
const STOP_HOVER_PREVIEW_WIDTH = 288;
const STOP_HOVER_PREVIEW_MAX = 8;

function findLinkedOrderIdInState(
  state: KanbanAppState,
  orderId: string,
): KanbanCard | null {
  const want = String(orderId || "").trim();
  if (!want) return null;
  let hit: KanbanCard | null = null;
  forEachKanbanCardInState(state, (card) => {
    if (hit) return;
    if (String(card.linkedOrderId || "").trim() === want) hit = card;
  });
  return hit;
}

function isKanbanCardDragInProgress(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.kanbanCardDragging === "1";
}

function clampStopHoverPreviewPosition(x: number, y: number) {
  if (typeof window === "undefined") {
    return { left: x + STOP_HOVER_PREVIEW_OFFSET, top: y + STOP_HOVER_PREVIEW_OFFSET };
  }
  const margin = 8;
  const estHeight = 220;
  return {
    left: Math.max(
      margin,
      Math.min(
        x + STOP_HOVER_PREVIEW_OFFSET,
        window.innerWidth - STOP_HOVER_PREVIEW_WIDTH - margin,
      ),
    ),
    top: Math.max(
      margin,
      Math.min(y + STOP_HOVER_PREVIEW_OFFSET, window.innerHeight - estHeight - margin),
    ),
  };
}

function KanbanStopView({
  board,
  stoppedCards,
  resolveHomeBoard,
  onOpenCard,
  onRestore,
}: {
  board: KanbanBoard;
  stoppedCards: KanbanStoppedCard[];
  resolveHomeBoard?: (row: KanbanStoppedCard) => KanbanBoard;
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
                board={resolveHomeBoard?.(row) ?? board}
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
    const close = (e: globalThis.MouseEvent) => {
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

export function KanbanApp({
  isDemo = false,
  kaitenIntegrationActive = true,
}: {
  isDemo?: boolean;
  /** Кнопка «Обновить» с Kaiten — только при живой интеграции. */
  kaitenIntegrationActive?: boolean;
}) {
  /** null до монтирования: иначе SSR и первый клиентский кадр расходятся (server state vs default) → #418 и ломается Sortable. */
  const [appState, setAppState] = useState<KanbanAppState | null>(null);
  const [kanbanStateReady, setKanbanStateReady] = useState(isDemo);
  const kanbanStateReadyRef = useRef(isDemo);
  kanbanStateReadyRef.current = kanbanStateReady;
  const appStateRef = useRef<KanbanAppState | null>(null);
  appStateRef.current = appState;
  /** Настоящая доска до «Мои» / «Ответственный» — не ортопедия по умолчанию. */
  const lastRealBoardIdRef = useRef("");
  const [cardModalId, setCardModalId] = useState<string | null>(null);
  const [cardModalOrigin, setCardModalOrigin] = useState<KanbanCardOpenOrigin | null>(
    null,
  );
  const [listExpandedCardId, setListExpandedCardId] = useState<string | null>(
    null,
  );
  const [listAutoOpenBlock, setListAutoOpenBlock] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<{
    message: string;
    onOk: () => void;
  } | null>(null);
  const [moveCardId, setMoveCardId] = useState<string | null>(null);
  const [moveTargetBoardId, setMoveTargetBoardId] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [viewSort, setViewSort] = useState<KanbanViewSortPref>(
    BOARD_COLUMN_SORT_MANUAL,
  );
  const [actualAppointmentBoardId, setActualAppointmentBoardId] = useState<
    string | null
  >(null);
  const [linkedAppointmentByOrderId, setLinkedAppointmentByOrderId] = useState<
    Map<string, KanbanLinkedAppointmentSnap>
  >(() => new Map());
  const [stopHoverPreview, setStopHoverPreview] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [activityActorLabel, setActivityActorLabel] = useState<string | undefined>(undefined);
  const [kanbanSessionUserId, setKanbanSessionUserId] = useState<string | null>(null);
  const kanbanSessionUserIdRef = useRef<string | null>(null);
  kanbanSessionUserIdRef.current = kanbanSessionUserId;
  const [stickyLinkedOrderIds, setStickyLinkedOrderIds] = useState<string[]>([]);
  const stickyHydratedRef = useRef(false);
  useEffect(() => {
    if (!stickyHydratedRef.current) {
      stickyHydratedRef.current = true;
      const stored = loadStickyLinkedOrderIds();
      if (stored.length > 0) setStickyLinkedOrderIds(stored);
      return;
    }
    persistStickyLinkedOrderIds(stickyLinkedOrderIds);
  }, [stickyLinkedOrderIds]);
  const sessionMirrorSyncedForUserRef = useRef<string | null>(null);
  const [kanbanSessionRole, setKanbanSessionRole] = useState<UserRole | null>(null);
  const [kanbanCardPerms, setKanbanCardPerms] = useState({
    moveColumns: false,
    editTitle: false,
    editDueDate: false,
    editTrack: false,
    manageAssignees: false,
    manageParticipants: false,
    moveToOtherBoard: false,
    manageKanbanChecklist: false,
    manageKanbanTimer: false,
    attachFiles: false,
    stop: false,
    deleteCard: false,
    manageBlock: false,
  });
  const [kanbanModuleAccess, setKanbanModuleAccess] = useState<
    Partial<Record<AppModule, boolean>>
  >({});
  const prevModalCardRef = useRef<string | null>(null);
  const kaitenPullOnceRef = useRef(false);
  const standalonePushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const standalonePushInFlightRef = useRef(false);
  const mirrorSyncInFlightRef = useRef(false);
  const mirrorSyncQueuedRef = useRef(false);
  const searchHitsSyncInFlightRef = useRef(false);
  const searchHitsSyncQueuedQRef = useRef<string | null>(null);
  const boardTilesAsOfRef = useRef<Record<string, string>>({});
  const boardTilesBoardRef = useRef("");
  const boardTilesInFlightRef = useRef(false);
  const boardTilesQueuedFullRef = useRef(false);
  const tenantKanbanReadAtRef = useRef(0);
  const lastTenantKanbanRef = useRef<KanbanAppState | null>(null);
  /** F5: не писать default в tenant, пока GET не подтвердил живой снимок. */
  const tenantKanbanWriteAllowedRef = useRef(isDemo);
  const kanbanStateSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kanbanUiSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Backfill пишет kanban state на сервере — не перезаписывать устаревшим локальным автосохранением. */
  const kanbanPersistPausedRef = useRef(false);
  const childChecklistExpandInFlightRef = useRef<Set<string>>(new Set());
  const archiveSettingsReadyRef = useRef(false);
  const lastArchiveSettingsSigRef = useRef("");
  const [cardTypeLanesReady, setCardTypeLanesReady] = useState(false);
  const lastCardTypeLanesRef = useRef<KanbanCardTypeLanesSnapshot>({
    version: 1,
    types: [],
  });
  const lastCardTypeLanesSigRef = useRef("");
  /** Перед первым GET отдаём локальные карточки без наряда на сервер — иначе пустой ответ затрёт их. */
  const standalonePrimedRef = useRef(false);
  /**
   * Оптимистичные переносы колонок: пока Kaiten/БД догоняют, merge не должен
   * откатывать карточку на старый `kaitenColumnTitle` из снимка.
   */
  const flushKanbanTenantNowRef = useRef<() => void>(() => {});

  const canPersistTenantKanban = useCallback(
    (state: KanbanAppState) => {
      if (isDemo) return true;
      if (!tenantKanbanWriteAllowedRef.current) return false;
      const stored = lastTenantKanbanRef.current;
      if (stored && shouldSkipSparseKanbanTenantWrite(state, stored)) {
        return false;
      }
      return true;
    },
    [isDemo],
  );

  const syncCrmBoardTiles = useCallback(
    async (opts?: { full?: boolean }) => {
      if (isDemo) return;
      const cur = appStateRef.current;
      if (!cur) return;
      if (boardTilesInFlightRef.current) {
        if (opts?.full) boardTilesQueuedFullRef.current = true;
        return;
      }
      const boardId = cur.activeBoardId;
      boardTilesInFlightRef.current = true;
      try {
        const since =
          opts?.full || !boardTilesAsOfRef.current[boardId]
            ? ""
            : boardTilesAsOfRef.current[boardId] || "";
        const qs = new URLSearchParams({ boardId });
        if (since) qs.set("since", since);
        const r = await fetch(`/api/kanban/board-tiles?${qs}`, {
          credentials: "include",
        });
        if (!r.ok) return;
        const j = (await r.json()) as { tiles?: CrmBoardTile[]; asOf?: string };
        const tiles = Array.isArray(j.tiles) ? j.tiles : [];
        if (j.asOf) boardTilesAsOfRef.current[boardId] = j.asOf;
        if (since) mergeCrmBoardTilesCache(boardId, tiles);
        else saveCrmBoardTilesCache(boardId, tiles);
        setLinkedAppointmentByOrderId((prev) => {
          const next = new Map(prev);
          for (const [id, snap] of appointmentSnapsFromCrmTiles(tiles)) {
            next.set(id, snap);
          }
          return next;
        });
        setAppState((prev) => {
          if (!prev) return prev;
          const replaceBoardId =
            !since && !isKanbanAggregateBoardId(boardId) ? boardId : null;
          const pruneMemberUserId =
            !since && isKanbanAggregateBoardId(boardId)
              ? kanbanSessionUserIdRef.current
              : null;
          const next = applyCrmBoardTilesToAppState(prev, tiles, {
            replaceBoardId,
            pruneMemberUserId,
          });
          applyKanbanCardHeadsCache(next, loadKanbanCardHeadsCache());
          persistMissingCrmStageDuesFromState(next, tiles);
          persistMissingCrmPeopleFromState(next, tiles);
          persistMissingCrmTimersFromState(next, tiles);
          persistMissingCrmChecklistsFromState(next, tiles);
          saveKanbanState(next, false);
          return next;
        });
      } catch {
        /* offline */
      } finally {
        boardTilesInFlightRef.current = false;
        if (boardTilesQueuedFullRef.current) {
          boardTilesQueuedFullRef.current = false;
          void syncCrmBoardTiles({ full: true });
        }
      }
    },
    [isDemo],
  );

  const optimisticKaitenColumnMovesRef = useRef(
    new Map<
      string,
      {
        columnTitle?: string;
        sortOrder: number;
        kaitenTrackLane?: KaitenTrackLane;
        until: number;
      }
    >(),
  );
  const router = useRouter();
  const pathname = usePathname() ?? "/kanban";

  const applyOptimisticKaitenMovesToLinkedRows = useCallback(
    (rows: KaitenLinkedOrderForKanban[]) => {
      const now = Date.now();
      const map = optimisticKaitenColumnMovesRef.current;
      for (const [orderId, opt] of map) {
        if (now >= opt.until) map.delete(orderId);
      }
      for (const pending of listPendingKanbanColumnMoves(now)) {
        if (!pending.orderId || !pending.toColumnTitle?.trim()) continue;
        if (map.has(pending.orderId)) continue;
        map.set(pending.orderId, {
          columnTitle: pending.toColumnTitle.trim(),
          sortOrder: 0,
          until: pending.at + 120_000,
        });
      }
      if (map.size === 0) return rows;
      return rows.map((row) => {
        const opt = map.get(row.id);
        if (!opt) return row;
        return {
          ...row,
          ...(opt.columnTitle?.trim()
            ? { kaitenColumnTitle: opt.columnTitle.trim() }
            : {}),
          ...(opt.kaitenTrackLane
            ? { kaitenTrackLane: opt.kaitenTrackLane }
            : {}),
          kaitenCardSortOrder: opt.sortOrder,
        };
      });
    },
    [],
  );

  /** Наряды с сервера + локальные карточки без наряда (общие для тенанта). */
  const syncKanbanMirrorFromApi = useCallback(async () => {
    if (mirrorSyncInFlightRef.current) {
      mirrorSyncQueuedRef.current = true;
      return;
    }
    mirrorSyncInFlightRef.current = true;
    try {
      if (isDemo) {
        const q = (appStateRef.current?.search || "").trim();
        const r = await fetch(linkedOrdersApiUrl([], q), { credentials: "include" });
        if (!r.ok) return;
        const j = (await r.json()) as {
          orders?: KaitenLinkedOrderForKanban[];
          goneIds?: string[];
        };
        const rows = applyOptimisticKaitenBlocksToLinkedRows(j.orders ?? []);
        const incomingAppt = linkedOrdersToAppointmentMap(rows);
        setLinkedAppointmentByOrderId((prev) => {
          const next = new Map(prev);
          for (const [id, snap] of incomingAppt) next.set(id, snap);
          return next;
        });
        setAppState((prev) => {
          if (!prev) return prev;
          const base = normalizeDemoKanbanAppState(prev);
          let merged = mergeKaitenLinkedOrdersIntoAppState(base, rows, {
            demo: true,
            mode: "upsertOnly",
          });
          merged = removeLinkedOrderCardsFromAppState(merged, j.goneIds ?? []);
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

      const rStandalone = await fetch("/api/kanban/standalone-cards", {
        credentials: "include",
      });
      let standaloneRows: StandaloneRow[] = [];
      if (rStandalone.ok) {
        const jS = (await rStandalone.json()) as { rows?: StandaloneRow[] };
        standaloneRows = Array.isArray(jS.rows) ? jS.rows : [];
      }
      setAppState((prev) => {
        if (!prev) return prev;
        const next = applyStandaloneRowsFromServer(prev, standaloneRows);
        applyKanbanCardHeadsCache(next, loadKanbanCardHeadsCache());
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
  }, [isDemo, applyOptimisticKaitenMovesToLinkedRows]);

  /**
   * Поиск не ждёт kaiten-titles-sync и не шлёт ids (goneIds иначе может снять карточку).
   * Свой in-flight: не стоит в очереди за полным зеркалом.
   */
  const syncKanbanSearchHitsFromApi = useCallback(async () => {
    const q = (appStateRef.current?.search || "").trim();
    if (q.length < 2) return;
    if (searchHitsSyncInFlightRef.current) {
      searchHitsSyncQueuedQRef.current = q;
      return;
    }
    searchHitsSyncInFlightRef.current = true;
    try {
      const r = await fetch(linkedOrdersApiUrl([], q), { credentials: "include" });
      if (!r.ok) return;
      const j = (await r.json()) as { orders?: KaitenLinkedOrderForKanban[] };
      const rows = applyOptimisticKaitenBlocksToLinkedRows(
        applyOptimisticKaitenMovesToLinkedRows(j.orders ?? []),
      );
      const incomingAppt = linkedOrdersToAppointmentMap(rows);
      setLinkedAppointmentByOrderId((prev) => {
        const next = new Map(prev);
        for (const [id, snap] of incomingAppt) next.set(id, snap);
        return next;
      });
      const uid = (kanbanSessionUserIdRef.current || "").trim();
      let needCardHead: string[] = [];
      let persisted: KanbanAppState | null = null;
      setAppState((prev) => {
        if (!prev) return prev;
        if (isDemo) {
          const base = normalizeDemoKanbanAppState(prev);
          return normalizeDemoKanbanAppState(
            mergeKaitenLinkedOrdersIntoAppState(base, rows, {
              demo: true,
              mode: "upsertOnly",
            }),
          );
        }
        const merged = mergeKaitenLinkedOrdersIntoAppState(prev, rows, {
          demo: false,
          mode: "upsertOnly",
        });
        overlayLocalKanbanCardHeadOntoRemote(prev, merged);
        applyKanbanCardHeadsCache(merged, loadKanbanCardHeadsCache());
        needCardHead = rows
          .map((r) => r.id)
          .filter((oid) => {
            const card = findLinkedOrderIdInState(merged, oid);
            if (!card) return false;
            if (
              uid &&
              ((card.assignees || []).includes(uid) ||
                (card.participants || []).includes(uid))
            ) {
              return false;
            }
            return true;
          })
          .slice(0, 12);
        saveKanbanState(merged, false);
        persisted = merged;
        const foundOids = rows.map((r) => r.id).filter(Boolean);
        if (foundOids.length > 0) {
          setStickyLinkedOrderIds((prev) => mergeStickyLinkedOrderIds(prev, foundOids));
        }
        return merged;
      });
      if (persisted && canPersistTenantKanban(persisted)) {
        writePersistedKanbanState(persisted, false);
      }
      if (!isDemo && needCardHead.length > 0) {
        const byOrder: Record<
          string,
          { assignees: string[]; participants: string[] }
        > = {};
        await Promise.all(
          needCardHead.map(async (oid) => {
            const head = await fetchOrderKaitenCardHeadForKanban(oid);
            if (!head.ok) return;
            if (head.assignees.length === 0 && head.participants.length === 0) {
              return;
            }
            byOrder[oid] = {
              assignees: head.assignees,
              participants: head.participants,
            };
          }),
        );
        if (Object.keys(byOrder).length > 0) {
          setAppState((prev) => {
            if (!prev) return prev;
            const next = structuredClone(prev);
            applyKanbanMembersByOrderId(next, byOrder);
            applyKanbanCardHeadsCache(next, loadKanbanCardHeadsCache());
            saveKanbanState(next, false);
            if (canPersistTenantKanban(next)) {
              writePersistedKanbanState(next, false);
            }
            return next;
          });
        }
      }
    } catch {
      /* offline */
    } finally {
      searchHitsSyncInFlightRef.current = false;
      const queued = searchHitsSyncQueuedQRef.current;
      searchHitsSyncQueuedQRef.current = null;
      if (
        queued &&
        (appStateRef.current?.search || "").trim().length >= 2
      ) {
        window.setTimeout(() => {
          void syncKanbanSearchHitsFromApi();
        }, 40);
      }
    }
  }, [
    isDemo,
    canPersistTenantKanban,
    applyOptimisticKaitenBlocksToLinkedRows,
    applyOptimisticKaitenMovesToLinkedRows,
  ]);

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
    if (!isDemo) {
      const uiLocal = loadKanbanBoardUiLocal();
      if (uiLocal) {
        next = applyKanbanBoardUiState(next, uiLocal);
        if (uiLocal.lastRealBoardId) lastRealBoardIdRef.current = uiLocal.lastRealBoardId;
      }
    }
    if (
      !isDemo &&
      bid &&
      (next.boards.some((b) => b.id === bid) || isKanbanAggregateBoardId(bid))
    ) {
      next = structuredClone(next);
      next.activeBoardId = bid;
    }
    if (!isDemo) {
      applyKanbanCardHeadsCache(next, loadKanbanCardHeadsCache());
      const cachedTiles = loadCrmBoardTilesCache(next.activeBoardId);
      if (cachedTiles.length > 0) {
        const replaceBoardId = isKanbanAggregateBoardId(next.activeBoardId)
          ? null
          : next.activeBoardId;
        next = applyCrmBoardTilesToAppState(next, cachedTiles, { replaceBoardId });
        applyKanbanCardHeadsCache(next, loadKanbanCardHeadsCache());
        const snaps = appointmentSnapsFromCrmTiles(cachedTiles);
        if (snaps.size > 0) {
          setLinkedAppointmentByOrderId(snaps);
        }
      }
    }
    const c = kanbanCardIdFromSearchParams(params);
    setAppState(applyPendingKanbanColumnMoves(next, listPendingKanbanColumnMoves()));
    if (c) setCardModalId(c);
  }, [isDemo]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const key = isDemo ? "kanbanAppStateV3Demo" : "kanbanAppStateV3";
      const scope = isDemo ? "user" : "tenant";
      let remoteRead = await readClientStateDetailed<unknown>(scope, key);
      if (!isDemo) {
        for (let attempt = 0; attempt < 3 && !remoteRead.ok && !cancelled; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
          if (cancelled) return;
          remoteRead = await readClientStateDetailed<unknown>(scope, key);
        }
      }
      if (!isDemo) tenantKanbanReadAtRef.current = Date.now();
      if (cancelled) return;
      if (!isDemo && !remoteRead.ok) {
        tenantKanbanWriteAllowedRef.current = false;
      } else if (!isDemo && remoteRead.ok && !remoteRead.found) {
        tenantKanbanWriteAllowedRef.current = true;
      } else if (remoteRead.ok && remoteRead.found) {
        const parsed = parseKanbanAppState(remoteRead.value);
        if (!isDemo && !parsed) {
          tenantKanbanWriteAllowedRef.current = false;
        } else if (parsed || (isDemo && remoteRead.value && typeof remoteRead.value === "object")) {
          setAppState((prev) => {
            if (!prev) return prev;
            const currentCard = cardModalId;
            const remoteState = isDemo
              ? normalizeDemoKanbanAppState(
                  (parsed ?? remoteRead.value) as KanbanAppState,
                )
              : (parsed as KanbanAppState);
            const merged = applyKanbanCardTypeLanes(
              mergeKanbanStatePreservingLocalBoards(prev, remoteState),
              lastCardTypeLanesRef.current,
            );
            const finalState = applyPendingKanbanColumnMoves(
              isDemo
                ? merged
                : applyKanbanLegacyStageDueClearMigration(merged).state,
              listPendingKanbanColumnMoves(),
            );
            applyKanbanCardHeadsCache(finalState, loadKanbanCardHeadsCache());
            if (currentCard && !findCardInAppState(finalState, currentCard)) {
              setCardModalId(null);
            }
            saveKanbanState(finalState, isDemo);
            if (!isDemo) {
              lastTenantKanbanRef.current = finalState;
              tenantKanbanWriteAllowedRef.current = true;
            }
            return finalState;
          });
        }
      }

      // Персональный UI (фильтры, вид, активная доска) — отдельно на пользователя.
      if (!isDemo) {
        const uiRaw = await readClientState<unknown>("user", KANBAN_BOARD_UI_KEY);
        if (cancelled) return;
        const ui = normalizeKanbanBoardUiState(uiRaw);
        if (ui) {
          if (ui.lastRealBoardId) lastRealBoardIdRef.current = ui.lastRealBoardId;
          saveKanbanBoardUiLocal(ui);
          setAppState((prev) => {
            if (!prev) return prev;
            const next = applyKanbanBoardUiState(prev, ui);
            saveKanbanState(next, false);
            return next;
          });
        } else {
          // Миграция: один раз перенести UI из текущего снимка в user-ключ.
          setAppState((prev) => {
            if (!prev) return prev;
            void writeClientState(
              "user",
              KANBAN_BOARD_UI_KEY,
              extractKanbanBoardUiState(prev, lastRealBoardIdRef.current),
            );
            return prev;
          });
        }
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
    if (isDemo) return;
    let cancelled = false;
    const pullAutomations = async () => {
      const remote = await readClientState<unknown>("tenant", KANBAN_AUTOMATIONS_KEY);
      if (cancelled || !remote) return;
      setAppState((prev) => (prev ? applyKanbanAutomations(prev, remote) : prev));
    };
    void pullAutomations();
    const onVisibleOrFocus = () => {
      if (document.visibilityState !== "visible") return;
      void pullAutomations();
    };
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void pullAutomations();
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
    if (isDemo) {
      setCardTypeLanesReady(true);
      return;
    }
    let cancelled = false;
    const pullCardTypeLanes = async () => {
      const remote = await readClientState<unknown>("tenant", KANBAN_CARD_TYPE_LANES_KEY);
      if (cancelled) return;
      const merged = mergeCardTypeLaneSnapshots(remote, lastCardTypeLanesRef.current);
      lastCardTypeLanesRef.current = merged;
      lastCardTypeLanesSigRef.current = JSON.stringify(merged);
      if (merged.types.length > 0) {
        setAppState((prev) => (prev ? applyKanbanCardTypeLanes(prev, merged) : prev));
      }
      setCardTypeLanesReady(true);
    };
    void pullCardTypeLanes();
    const onVisibleOrFocus = () => {
      if (document.visibilityState !== "visible") return;
      void pullCardTypeLanes();
    };
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void pullCardTypeLanes();
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
    if (!appState || !kanbanStateReady || kanbanPersistPausedRef.current) return;
    saveKanbanState(appState, isDemo);
    if (!canPersistTenantKanban(appState)) return;
    if (kanbanStateSaveTimerRef.current) {
      clearTimeout(kanbanStateSaveTimerRef.current);
    }
    kanbanStateSaveTimerRef.current = setTimeout(() => {
      kanbanStateSaveTimerRef.current = null;
      writePersistedKanbanState(appState, isDemo);
    }, 2000);
    return () => {
      if (kanbanStateSaveTimerRef.current) {
        clearTimeout(kanbanStateSaveTimerRef.current);
        kanbanStateSaveTimerRef.current = null;
      }
    };
  }, [appState, isDemo, kanbanStateReady, canPersistTenantKanban]);

  useEffect(() => {
    flushKanbanTenantNowRef.current = () => {
      if (isDemo || kanbanPersistPausedRef.current) return;
      if (!kanbanStateReadyRef.current) return;
      if (!lastTenantKanbanRef.current) return;
      const cur = appStateRef.current;
      if (!cur || !canPersistTenantKanban(cur)) return;
      if (kanbanStateSaveTimerRef.current) {
        clearTimeout(kanbanStateSaveTimerRef.current);
        kanbanStateSaveTimerRef.current = null;
      }
      writePersistedKanbanState(cur, false);
    };
    const onPageHide = () => flushKanbanTenantNowRef.current();
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        flushKanbanTenantNowRef.current();
      }
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isDemo, canPersistTenantKanban]);

  // Персональный UI — отдельный debounce в user client-state.
  useEffect(() => {
    if (isDemo || !appState || !kanbanStateReady || kanbanPersistPausedRef.current) {
      return;
    }
    const uiPayload = extractKanbanBoardUiState(appState, lastRealBoardIdRef.current);
    saveKanbanBoardUiLocal(uiPayload);
    if (kanbanUiSaveTimerRef.current) {
      clearTimeout(kanbanUiSaveTimerRef.current);
    }
    kanbanUiSaveTimerRef.current = setTimeout(() => {
      kanbanUiSaveTimerRef.current = null;
      void writeClientState("user", KANBAN_BOARD_UI_KEY, uiPayload);
    }, 400);
    return () => {
      if (kanbanUiSaveTimerRef.current) {
        clearTimeout(kanbanUiSaveTimerRef.current);
        kanbanUiSaveTimerRef.current = null;
      }
    };
  }, [
    isDemo,
    kanbanStateReady,
    appState?.filters,
    appState?.filterTemplates,
    appState?.activeBoardId,
    appState?.viewMode,
    appState?.calendarMonth,
    appState?.search,
  ]);

  useEffect(() => {
    const demo = isDemo;
    return () => {
      if (kanbanPersistPausedRef.current) return;
      const cur = appStateRef.current;
      if (!cur || !canPersistTenantKanban(cur)) return;
      writePersistedKanbanState(cur, demo);
      if (!demo) {
        const ui = extractKanbanBoardUiState(cur, lastRealBoardIdRef.current);
        saveKanbanBoardUiLocal(ui);
        void writeClientState("user", KANBAN_BOARD_UI_KEY, ui);
        const lanes = mergeCardTypeLaneSnapshots(
          extractKanbanCardTypeLanes(cur),
          lastCardTypeLanesRef.current,
        );
        if (lanes.types.length > 0) {
          void writeClientState("tenant", KANBAN_CARD_TYPE_LANES_KEY, lanes);
        }
      }
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
    if (isDemo || !appState || !kanbanStateReady || !cardTypeLanesReady) {
      return;
    }
    const payload = mergeCardTypeLaneSnapshots(
      extractKanbanCardTypeLanes(appState),
      lastCardTypeLanesRef.current,
    );
    const sig = JSON.stringify(payload);
    if (sig === lastCardTypeLanesSigRef.current) return;
    lastCardTypeLanesRef.current = payload;
    lastCardTypeLanesSigRef.current = sig;
    void writeClientState("tenant", KANBAN_CARD_TYPE_LANES_KEY, payload);
  }, [appState, isDemo, kanbanStateReady, cardTypeLanesReady]);

  useEffect(() => {
    if (!appState) {
      kaitenPullOnceRef.current = false;
      return;
    }
    if (!kaitenPullOnceRef.current) {
      kaitenPullOnceRef.current = true;
      void syncKanbanMirrorFromApi();
    }
  }, [appState, syncKanbanMirrorFromApi]);

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
    if (isDemo || !appState) return;
    const bid = appState.activeBoardId;
    if (boardTilesBoardRef.current !== bid) {
      boardTilesBoardRef.current = bid;
      const cachedTiles = loadCrmBoardTilesCache(bid);
      if (cachedTiles.length > 0) {
        setLinkedAppointmentByOrderId((prev) => {
          const next = new Map(prev);
          for (const [id, snap] of appointmentSnapsFromCrmTiles(cachedTiles)) {
            next.set(id, snap);
          }
          return next;
        });
        setAppState((prev) => {
          if (!prev) return prev;
          const replaceBoardId = isKanbanAggregateBoardId(bid) ? null : bid;
          const next = applyCrmBoardTilesToAppState(prev, cachedTiles, { replaceBoardId });
          applyKanbanCardHeadsCache(next, loadKanbanCardHeadsCache());
          return next;
        });
      }
      void syncCrmBoardTiles({ full: true });
    }
  }, [appState?.activeBoardId, appState, isDemo, syncCrmBoardTiles]);

  useEffect(() => {
    if (isDemo || !kanbanStateReady) return;
    const pull = () => {
      if (document.visibilityState === "visible") void syncCrmBoardTiles();
    };
    const iv = window.setInterval(pull, kanbanLinkedOrdersPullIntervalMs());
    document.addEventListener("visibilitychange", pull);
    window.addEventListener("focus", pull);
    return () => {
      window.clearInterval(iv);
      document.removeEventListener("visibilitychange", pull);
      window.removeEventListener("focus", pull);
    };
  }, [isDemo, kanbanStateReady, syncCrmBoardTiles]);

  useEffect(() => {
    if (!kanbanStateReady) return;
    const q = (appState?.search || "").trim();
    if (q.length < 2) return;
    const t = window.setTimeout(() => {
      void syncKanbanSearchHitsFromApi();
    }, 180);
    return () => window.clearTimeout(t);
  }, [appState?.search, kanbanStateReady, syncKanbanSearchHitsFromApi]);

  useEffect(() => {
    if (!kanbanStateReady) return;
    const onOrderArchived = () => {
      void syncKanbanMirrorFromApi();
      void syncCrmBoardTiles({ full: true });
    };
    const onKanbanColumn = () => {
      void syncCrmBoardTiles({ full: true });
    };
    window.addEventListener(CRM_ORDER_ARCHIVED_EVENT, onOrderArchived);
    window.addEventListener(CRM_ORDER_KANBAN_COLUMN_EVENT, onKanbanColumn);
    return () => {
      window.removeEventListener(CRM_ORDER_ARCHIVED_EVENT, onOrderArchived);
      window.removeEventListener(CRM_ORDER_KANBAN_COLUMN_EVENT, onKanbanColumn);
    };
  }, [kanbanStateReady, syncKanbanMirrorFromApi, syncCrmBoardTiles]);

  useEffect(() => {
    const uid = (kanbanSessionUserId || "").trim();
    if (!uid || isDemo || !kanbanStateReady) return;
    if (sessionMirrorSyncedForUserRef.current === uid) return;
    sessionMirrorSyncedForUserRef.current = uid;
    const fromHeads = collectLinkedOrderIdsFromHeadsCache(loadKanbanCardHeadsCache(), {
      sessionUserId: uid,
    });
    if (fromHeads.length > 0) {
      setStickyLinkedOrderIds((prev) => mergeStickyLinkedOrderIds(prev, fromHeads));
    }
    void syncKanbanMirrorFromApi();
  }, [kanbanSessionUserId, isDemo, kanbanStateReady, syncKanbanMirrorFromApi]);

  const pullCatalogCardTypes = useCallback(async () => {
    if (isDemo) return;
    try {
      const res = await fetch("/api/kanban/card-types", {
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
        const next = applyKaitenApiCardTypesToMirrorBoards(prev, rows);
        return applyKanbanCardTypeLanes(next, lastCardTypeLanesRef.current);
      });
      void syncCrmBoardTiles({ full: true });
    } catch {
      /* справочник недоступен — плитки всё равно клеят тип по имени */
    }
  }, [isDemo, syncCrmBoardTiles]);

  useEffect(() => {
    if (isDemo || !kanbanStateReady) return;
    void pullCatalogCardTypes();
  }, [isDemo, kanbanStateReady, pullCatalogCardTypes]);

  useEffect(() => {
    if (isDemo) return;
    const onKaitenTypesSynced = () => {
      void pullCatalogCardTypes();
    };
    window.addEventListener(KANBAN_KAITEN_CARD_TYPES_SYNCED_EVENT, onKaitenTypesSynced);
    return () => {
      window.removeEventListener(
        KANBAN_KAITEN_CARD_TYPES_SYNCED_EVENT,
        onKaitenTypesSynced,
      );
    };
  }, [isDemo, pullCatalogCardTypes]);

  const openKanbanCard = useCallback((cardId: string, origin?: KanbanCardOpenOrigin) => {
    setListExpandedCardId(null);
    setCardModalOrigin(origin ?? null);
    setCardModalId(cardId);
  }, []);

  const closeKanbanCard = useCallback(() => {
    setCardModalId(null);
    setCardModalOrigin(null);
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
        setKanbanModuleAccess(access);
        setKanbanCardPerms({
          moveColumns: access.KANBAN_MOVE_COLUMNS === true,
          editTitle: access.KANBAN_EDIT_TITLE === true,
          editDueDate: access.KANBAN_EDIT_DUE_DATE === true,
          editTrack: access.KANBAN_EDIT_TRACK === true,
          manageAssignees: access.KANBAN_MANAGE_ASSIGNEES === true,
          manageParticipants: access.KANBAN_MANAGE_PARTICIPANTS === true,
          moveToOtherBoard: access.KANBAN_MOVE_TO_OTHER_BOARD === true,
          manageKanbanChecklist: access.KANBAN_MANAGE_CHECKLIST === true,
          manageKanbanTimer: access.KANBAN_MANAGE_TIMER === true,
          attachFiles: access.KANBAN_ATTACH_FILES === true,
          stop: access.KANBAN === true || access.KANBAN_STOP === true,
          deleteCard: access.KANBAN_DELETE_CARD === true,
          manageBlock: access.KANBAN_MANAGE_BLOCK === true,
        });
      } catch {
        if (!cancelled) {
          setActivityActorLabel(undefined);
          setKanbanSessionUserId(null);
          setKanbanSessionRole(null);
          setKanbanModuleAccess({});
          setKanbanCardPerms({
            moveColumns: false,
            editTitle: false,
            editDueDate: false,
            editTrack: false,
            manageAssignees: false,
            manageParticipants: false,
            moveToOtherBoard: false,
            manageKanbanChecklist: false,
            manageKanbanTimer: false,
            attachFiles: false,
            stop: false,
            deleteCard: false,
            manageBlock: false,
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
  const persistViewSort = useCallback(
    (next: KanbanViewSortPref) => {
      setViewSort(next);
      const bid = String(appStateRef.current?.activeBoardId || "").trim();
      const uid = kanbanSessionUserIdRef.current || "";
      if (!bid) return;
      saveKanbanViewSortPrefLocal(uid, bid, next);
      if (!isDemo) {
        void writeClientState("user", kanbanViewSortRemoteKey(bid), next);
      }
    },
    [isDemo],
  );
  useEffect(() => {
    const bid = String(appState?.activeBoardId || board?.id || "").trim();
    if (!bid) return;
    const uid = kanbanSessionUserId || "";
    const local = loadKanbanViewSortPrefLocal(uid, bid);
    setViewSort(local ?? BOARD_COLUMN_SORT_MANUAL);
    if (isDemo) return;
    let cancelled = false;
    void (async () => {
      const remote = await readClientState<unknown>(
        "user",
        kanbanViewSortRemoteKey(bid),
      );
      const legacyBoard = await readClientState<unknown>(
        "user",
        `kanbanBoardSort:${bid}`,
      );
      const legacyList = await readClientState<unknown>(
        "user",
        `kanbanListSort:${bid}`,
      );
      const parsed =
        parseKanbanViewSortPref(remote) ??
        parseKanbanViewSortPref(legacyBoard) ??
        parseKanbanViewSortPref(legacyList);
      if (cancelled || !parsed) return;
      setViewSort(parsed);
      saveKanbanViewSortPrefLocal(uid, bid, parsed);
    })();
    return () => {
      cancelled = true;
    };
  }, [isDemo, kanbanSessionUserId, appState?.activeBoardId, board?.id]);
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
            stickyLinkedOrderIds,
            memberHeads: loadKanbanCardHeadsCache(),
          })
        : null,
    [appState, kanbanSessionUserId, kanbanSessionRole, stickyLinkedOrderIds],
  );
  const displayBoard = searchView?.displayBoard ?? null;
  const cardHomeBoardId = searchView?.cardHomeBoardId;

  const actualFilterAvailable =
    board != null &&
    !isKanbanAggregateBoardId(board.id) &&
    kanbanSessionRole != null &&
    canUseKanbanActualAppointmentFilter(kanbanSessionRole);
  const actualOn =
    actualFilterAvailable && actualAppointmentBoardId === board?.id;
  const viewBoard = useMemo(() => {
    if (!displayBoard) return null;
    if (
      !kanbanShouldApplyActualAppointmentView(actualOn, appState?.search ?? "")
    ) {
      return displayBoard;
    }
    return applyKanbanActualAppointmentView(
      displayBoard,
      linkedAppointmentByOrderId,
    );
  }, [displayBoard, actualOn, linkedAppointmentByOrderId, appState?.search]);

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
    const id = cardModalId ?? listExpandedCardId;
    if (!id) return board;
    return findCardInAppState(appState, id)?.board ?? board;
  }, [cardModalId, listExpandedCardId, appState, board]);

  const modalCardForBlockPerm = useMemo(() => {
    if (!appState) return null;
    const id = cardModalId ?? listExpandedCardId;
    if (!id) return null;
    return findCardInAppState(appState, id)?.card ?? null;
  }, [appState, cardModalId, listExpandedCardId]);

  const canManageKanbanBlock = useMemo(() => {
    if (isDemo) return true;
    if (!modalCardForBlockPerm) return false;
    return canUserManageKanbanBlockForCard(
      kanbanSessionUserId,
      kanbanSessionRole,
      modalCardForBlockPerm,
      kanbanModuleAccess,
    );
  }, [isDemo, modalCardForBlockPerm, kanbanSessionUserId, kanbanSessionRole, kanbanModuleAccess]);

  const archivedCards = useMemo<KanbanArchivedCard[]>(() => {
    if (!appState) return [];
    const q = (appState.search || "").trim();
    return collectSharedArchivedCards(visibleBoards, q);
  }, [appState, visibleBoards]);
  const stoppedCards = useMemo(() => {
    if (!appState) return [];
    const uid = (kanbanSessionUserId || "").trim();
    const agg = kanbanAggregateMode(appState.activeBoardId);
    const q = (appState.search || "").trim();
    const keep =
      agg && uid
        ? (card: KanbanCard) =>
            kanbanAggregateKeepsCard(card, uid, agg, {
              searchActive: Boolean(q),
              stickyOrderIds: new Set(stickyLinkedOrderIds),
              memberHeads: loadKanbanCardHeadsCache(),
            })
        : undefined;
    return collectSharedStoppedCards(visibleBoards, q, keep);
  }, [appState, visibleBoards, kanbanSessionUserId, stickyLinkedOrderIds]);
  const resolveStoppedCardHomeBoard = useCallback(
    (row: KanbanStoppedCard) => {
      if (!appState || !board) {
        return board ?? ({} as KanbanBoard);
      }
      return (
        appState.boards.find((b) =>
          (b.stoppedCards || []).some(
            (x) => x.id === row.id || x.card.id === row.card.id,
          ),
        ) ?? board
      );
    },
    [appState, board],
  );
  const findArchivedCardHomeBoardId = useCallback(
    (archivedRowId: string) => {
      if (!appState) return board?.id ?? "";
      const home = appState.boards.find((b) =>
        (b.archivedCards || []).some((x) => x.id === archivedRowId),
      );
      return home?.id ?? board?.id ?? "";
    },
    [appState, board],
  );

  const onStopHoverMove = useCallback(
    (event: MouseEvent) => {
      if (stopOpen || isKanbanCardDragInProgress()) {
        setStopHoverPreview(null);
        return;
      }
      setStopHoverPreview({ x: event.clientX, y: event.clientY });
    },
    [stopOpen],
  );

  useEffect(() => {
    if (stopOpen) setStopHoverPreview(null);
  }, [stopOpen]);

  useEffect(() => {
    const hide = () => setStopHoverPreview(null);
    window.addEventListener("kanban-card-drag-start", hide);
    return () => window.removeEventListener("kanban-card-drag-start", hide);
  }, []);

  const stopHoverPreviewPos = stopHoverPreview
    ? clampStopHoverPreviewPosition(stopHoverPreview.x, stopHoverPreview.y)
    : null;
  const showStopHoverPreview = Boolean(stopHoverPreviewPos) && !stopOpen;
  const stopHoverPreviewItems = stoppedCards.slice(0, STOP_HOVER_PREVIEW_MAX);
  const stopHoverPreviewExtra = Math.max(
    0,
    stoppedCards.length - stopHoverPreviewItems.length,
  );

  const applyModalBoard = useCallback(
    (fn: (b: KanbanBoard) => void) => {
      const id = cardModalId ?? listExpandedCardId;
      if (!id) return;
      setAppState((s) => {
        if (!s) return s;
        const next = structuredClone(s);
        const loc = findCardInAppState(next, id);
        if (!loc) return s;
        const b = next.boards.find((x) => x.id === loc.board.id);
        if (!b) return s;
        fn(b);
        syncProductionChecklistSnapshotsAcrossBoards(next.boards);
        return next;
      });
    },
    [cardModalId, listExpandedCardId],
  );

  const applyCardMembersFromList = useCallback(
    (
      cardId: string,
      homeBoardId: string,
      mode: KanbanMemberPickerMode,
      userIds: string[],
    ) => {
      if (!appState) return;
      const loc = findCardInAppState(appState, cardId);
      if (!loc) return;
      const prevAssign = loc.card.assignees || [];
      const prevPart = loc.card.participants || [];
      const actorLabel = activityActorLabel?.trim() || "Пользователь";

      setAppState((s) => {
        if (!s) return s;
        const next = structuredClone(s);
        const found = findCardInAppState(next, cardId);
        if (!found) return s;
        const b = next.boards.find((x) => x.id === found.board.id);
        if (!b) return s;
        if (!applyKanbanCardMembersOnBoard(b, cardId, mode, userIds, activityActorLabel)) {
          return s;
        }
        syncProductionChecklistSnapshotsAcrossBoards(next.boards);
        return next;
      });

      notifyKanbanCardMemberChange({
        card: loc.card,
        cardId,
        boardId: homeBoardId,
        mode,
        prevAssign,
        prevPart,
        nextAssign: mode === "assign" ? userIds : prevAssign,
        nextPart: mode === "part" ? userIds : prevPart,
        actorLabel,
      });
    },
    [appState, activityActorLabel],
  );

  const applyCardStageDueFromList = useCallback(
    (cardId: string, homeBoardId: string, ymd: string) => {
      if (!appState) return;
      const loc = findCardInAppState(appState, cardId);
      if (!loc) return;
      setAppState((s) => {
        if (!s) return s;
        const next = structuredClone(s);
        const found = findCardInAppState(next, cardId);
        if (!found) return s;
        const b = next.boards.find((x) => x.id === found.board.id);
        if (!b) return s;
        const fc = findCard(b, cardId);
        if (!fc) return s;
        setKanbanStageDue(fc.card, ymd);
        pushActivity(fc.card, "Изменён срок", b.users[0]?.id, b, activityActorLabel);
        syncProductionChecklistSnapshotsAcrossBoards(next.boards);
        return next;
      });
      const card = loc.card;
      const oid = card.linkedOrderId?.trim() || "";
      if (oid) {
        persistCrmBoardFieldsClient({ orderId: oid, stageDueYmd: ymd || null });
      }
      if (
        oid &&
        card.kaitenCardId != null &&
        Number.isFinite(card.kaitenCardId)
      ) {
        rememberOptimisticKanbanStageDue(oid, ymd);
        void patchOrderKaitenCard(oid, { stageDueDate: ymd || null }).then((r) => {
          if (!r.ok) {
            forgetOptimisticKanbanStageDue(oid);
            showToast(r.error, true);
          }
        });
      }
      if (!shouldSkipCrmKanbanTelegram(card.kaitenCardId)) {
        notifyKanbanCardDueChange({
          card,
          cardId,
          boardId: homeBoardId || loc.board.id,
          actorLabel: activityActorLabel?.trim() || "Пользователь",
          actorUserId: kanbanSessionUserId,
          dueYmd: ymd,
        });
      }
    },
    [appState, activityActorLabel, kanbanSessionUserId],
  );

  const applyCardUrgentFromList = useCallback(
    (cardId: string, _homeBoardId: string, urgent: boolean) => {
      if (!appState) return;
      setAppState((s) => {
        if (!s) return s;
        const next = structuredClone(s);
        const found = findCardInAppState(next, cardId);
        if (!found) return s;
        const b = next.boards.find((x) => x.id === found.board.id);
        if (!b) return s;
        const fc = findCard(b, cardId);
        if (!fc) return s;
        fc.card.urgent = urgent;
        pushActivity(
          fc.card,
          urgent ? "Отмечена как срочная" : "Снята метка «Срочно»",
          b.users[0]?.id,
          b,
          activityActorLabel,
        );
        syncProductionChecklistSnapshotsAcrossBoards(next.boards);
        return next;
      });
    },
    [appState, activityActorLabel],
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

  const reloadKanbanStateFromTenant = useCallback(async () => {
    if (isDemo) return;
    if (kanbanStateSaveTimerRef.current) {
      clearTimeout(kanbanStateSaveTimerRef.current);
      kanbanStateSaveTimerRef.current = null;
    }
    const remote = await readClientState<unknown>("tenant", "kanbanAppStateV3");
    if (!remote || typeof remote !== "object") return;
    setAppState((prev) => {
      if (!prev) return prev;
      const merged = applyKanbanCardTypeLanes(
        mergeKanbanStatePreservingLocalBoards(prev, remote as KanbanAppState),
        lastCardTypeLanesRef.current,
      );
      const finalState = applyPendingKanbanColumnMoves(
        applyKanbanLegacyStageDueClearMigration(merged).state,
        listPendingKanbanColumnMoves(),
      );
      saveKanbanState(finalState, false);
      return finalState;
    });
  }, [isDemo]);

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
          archivedCount += out.archivedCount + applyKanbanAutomationDelayedArchives(b);
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
      persistCrmBoardFieldsClient({
        orderId: args.orderId,
        columnTitle: args.columnTitle?.trim() || null,
        sortOrder: args.sortOrder,
        trackLane: args.kaitenTrackLane ?? null,
      });
      /* UI уже обновлён локально — Kaiten в фоне; защищаем merge от отката. */
      if (args.columnTitle?.trim()) {
        rememberCrmKanbanColumnLocal({
          cardId: args.orderId,
          orderId: args.orderId,
          columnTitle: args.columnTitle.trim(),
        });
      }
      optimisticKaitenColumnMovesRef.current.set(args.orderId, {
        columnTitle: args.columnTitle,
        sortOrder: args.sortOrder,
        ...(args.kaitenTrackLane != null
          ? { kaitenTrackLane: args.kaitenTrackLane }
          : {}),
        until: Date.now() + 45_000,
      });
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
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
          kaitenIntegrationEnabled?: boolean;
        };
        if (!res.ok) {
          if (isKaitenIntegrationDisabledResponse(res.status, data)) {
            return;
          }
          showToast(
            data.error ??
              "Не удалось перенести карточку в Kaiten (проверьте название колонки на доске).",
            true,
          );
          return;
        }
        /* UI уже в новой колонке; pending держим, пока плитка CRM не подтвердит. */
        optimisticKaitenColumnMovesRef.current.set(args.orderId, {
          columnTitle: args.columnTitle,
          sortOrder: args.sortOrder,
          ...(args.kaitenTrackLane != null
            ? { kaitenTrackLane: args.kaitenTrackLane }
            : {}),
          until: Date.now() + 12_000,
        });
      } catch {
        showToast("Сеть: колонка в Kaiten могла не обновиться", true);
      }
    },
    [showToast, syncKanbanMirrorFromApi],
  );

  const handleAggregateCardDrag = useCallback(
    (drag: AggregateCardDragArgs) => {
      if (!kanbanCardPerms.moveColumns) {
        showToast("Нет права перемещать карточки по колонкам", true);
        return;
      }
      let kaitenFollowUp:
        | {
            orderId: string;
            kaitenCardId: number;
            columnTitle?: string;
            kaitenTrackLane?: KaitenTrackLane;
            sortOrder: number;
          }
        | undefined;
      let crmPersistFollowUp:
        | {
            orderId: string;
            columnTitle: string;
            sortOrder?: number;
          }
        | undefined;
      let moveFromTitle = "";
      let moveToTitle = "";
      setAppState((s) => {
        if (!s || !isKanbanAggregateBoardId(s.activeBoardId)) return s;
        const view = buildKanbanDisplayView(s, {
          sessionUserId: kanbanSessionUserId,
          sessionUserRole: kanbanSessionRole,
          stickyLinkedOrderIds,
          memberHeads: loadKanbanCardHeadsCache(),
        });
        const next = structuredClone(s);
        const sid = kanbanSessionUserId?.trim();
        const activityUserId =
          sid ||
          getActiveBoard(s).users[0]?.id ||
          s.boards.find((b) => !isKanbanAggregateBoardId(b.id))?.users[0]?.id ||
          "";
        const fromDisp = view.displayBoard.columns.find(
          (c) => c.id === drag.fromDisplayColId,
        );
        const toDisp = view.displayBoard.columns.find(
          (c) => c.id === drag.toDisplayColId,
        );
        const res = applyAggregateCardDrag(
          next,
          view.displayBoard,
          view.cardHomeBoardId,
          drag,
          { activityUserId, activityActorLabel, sessionUserId: kanbanSessionUserId },
        );
        if (!res.ok) return s;
        if (res.kaiten) kaitenFollowUp = res.kaiten;
        if (res.crmPersist) crmPersistFollowUp = res.crmPersist;
        moveFromTitle = fromDisp?.title || "";
        moveToTitle = toDisp?.title || res.crmPersist?.columnTitle || res.kaiten?.columnTitle || "";
        return isDemo ? normalizeDemoKanbanAppState(next) : next;
      });
      if (!isDemo && crmPersistFollowUp) {
        rememberCrmKanbanColumnLocal({
          cardId: drag.cardId,
          orderId: crmPersistFollowUp.orderId,
          columnTitle: crmPersistFollowUp.columnTitle,
        });
        persistCrmBoardFieldsClient({
          orderId: crmPersistFollowUp.orderId,
          columnTitle: crmPersistFollowUp.columnTitle,
          ...(crmPersistFollowUp.sortOrder != null
            ? { sortOrder: crmPersistFollowUp.sortOrder }
            : {}),
        });
      }
      if (!isDemo && kaitenFollowUp) {
        void syncKaitenMirrorAfterKanbanMove(kaitenFollowUp);
      }
      if (!isDemo && moveToTitle) {
        const loc = appState
          ? findCardInAppState(appState, drag.cardId)
          : null;
        if (loc) {
          notifyKanbanColumnTelegram(
            loc.card,
            loc.board.id,
            moveFromTitle,
            moveToTitle,
            activityActorLabel,
          );
        }
      }
    },
    [
      kanbanSessionUserId,
      kanbanSessionRole,
      stickyLinkedOrderIds,
      activityActorLabel,
      isDemo,
      appState,
      kanbanCardPerms.moveColumns,
      showToast,
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
    lastRealBoardIdRef.current = appState.activeBoardId;
  }, [appState]);

  const activateAggregateBoard = useCallback(
    (targetId: string, toast: string) => {
      if (!appState) return;
      if (appState.activeBoardId === targetId) {
        const nextId = boardIdAfterLeavingKanbanAggregate(
          lastRealBoardIdRef.current,
          visibleBoards.map((b) => b.id),
        );
        if (!nextId) return;
        patchApp((s) => {
          s.activeBoardId = nextId;
        });
        const label = appState.boards.find((x) => x.id === nextId)?.title;
        showToast(label ? `Доска: ${label}` : "Доска");
        return;
      }
      if (!isKanbanAggregateBoardId(appState.activeBoardId)) {
        lastRealBoardIdRef.current = appState.activeBoardId;
      }
      patchApp((s) => {
        s.activeBoardId = targetId;
      });
      showToast(toast);
    },
    [appState, visibleBoards, patchApp, showToast],
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

  useEffect(() => {
    if (!appState || !cardModalId || isDemo) return;
    const loc = findCardInAppState(appState, cardModalId);
    if (!loc) return;
    if (canUserAccessBoard(loc.board, kanbanSessionUserId, kanbanSessionRole)) {
      return;
    }
    setCardModalId(null);
  }, [appState, cardModalId, isDemo, kanbanSessionUserId, kanbanSessionRole]);

  const aggregateView =
    Boolean(appState) && isKanbanAggregateBoardId(appState!.activeBoardId);
  const dndLockedByPerms = Boolean(appState && !kanbanCardPerms.moveColumns);
  const dndLockedByActual = Boolean(appState && actualOn);
  const dndLocked = dndLockedByPerms || dndLockedByActual;

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
    const linkedOrderId = found.card.linkedOrderId?.trim() || "";
    const kaitenCardId = found.card.kaitenCardId;
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
      if (!isDemo && canPersistTenantKanban(next)) {
        void writePersistedKanbanStateNow(next, false);
      }
      return next;
    });
    if (cardModalId === cardId) setCardModalId(null);
    showToast(`Карточка «${titleSnapshot}» перемещена в СТОП`);
    if (linkedOrderId) {
      clearPendingKanbanColumnMove(linkedOrderId);
      persistCrmBoardFieldsClient({
        orderId: linkedOrderId,
        columnTitle: "СТОП",
      });
    }
    if (
      !isDemo &&
      linkedOrderId &&
      typeof kaitenCardId === "number" &&
      Number.isFinite(kaitenCardId)
    ) {
      void (async () => {
        try {
          const res = await fetch(`/api/orders/${linkedOrderId}/kaiten`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ moveToStop: true }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            code?: string;
            kaitenIntegrationEnabled?: boolean;
          };
          if (!res.ok) {
            if (isKaitenIntegrationDisabledResponse(res.status, data)) {
              return;
            }
            showToast(
              data.error ??
                "В CRM карточка в СТОП, но в Kaiten дорожку «СТОП» обновить не удалось.",
              true,
            );
          }
        } catch {
          showToast(
            "В CRM карточка в СТОП, но сеть до Kaiten недоступна.",
            true,
          );
        }
      })();
    }
  };

  const restoreStoppedCard = (stoppedId: string) => {
    if (!appState) return;
    const home =
      appState.boards.find((b) =>
        (b.stoppedCards || []).some((x) => x.id === stoppedId || x.card.id === stoppedId),
      ) ?? getActiveBoard(appState);
    const stoppedRow = (home.stoppedCards || []).find(
      (x) => x.id === stoppedId || x.card.id === stoppedId,
    );
    const linkedOrderId = stoppedRow?.card.linkedOrderId?.trim() || "";
    const kaitenCardId = stoppedRow?.card.kaitenCardId;
    const sourceColumnTitle = (stoppedRow?.sourceColumnTitle || "").trim();
    const trackLane = kaitenLaneForKanbanBoardId(home.id) ?? "ORTHOPEDICS";
    setAppState((s) => {
      if (!s) return s;
      const next = structuredClone(s);
      const b = next.boards.find((x) => x.id === home.id) ?? getActiveBoard(next);
      const ok = restoreStoppedCardOnBoard(b, stoppedId);
      if (!ok) return s;
      syncProductionChecklistSnapshotsAcrossBoards(next.boards);
      if (!isDemo && canPersistTenantKanban(next)) {
        void writePersistedKanbanStateNow(next, false);
      }
      return next;
    });
    showToast("Карточка возвращена из СТОП");
    if (linkedOrderId && sourceColumnTitle) {
      persistCrmBoardFieldsClient({
        orderId: linkedOrderId,
        columnTitle: sourceColumnTitle,
      });
    }
    if (linkedOrderId && sourceColumnTitle) {
      rememberCrmKanbanColumnLocal({
        cardId: linkedOrderId,
        orderId: linkedOrderId,
        columnTitle: sourceColumnTitle,
      });
    }
    if (
      !isDemo &&
      linkedOrderId &&
      typeof kaitenCardId === "number" &&
      Number.isFinite(kaitenCardId) &&
      sourceColumnTitle
    ) {
      void (async () => {
        try {
          const res = await fetch(`/api/orders/${linkedOrderId}/kaiten`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              kaitenTrackLane: trackLane,
              columnTitle: sourceColumnTitle,
            }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            code?: string;
            kaitenIntegrationEnabled?: boolean;
          };
          if (!res.ok) {
            if (isKaitenIntegrationDisabledResponse(res.status, data)) {
              return;
            }
            clearPendingKanbanColumnMove(linkedOrderId);
            showToast(
              data.error ??
                "В CRM карточка возвращена, но колонку в Kaiten обновить не удалось.",
              true,
            );
          } else {
            clearPendingKanbanColumnMove(linkedOrderId);
          }
        } catch {
          clearPendingKanbanColumnMove(linkedOrderId);
          showToast(
            "В CRM карточка возвращена, но сеть до Kaiten недоступна.",
            true,
          );
        }
      })();
    }
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
    const locBefore = findCardInAppState(appState, moveCardId);
    const titleSnapshot = locBefore?.card.title ?? "карточка";
    const linkedOrderId = locBefore?.card.linkedOrderId?.trim() || "";
    const kaitenCardId = locBefore?.card.kaitenCardId;
    const targetLane = kaitenLaneForKanbanBoardId(moveTargetBoardId);
    const tgtBoard = appState.boards.find((b) => b.id === moveTargetBoardId);
    const targetColTitle = (tgtBoard?.columns[0]?.title || "").trim();
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
      if (targetLane) extracted.trackLane = targetLane;
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
    if (
      !isDemo &&
      linkedOrderId &&
      typeof kaitenCardId === "number" &&
      Number.isFinite(kaitenCardId) &&
      (targetLane || targetColTitle)
    ) {
      void syncKaitenMirrorAfterKanbanMove({
        orderId: linkedOrderId,
        kaitenCardId,
        columnTitle: targetColTitle || undefined,
        kaitenTrackLane: targetLane,
        sortOrder: 1,
      });
    }
  };

  const moveCardToNextStage = (cardId: string) => {
    if (!kanbanCardPerms.moveColumns) {
      showToast("Нет права перемещать карточки по колонкам", true);
      return;
    }
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
      annulKanbanStageTimerOnMemberAdvance(
        c,
        colIdx,
        colIdx + 1,
        kanbanSessionUserId,
        b,
        activityActorLabel,
      );
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
        if (parentCanMoveToAssembly(b, movedCard.parentCardId, next.boards)) {
          moveParentToAssemblyIfReady(
            b,
            movedCard.parentCardId,
            activityActorLabel,
            next.boards,
          );
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
    if (!isDemo && cardSnapshot.linkedOrderId) {
      rememberCrmKanbanColumnLocal({
        cardId,
        orderId: cardSnapshot.linkedOrderId,
        columnTitle: nextTitle,
      });
      persistCrmBoardFieldsClient({
        orderId: cardSnapshot.linkedOrderId,
        columnTitle: nextTitle,
        sortOrder,
      });
    }
    if (!isDemo) {
      notifyKanbanColumnTelegram(
        cardSnapshot,
        home.id,
        found.col.title,
        nextTitle,
        activityActorLabel,
      );
    }
    showToast(`Этап: «${nextTitle}»`);
  };

  const moveCardToPrevStage = (cardId: string) => {
    if (!kanbanCardPerms.moveColumns) {
      showToast("Нет права перемещать карточки по колонкам", true);
      return;
    }
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
      annulKanbanStageTimerOnMemberAdvance(
        c,
        colIdx,
        colIdx - 1,
        kanbanSessionUserId,
        b,
        activityActorLabel,
      );
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
    if (!isDemo && cardSnapshot.linkedOrderId) {
      rememberCrmKanbanColumnLocal({
        cardId,
        orderId: cardSnapshot.linkedOrderId,
        columnTitle: prevTitle,
      });
      persistCrmBoardFieldsClient({
        orderId: cardSnapshot.linkedOrderId,
        columnTitle: prevTitle,
        sortOrder,
      });
    }
    if (!isDemo) {
      notifyKanbanColumnTelegram(
        cardSnapshot,
        home.id,
        found.col.title,
        prevTitle,
        activityActorLabel,
      );
    }
    showToast(`Этап: «${prevTitle}»`);
  };

  const moveCardToColumn = useCallback(
    (cardId: string, targetColumnId: string) => {
      if (!kanbanCardPerms.moveColumns) {
        showToast("Нет права перемещать карточки по колонкам", true);
        return;
      }
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
        const fromIdx = b.columns.findIndex((col) => col.id === loc.col.id);
        const toIdx = b.columns.findIndex((col) => col.id === toCol.id);
        annulKanbanStageTimerOnMemberAdvance(
          c,
          fromIdx,
          toIdx,
          kanbanSessionUserId,
          b,
          activityActorLabel,
        );
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
          if (parentCanMoveToAssembly(b, c.parentCardId, next.boards)) {
            moveParentToAssemblyIfReady(
              b,
              c.parentCardId,
              activityActorLabel,
              next.boards,
            );
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
      if (!isDemo && cardSnapshot.linkedOrderId) {
        persistCrmBoardFieldsClient({
          orderId: cardSnapshot.linkedOrderId,
          columnTitle: targetCol.title,
          sortOrder,
          trackLane: kaitenLaneForKanbanBoardId(home.id),
        });
      }
      if (!isDemo) {
        notifyKanbanColumnTelegram(
          cardSnapshot,
          home.id,
          found.col.title,
          targetCol.title,
          activityActorLabel,
        );
      }
      showToast(`Этап: «${targetCol.title}»`);
    },
    [appState, activityActorLabel, isDemo, kanbanCardPerms.moveColumns, kanbanSessionUserId, showToast, syncKaitenMirrorAfterKanbanMove],
  );

  const moveCardToTrackLane = useCallback(
    (cardId: string, lane: string) => {
      if (!kanbanCardPerms.editTrack) {
        showToast("Нет права менять положение на доске", true);
        return;
      }
      if (!appState) return;
      const found = findCardInAppState(appState, cardId);
      if (!found) return;
      const cardSnapshot = found.card;
      let moved: { columnTitle: string; sortOrder: number } | undefined;
      setAppState((s) => {
        if (!s) return s;
        const next = structuredClone(s);
        const sid = kanbanSessionUserId?.trim();
        const activityUserId =
          sid ||
          getActiveBoard(s).users[0]?.id ||
          s.boards.find((b) => !isKanbanAggregateBoardId(b.id))?.users[0]?.id ||
          "";
        const res = applyKanbanCardTrackLaneChange(next, cardId, lane, {
          activityUserId,
          activityActorLabel,
        });
        if (!res.ok) return s;
        moved = { columnTitle: res.columnTitle, sortOrder: res.sortOrder };
        return isDemo ? normalizeDemoKanbanAppState(next) : next;
      });
      if (!moved) return;
      if (
        !isDemo &&
        cardSnapshot.linkedOrderId &&
        typeof cardSnapshot.kaitenCardId === "number" &&
        Number.isFinite(cardSnapshot.kaitenCardId)
      ) {
        const kaitenTrackLane: KaitenTrackLane =
          lane === "ORTHODONTICS" ? "ORTHODONTICS" : "ORTHOPEDICS";
        void syncKaitenMirrorAfterKanbanMove({
          orderId: cardSnapshot.linkedOrderId,
          kaitenCardId: cardSnapshot.kaitenCardId,
          columnTitle: moved.columnTitle,
          kaitenTrackLane,
          sortOrder: moved.sortOrder,
        });
      }
      showToast(
        `Доска: «${lane === "ORTHODONTICS" ? "Ортодонтия" : "Ортопедия"}»`,
      );
    },
    [
      appState,
      activityActorLabel,
      isDemo,
      kanbanCardPerms.editTrack,
      kanbanSessionUserId,
      showToast,
      syncKaitenMirrorAfterKanbanMove,
    ],
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

  if (!appState || !board || !viewBoard) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden bg-[var(--kanban-workspace-bg)] text-[var(--kanban-text-muted)]">
        <span className="text-[0.95rem]">Загрузка доски…</span>
      </div>
    );
  }

  return (
    <KanbanCrmUsersProvider>
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--kanban-workspace-bg)] text-[var(--kanban-text)]">
      <header className="flex max-w-full shrink-0 flex-col gap-1.5 border-b border-[var(--kanban-border)] bg-[var(--kanban-rail-bg)] px-2 py-1.5 shadow-[0_1px_0_rgba(0,0,0,0.03)] sm:gap-2 sm:px-4 sm:py-2.5">
        <div className="flex min-w-0 max-w-full items-center gap-1.5 sm:gap-2">
          <div className="relative max-md:ms-[var(--app-mobile-menu-inset,3.875rem)] md:ms-0">
            <select
              className="inline-flex min-h-[2.25rem] max-w-[min(42vw,11rem)] appearance-none truncate rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] py-1 pl-1.5 pr-6 text-[0.68rem] font-semibold leading-tight text-[var(--kanban-text)] sm:min-h-[2.75rem] sm:max-w-[14rem] sm:py-2 sm:pl-3 sm:pr-7 sm:text-[0.8125rem] md:max-w-[16rem] md:text-[0.875rem]"
              value={
                isKanbanAggregateBoardId(appState.activeBoardId)
                  ? ""
                  : appState.activeBoardId
              }
              aria-label="Выбор доски"
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                lastRealBoardIdRef.current = id;
                patchApp((s) => {
                  s.activeBoardId = id;
                });
                const label = appState.boards.find((x) => x.id === id)?.title;
                if (label) showToast(`Доска: ${label}`);
              }}
            >
              {isKanbanAggregateBoardId(appState.activeBoardId) ? (
                <option value="" disabled>
                  {appState.activeBoardId === KANBAN_BOARD_MY_CARDS_ID
                    ? "Мои"
                    : "Ответственный"}
                </option>
              ) : null}
              {visibleBoards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--kanban-text-muted)] sm:right-2 sm:h-3.5 sm:w-3.5"
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div
            className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-1.5"
            role="group"
            aria-label="Вид доски"
          >
            <KanbanViewModePicker
              viewMode={appState.viewMode}
              onChange={(mode) => patchApp((s) => (s.viewMode = mode))}
            />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col max-sm:overflow-y-auto max-sm:overscroll-y-contain sm:overflow-hidden">
          <div className="relative z-20 flex max-w-full shrink-0 flex-wrap items-center gap-1.5 border-b border-[var(--kanban-border)] bg-[var(--kanban-rail-bg)] px-2 py-1.5 sm:gap-2.5 sm:px-4 sm:py-2.5">
            <div
              className="flex shrink-0 items-center gap-1 sm:gap-1.5"
              role="group"
              aria-label="Виртуальные доски"
            >
              <button
                type="button"
                className={`rounded-full border px-1.5 py-1 text-[0.55rem] font-bold uppercase tracking-wide transition-colors sm:px-3 sm:py-1.5 sm:text-[0.62rem] md:px-3.5 md:py-2 md:text-[0.68rem] ${
                  appState.activeBoardId === KANBAN_BOARD_MY_CARDS_ID
                    ? "border-[var(--kanban-text)] bg-black/[0.08] text-[var(--kanban-text)] dark:bg-white/[0.12]"
                    : "border-[var(--kanban-border)] text-[var(--kanban-text-muted)] hover:border-[var(--kanban-text)]/35 hover:text-[var(--kanban-text)]"
                }`}
                onClick={() => activateAggregateBoard(KANBAN_BOARD_MY_CARDS_ID, "Доска: Мои")}
              >
                Мои
              </button>
              <button
                type="button"
                className={`rounded-full border px-1.5 py-1 text-[0.55rem] font-bold uppercase tracking-wide transition-colors sm:px-3 sm:py-1.5 sm:text-[0.62rem] md:px-3.5 md:py-2 md:text-[0.68rem] ${
                  appState.activeBoardId === KANBAN_BOARD_DISTRIBUTE_ID
                    ? "border-[var(--kanban-text)] bg-black/[0.08] text-[var(--kanban-text)] dark:bg-white/[0.12]"
                    : "border-[var(--kanban-border)] text-[var(--kanban-text-muted)] hover:border-[var(--kanban-text)]/35 hover:text-[var(--kanban-text)]"
                }`}
                title="Ответственный"
                onClick={() =>
                  activateAggregateBoard(KANBAN_BOARD_DISTRIBUTE_ID, "Доска: Ответственный")
                }
              >
                <span className="sm:hidden">отвст</span>
                <span className="hidden sm:inline">Ответственный</span>
              </button>
            </div>
            <input
              type="search"
              placeholder="Поиск…"
              value={appState.search}
              onChange={(e) =>
                patchApp((s) => {
                  s.search = e.target.value;
                })
              }
              className="min-h-[2.25rem] min-w-0 flex-1 basis-[6.5rem] rounded-lg border border-[var(--kanban-border)] bg-[var(--kanban-workspace-bg)] px-2 py-1.5 text-[0.8125rem] text-[var(--kanban-text)] placeholder:text-[var(--kanban-text-muted)] dark:bg-[#262626] sm:min-h-[2.75rem] sm:max-w-[320px] sm:flex-[1_1_12rem] sm:basis-auto sm:px-3 sm:py-2 sm:text-base md:text-[0.875rem]"
            />
            <KanbanFilterQuickAccess
              templates={appState.filterTemplates ?? []}
              filters={appState.filters}
              patchApp={patchApp}
            />
            <KanbanFiltersButton
              board={board}
              filters={appState.filters}
              filterTemplates={appState.filterTemplates ?? []}
              patchApp={patchApp}
              showToast={showToast}
            />
            {!stopOpen &&
            (appState.viewMode === "board" || appState.viewMode === "list") ? (
              <KanbanViewSortSelect
                pref={viewSort}
                showBoardManual={appState.viewMode === "board"}
                onChange={persistViewSort}
              />
            ) : null}
            <div className="contents">
            {actualFilterAvailable ? (
              <button
                type="button"
                className={`inline-flex h-9 shrink-0 items-center justify-center rounded-md border px-2 text-[0.68rem] font-semibold shadow-sm transition-[transform,box-shadow,background-color,border-color,color] duration-100 hover:brightness-[0.98] dark:hover:brightness-110 sm:px-3 sm:text-[0.8125rem] ${
                  actualOn
                    ? "border-white/70 bg-white text-black ring-2 ring-white/70"
                    : "border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] text-[var(--kanban-text)]"
                }`}
                title="Карточки с датой записи как в заказах: сегодня … +2 рабочих дня (МСК). Только эта доска."
                aria-pressed={actualOn}
                onClick={() =>
                  setActualAppointmentBoardId((cur) =>
                    cur === board.id ? null : board.id,
                  )
                }
              >
                Актуальное
              </button>
            ) : null}
            {showKanbanKaitenRefreshButton({
              isDemo,
              kaitenIntegrationActive,
            }) &&
            (kanbanCardPerms.manageAssignees || kanbanCardPerms.manageParticipants) ? (
              <KanbanMembersBackfillButton
                refreshTargets={collectKanbanKaitenRefreshTargets(
                  appState,
                  board.id,
                )}
                onBeforeRefresh={async () => {
                  if (isDemo) return;
                  const cur = appStateRef.current;
                  if (!cur) return;
                  if (kanbanStateSaveTimerRef.current) {
                    clearTimeout(kanbanStateSaveTimerRef.current);
                    kanbanStateSaveTimerRef.current = null;
                  }
                  if (!canPersistTenantKanban(cur)) return;
                  await writePersistedKanbanStateNow(cur, false);
                }}
                onRunningChange={(running) => {
                  kanbanPersistPausedRef.current = running;
                  if (running && kanbanStateSaveTimerRef.current) {
                    clearTimeout(kanbanStateSaveTimerRef.current);
                    kanbanStateSaveTimerRef.current = null;
                  }
                }}
                onComplete={async (patches) => {
                  persistCrmBoardFieldsFromKaitenRefreshPatches(patches);
                  for (const p of patches) {
                    const oid = String(p.linkedOrderId || "").trim();
                    const title = (p.columnTitle || "").trim();
                    if (oid && title) {
                      commitKanbanColumnFromKaitenRefresh({
                        cardId: p.cardId,
                        orderId: oid,
                        columnTitle: title,
                      });
                    }
                  }
                  if (patches.length > 0) {
                    setAppState((prev) => {
                      if (!prev) return prev;
                      const { state } = applyKaitenRefreshPatchesToState(
                        prev,
                        patches,
                      );
                      saveKanbanState(state, false);
                      if (!isDemo && canPersistTenantKanban(state)) {
                        writePersistedKanbanState(state, false);
                      }
                      return state;
                    });
                    return;
                  }
                  await reloadKanbanStateFromTenant();
                }}
                showToast={showToast}
              />
            ) : null}
            <button
              id="kanban-stop-drop-target"
              type="button"
              className={`inline-flex h-9 shrink-0 items-center justify-center rounded-md border px-2 text-[0.68rem] font-extrabold tracking-wide shadow-sm transition-[transform,box-shadow,background-color,border-color,color] duration-100 hover:brightness-[0.98] dark:hover:brightness-110 sm:px-3 sm:text-[0.8125rem] ${
                stopOpen
                  ? "border-white/70 bg-white text-black ring-2 ring-white/70"
                  : "border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] text-[var(--kanban-text)]"
              }`}
              title={
                stopOpen || stoppedCards.length > 0
                  ? undefined
                  : "Перетащите карточку сюда или нажмите, чтобы открыть СТОП"
              }
              onClick={() => {
                setStopHoverPreview(null);
                setStopOpen((v) => !v);
              }}
              onMouseMove={onStopHoverMove}
              onMouseLeave={() => setStopHoverPreview(null)}
            >
              СТОП {stoppedCards.length}
            </button>
            {showStopHoverPreview && stopHoverPreviewPos && typeof document !== "undefined"
              ? createPortal(
                  <div
                    className="pointer-events-none fixed z-[200] w-72 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 text-xs leading-5 text-[var(--text-body)] shadow-xl"
                    style={{
                      left: stopHoverPreviewPos.left,
                      top: stopHoverPreviewPos.top,
                      width: STOP_HOVER_PREVIEW_WIDTH,
                    }}
                    role="tooltip"
                  >
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      СТОП · {stoppedCards.length}
                    </p>
                    {stopHoverPreviewItems.length === 0 ? (
                      <p className="text-[var(--text-muted)]">
                        Пусто. Перетащите карточку сюда или откройте список.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {stopHoverPreviewItems.map((row) => (
                          <li
                            key={row.id}
                            className="line-clamp-2 break-words font-medium text-[var(--text-body)]"
                          >
                            {(row.card.title || "").trim() || "Без названия"}
                            {row.sourceColumnTitle ? (
                              <span className="mt-0.5 block text-[11px] font-normal text-[var(--text-muted)]">
                                Было: {row.sourceColumnTitle}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                    {stopHoverPreviewExtra > 0 ? (
                      <p className="mt-2 border-t border-[var(--card-border)] pt-2 text-[11px] font-semibold text-[var(--text-muted)]">
                        ещё {stopHoverPreviewExtra}
                      </p>
                    ) : null}
                  </div>,
                  document.body,
                )
              : null}
            <button
              type="button"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-md border border-[var(--kanban-border)] bg-[var(--kanban-column-bg)] px-2 text-[0.68rem] font-medium text-[var(--kanban-text)] hover:brightness-[0.98] dark:hover:brightness-110 sm:px-3 sm:text-[0.8125rem]"
              title={`Архив (${archivedCards.length})`}
              aria-label={`Архив (${archivedCards.length})`}
              onClick={() => setArchiveOpen(true)}
            >
              <IconArchiveBox className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Архив ({archivedCards.length})</span>
              <span className="tabular-nums sm:hidden">{archivedCards.length}</span>
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
            {appState.search.trim() ? (
              <span className="text-[0.75rem] text-[var(--kanban-text-muted)]">
                Найдено{" "}
                {(viewBoard?.columns ?? []).reduce(
                  (n, c) => n + c.cards.length,
                  0,
                ) + stoppedCards.length}
              </span>
            ) : actualOn ? (
              <span className="text-[0.75rem] text-[var(--kanban-text-muted)]">
                Актуальное: ближайшие записи сверху, карточки не скрываются
              </span>
            ) : null}
            {dndLocked && (
              <span className="text-[0.75rem] text-amber-700 dark:text-amber-300">
                {dndLockedByPerms
                  ? "Перетаскивание карточек отключено: нет права «перемещать по колонкам»"
                  : "Перетаскивание карточек отключено в режиме «Актуальное»"}
              </span>
            )}
              </div>
          </div>

          <div
            className={`flex min-h-0 min-w-0 flex-col ${
              !stopOpen && appState.viewMode === "list"
                ? "max-sm:flex-none max-sm:overflow-visible sm:min-h-0 sm:flex-1 sm:overflow-hidden"
                : "min-h-0 flex-1 overflow-hidden"
            }`}
          >
          {stopOpen ? (
            <KanbanStopView
              board={board}
              stoppedCards={stoppedCards}
              resolveHomeBoard={resolveStoppedCardHomeBoard}
              onOpenCard={openKanbanCard}
              onRestore={restoreStoppedCard}
            />
          ) : appState.viewMode === "board" ? (
            <BoardCanvas
              appState={appState}
              board={viewBoard}
              columnSort={boardColumnSortFromViewPref(viewSort)}
              resolveCardHomeBoard={resolveCardHomeBoard}
              activityActorLabel={activityActorLabel}
              sessionUserId={kanbanSessionUserId}
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
              onRequestStopCard={kanbanCardPerms.stop ? stopCard : undefined}
              onRequestDeleteCard={kanbanCardPerms.deleteCard ? deleteCard : () => {}}
              allowMoveToOtherBoard={
                appState.boards.length > 1 && kanbanCardPerms.moveToOtherBoard
              }
              onLinkedOrderMovedToKaitenMirror={
                isDemo
                  ? undefined
                  : (args) => {
                      void syncKaitenMirrorAfterKanbanMove({
                        ...args,
                        kaitenTrackLane: kaitenLaneForKanbanBoardId(board.id),
                      });
                    }
              }
              onCardColumnChanged={({ cardId, fromColumnId, toColumnId }) => {
                const locNow = appState
                  ? findCardInAppState(appState, cardId)
                  : null;
                const toColNow = locNow?.board.columns.find(
                  (c) => c.id === toColumnId,
                );
                const fromColNow = locNow?.board.columns.find(
                  (c) => c.id === fromColumnId,
                );
                if (!isDemo && locNow && toColNow) {
                  notifyKanbanColumnTelegram(
                    locNow.card,
                    locNow.board.id,
                    fromColNow?.title || "",
                    toColNow.title,
                    activityActorLabel,
                  );
                }
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
                  rememberCrmKanbanColumnLocal({
                    cardId,
                    orderId: card.linkedOrderId ?? undefined,
                    toColumnId,
                    columnTitle: toCol.title,
                  });
                  const columnPersist = crmColumnPersistFromLinkedMove({
                    linkedOrderId: card.linkedOrderId,
                    columnTitle: toCol.title,
                  });
                  if (!isDemo && columnPersist) {
                    persistCrmBoardFieldsClient(columnPersist);
                  }
                  if (card.linkedOrderId) persistKanbanLinkedCardTimer(card);
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
                  queueMicrotask(() => {
                    if (isDemo || kanbanPersistPausedRef.current) return;
                    if (!canPersistTenantKanban(next)) return;
                    writePersistedKanbanState(next, false);
                  });
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
              board={viewBoard}
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
              board={viewBoard}
              sort={listSortFromViewPref(viewSort)}
              onSortChange={persistViewSort}
              cardHomeBoardId={cardHomeBoardId}
              onAdvanceCardColumn={
                kanbanCardPerms.moveColumns ? moveCardToNextStage : undefined
              }
              canManageAssignees={kanbanCardPerms.manageAssignees}
              canManageParticipants={kanbanCardPerms.manageParticipants}
              onUpdateCardMembers={applyCardMembersFromList}
              canEditDueDate={kanbanCardPerms.editDueDate}
              onUpdateStageDue={applyCardStageDueFromList}
              onToggleUrgent={applyCardUrgentFromList}
              onCopyCardLink={copyCardLink}
              canManageKanbanBlock={canManageKanbanBlock}
              onRequestKanbanBlock={(cardId) => {
                setListExpandedCardId(cardId);
                const loc = findCardInAppState(appState, cardId);
                if (loc && !loc.card.blocked) {
                  setListAutoOpenBlock(true);
                }
              }}
              expandedCardId={listExpandedCardId}
              onExpandedCardIdChange={setListExpandedCardId}
              renderExpandedCard={(cardId) => (
                <KanbanCardModal
                  embed
                  cardId={cardId}
                  board={
                    findCardInAppState(appState, cardId)?.board ??
                    modalBoard ??
                    board
                  }
                  allBoards={appState.boards}
                  activityActorLabel={activityActorLabel}
                  commentAuthorUserId={kanbanSessionUserId ?? undefined}
                  sessionUserRole={kanbanSessionRole}
                  onClose={() => setListExpandedCardId(null)}
                  onApply={applyModalBoard}
                  toast={showToast}
                  onMovePrevStage={(id) => {
                    moveCardToPrevStage(id);
                    setListExpandedCardId(id);
                  }}
                  onMoveNextStage={(id) => {
                    moveCardToNextStage(id);
                    setListExpandedCardId(id);
                  }}
                  onMoveToColumn={
                    kanbanCardPerms.moveColumns
                      ? (id, targetColumnId) => {
                          moveCardToColumn(id, targetColumnId);
                          setListExpandedCardId(id);
                        }
                      : undefined
                  }
                  onRequestStopCard={
                    kanbanCardPerms.stop
                      ? (id) => {
                          stopCard(id);
                        }
                      : undefined
                  }
                  onChangeTrackLane={
                    isDemo
                      ? undefined
                      : (id, lane) => {
                          moveCardToTrackLane(id, lane);
                          setListExpandedCardId(id);
                        }
                  }
                  onCopyCardLink={copyCardLink}
                  canMoveColumns={kanbanCardPerms.moveColumns}
                  canEditTitle={kanbanCardPerms.editTitle}
                  canEditDueDate={kanbanCardPerms.editDueDate}
                  canEditTrack={kanbanCardPerms.editTrack}
                  canManageAssignees={kanbanCardPerms.manageAssignees}
                  canManageParticipants={kanbanCardPerms.manageParticipants}
                  canManageKanbanChecklist={kanbanCardPerms.manageKanbanChecklist}
                  canManageKanbanTimer={kanbanCardPerms.manageKanbanTimer}
                  canAttachFiles={kanbanCardPerms.attachFiles}
                  canManageKanbanBlock={canManageKanbanBlock}
                  autoOpenBlock={listAutoOpenBlock}
                  onAutoOpenBlockConsumed={() => setListAutoOpenBlock(false)}
                  onOpenLinkedCard={(id) => {
                    setListExpandedCardId(null);
                    setCardModalOrigin(null);
                    setCardModalId(id);
                  }}
                  onParentProductionFilesUpdated={
                    syncParentProductionChildrenAfterFilesAttach
                  }
                  isDemo={isDemo}
                />
              )}
            />
          )}
          </div>
          </div>
      </div>

      <KanbanCardModal
        cardId={cardModalId}
        board={modalBoard ?? board}
        allBoards={appState.boards}
        activityActorLabel={activityActorLabel}
        commentAuthorUserId={kanbanSessionUserId ?? undefined}
        sessionUserRole={kanbanSessionRole}
        onClose={closeKanbanCard}
        openOrigin={cardModalOrigin}
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
        onMoveToColumn={
          kanbanCardPerms.moveColumns
            ? (id, targetColumnId) => {
                moveCardToColumn(id, targetColumnId);
                setCardModalId(id);
              }
            : undefined
        }
        onRequestStopCard={
          kanbanCardPerms.stop
            ? (id) => {
                stopCard(id);
              }
            : undefined
        }
        onChangeTrackLane={
          isDemo
            ? undefined
            : (id, lane) => {
                moveCardToTrackLane(id, lane);
                setCardModalId(id);
              }
        }
        onCopyCardLink={copyCardLink}
        canMoveColumns={kanbanCardPerms.moveColumns}
        canEditTitle={kanbanCardPerms.editTitle}
        canEditDueDate={kanbanCardPerms.editDueDate}
        canEditTrack={kanbanCardPerms.editTrack}
        canManageAssignees={kanbanCardPerms.manageAssignees}
        canManageParticipants={kanbanCardPerms.manageParticipants}
        canManageKanbanChecklist={kanbanCardPerms.manageKanbanChecklist}
        canManageKanbanTimer={kanbanCardPerms.manageKanbanTimer}
        canAttachFiles={kanbanCardPerms.attachFiles}
        canManageKanbanBlock={canManageKanbanBlock}
        onOpenLinkedCard={(id) => {
          setCardModalOrigin(null);
          setCardModalId(id);
        }}
        onParentProductionFilesUpdated={syncParentProductionChildrenAfterFilesAttach}
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
              Общий архив со всех доступных досок ({visibleBoards.length}).
              {board ? (
                <>
                  {" "}
                  Срок хранения на доске «{board.title}»:{" "}
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
                </>
              ) : null}
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
                                const homeId = findArchivedCardHomeBoardId(row.id);
                                let restoredTitle = row.card.title;
                                setAppState((s) => {
                                  if (!s) return s;
                                  const next = structuredClone(s);
                                  const b = next.boards.find((x) => x.id === homeId);
                                  if (!b) return s;
                                  const ok = restoreArchivedCardOnBoard(b, row.id);
                                  if (!ok) return s;
                                  if (!isDemo && canPersistTenantKanban(next)) {
                                    void writePersistedKanbanStateNow(next, false);
                                  }
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
                                const homeId = findArchivedCardHomeBoardId(row.id);
                                setAppState((s) => {
                                  if (!s) return s;
                                  const next = structuredClone(s);
                                  const b = next.boards.find((x) => x.id === homeId);
                                  if (!b) return s;
                                  b.archivedCards = (b.archivedCards || []).filter(
                                    (x) => x.id !== row.id,
                                  );
                                  if (!isDemo && canPersistTenantKanban(next)) {
                                    void writePersistedKanbanStateNow(next, false);
                                  }
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
