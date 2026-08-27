"use client";

import type { UserRole } from "@prisma/client";
import type { KanbanBoard } from "@/lib/kanban/types";
import dynamic from "next/dynamic";
import {
  clearKanbanBrowserStorage,
  createInitialBoard,
  clampArchiveRetentionDays,
  defaultAppState,
  demoKanbanDefaultState,
  ensureProductionBoardInState,
  generateId,
  getActiveBoard,
  isKanbanAggregateBoardId,
  KANBAN_BOARD_PRODUCTION_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
  loadKanbanState,
  kanbanStateForPersistence,
  mergeKanbanStatePreservingLocalBoards,
  migrateBoard,
  normalizeBoardCardTypes,
  normalizeDemoKanbanAppState,
  saveKanbanState,
  withActiveBoard,
} from "@/lib/kanban/model";
import { normalizeProductionSettings } from "@/lib/kanban/production";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminMessengerTenantSettings } from "@/components/directory/AdminMessengerTenantSettings";
import { LabDueSlotsTenantSettings } from "@/components/directory/LabDueSlotsTenantSettings";
import { KaitenIntegrationTenantSettings } from "@/components/directory/KaitenIntegrationTenantSettings";
import { OrderArchiveRetentionTenantSettings } from "@/components/directory/OrderArchiveRetentionTenantSettings";
import { KanbanCrmUsersProvider } from "@/components/kanban/kanban-crm-users-context";
import { IconBoard, IconPlus } from "@/components/kanban/kanban-icons";
import {
  readClientState,
  readClientStateDetailed,
  writeClientState,
} from "@/lib/client-state-client";
import { adoptRemoteKanbanCards } from "@/lib/kanban/adopt-remote-kanban-cards";
import { parseKanbanAppState } from "@/lib/kanban/chat-sync";
import { shouldSkipSparseKanbanTenantWrite } from "@/lib/kanban/kanban-tenant-write-guard";
import {
  applyKanbanArchiveSettings,
  extractKanbanArchiveSettings,
  KANBAN_ARCHIVE_SETTINGS_KEY,
} from "@/lib/kanban/archive-settings-sync";
import {
  applyKanbanCardTypeLanes,
  extractKanbanCardTypeLanes,
  mergeCardTypeLaneSnapshots,
  KANBAN_CARD_TYPE_LANES_KEY,
  type KanbanCardTypeLanesSnapshot,
} from "@/lib/kanban/card-type-lanes-sync";

const KanbanAutomationsForm = dynamic(
  () => import("@/components/kanban/KanbanAutomationsForm").then((m) => m.KanbanAutomationsForm),
  { ssr: false, loading: () => null },
);
const KanbanBoardSettingsForm = dynamic(
  () => import("@/components/kanban/KanbanBoardSettingsForm").then((m) => m.KanbanBoardSettingsForm),
  { ssr: false, loading: () => null },
);
const KanbanProductionSettingsForm = dynamic(
  () =>
    import("@/components/kanban/KanbanProductionSettingsForm").then(
      (m) => m.KanbanProductionSettingsForm,
    ),
  { ssr: false, loading: () => null },
);

type ToastItem = { id: string; text: string; err?: boolean };
type CrmUserPick = { id: string; displayName: string; email: string };

function loadKanbanStateForDirectory(isDemo: boolean) {
  const raw = isDemo
    ? normalizeDemoKanbanAppState(loadKanbanState(true))
    : loadKanbanState(false);
  if (isDemo || !isKanbanAggregateBoardId(raw.activeBoardId)) return raw;
  const next = structuredClone(raw);
  next.activeBoardId =
    next.boards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)?.id ??
    next.boards[0]?.id ??
    next.activeBoardId;
  return next;
}

export function DirectoryKanbanBoardsClient({
  isDemo = false,
  sessionRole,
  telegramBotUsername = "",
  canEditKanbanCardTypes = false,
  canEditKanbanProductionContour = false,
  canEditKanbanBoards = false,
}: {
  isDemo?: boolean;
  sessionRole: UserRole;
  telegramBotUsername?: string;
  canEditKanbanCardTypes?: boolean;
  canEditKanbanProductionContour?: boolean;
  /** Доски, исключения, автоархив, резервная копия, автоматизации (модуль CONFIG_KANBAN_BOARDS или владелец). */
  canEditKanbanBoards?: boolean;
}) {
  const [appState, setAppState] = useState(() => loadKanbanStateForDirectory(isDemo));
  const [kanbanStateReady, setKanbanStateReady] = useState(isDemo);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<{
    message: string;
    onOk: () => void;
  } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const canSetPrivateBoards =
    !isDemo && (sessionRole === "OWNER" || sessionRole === "MANAGER");
  const canEditKaitenIntegration = !isDemo && sessionRole === "OWNER";
  const canEditKanbanAdminTag =
    !isDemo &&
    (sessionRole === "OWNER" ||
      sessionRole === "SENIOR_ADMINISTRATOR" ||
      sessionRole === "ADMINISTRATOR");
  const canEditAdminMessenger =
    !isDemo &&
    (sessionRole === "OWNER" ||
      sessionRole === "MANAGER" ||
      sessionRole === "SENIOR_ADMINISTRATOR");
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createPrivate, setCreatePrivate] = useState(false);
  const [crmUsers, setCrmUsers] = useState<CrmUserPick[]>([]);
  const [pickedUserIds, setPickedUserIds] = useState<string[]>([]);
  const [pickExcludeUserId, setPickExcludeUserId] = useState("");
  const archiveSettingsReadyRef = useRef(false);
  const lastArchiveSettingsSigRef = useRef("");
  const [cardTypeLanesReady, setCardTypeLanesReady] = useState(false);
  const lastCardTypeLanesRef = useRef<KanbanCardTypeLanesSnapshot>({
    version: 1,
    types: [],
  });
  const lastCardTypeLanesSigRef = useRef("");
  const kanbanStateSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTenantKanbanRef = useRef<ReturnType<typeof loadKanbanStateForDirectory> | null>(
    null,
  );
  const tenantKanbanWriteAllowedRef = useRef(isDemo);
  const archiveSettingsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardTypeLanesSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!kanbanStateReady) return;
    saveKanbanState(appState, isDemo);
    if (
      !isDemo &&
      (!tenantKanbanWriteAllowedRef.current ||
        (lastTenantKanbanRef.current &&
          shouldSkipSparseKanbanTenantWrite(
            appState,
            lastTenantKanbanRef.current,
          )))
    ) {
      return;
    }
    const key = isDemo ? "kanbanAppStateV3Demo" : "kanbanAppStateV3";
    const scope = isDemo ? "user" : "tenant";
    const payload = kanbanStateForPersistence(appState, isDemo);
    if (kanbanStateSaveTimerRef.current) {
      clearTimeout(kanbanStateSaveTimerRef.current);
    }
    kanbanStateSaveTimerRef.current = setTimeout(() => {
      kanbanStateSaveTimerRef.current = null;
      void (async () => {
        let toWrite = payload;
        if (!isDemo) {
          const remote = await readClientState<unknown>("tenant", "kanbanAppStateV3");
          const remoteState = parseKanbanAppState(remote);
          if (remoteState) {
            toWrite = adoptRemoteKanbanCards(payload, remoteState);
          }
        }
        void writeClientState(scope, key, toWrite);
      })();
    }, 2000);
    return () => {
      if (kanbanStateSaveTimerRef.current) {
        clearTimeout(kanbanStateSaveTimerRef.current);
        kanbanStateSaveTimerRef.current = null;
      }
    };
  }, [appState, isDemo, kanbanStateReady]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const key = isDemo ? "kanbanAppStateV3Demo" : "kanbanAppStateV3";
      const scope = isDemo ? "user" : "tenant";
      const remoteRead = await readClientStateDetailed<unknown>(scope, key);
      if (cancelled) return;
      if (!isDemo && !remoteRead.ok) {
        tenantKanbanWriteAllowedRef.current = false;
      } else if (!isDemo && remoteRead.ok && !remoteRead.found) {
        tenantKanbanWriteAllowedRef.current = true;
      } else if (remoteRead.ok && remoteRead.found) {
        const parsed = parseKanbanAppState(remoteRead.value);
        if (parsed || (isDemo && remoteRead.value && typeof remoteRead.value === "object")) {
          const remoteState = (
            parsed ?? remoteRead.value
          ) as ReturnType<typeof loadKanbanStateForDirectory>;
          const next = applyKanbanCardTypeLanes(
            mergeKanbanStatePreservingLocalBoards(appState, remoteState),
            lastCardTypeLanesRef.current,
          );
          ensureProductionBoardInState(next);
          setAppState(next);
          saveKanbanState(next, isDemo);
          if (!isDemo) {
            lastTenantKanbanRef.current = next;
            tenantKanbanWriteAllowedRef.current = true;
          }
        } else if (!isDemo) {
          tenantKanbanWriteAllowedRef.current = false;
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
        setAppState((prev) => applyKanbanArchiveSettings(prev, remote));
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
        setAppState((prev) => applyKanbanCardTypeLanes(prev, merged));
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
    if (isDemo || !archiveSettingsReadyRef.current) return;
    const payload = extractKanbanArchiveSettings(appState);
    const sig = JSON.stringify(payload);
    if (sig === lastArchiveSettingsSigRef.current) return;
    lastArchiveSettingsSigRef.current = sig;
    if (archiveSettingsSaveTimerRef.current) {
      clearTimeout(archiveSettingsSaveTimerRef.current);
    }
    archiveSettingsSaveTimerRef.current = setTimeout(() => {
      archiveSettingsSaveTimerRef.current = null;
      void writeClientState("tenant", KANBAN_ARCHIVE_SETTINGS_KEY, payload);
    }, 600);
    return () => {
      if (archiveSettingsSaveTimerRef.current) {
        clearTimeout(archiveSettingsSaveTimerRef.current);
      }
    };
  }, [appState, isDemo]);

  useEffect(() => {
    if (isDemo || !cardTypeLanesReady) return;
    const payload = mergeCardTypeLaneSnapshots(
      extractKanbanCardTypeLanes(appState),
      lastCardTypeLanesRef.current,
    );
    const sig = JSON.stringify(payload);
    if (sig === lastCardTypeLanesSigRef.current) return;
    lastCardTypeLanesRef.current = payload;
    lastCardTypeLanesSigRef.current = sig;
    if (cardTypeLanesSaveTimerRef.current) {
      clearTimeout(cardTypeLanesSaveTimerRef.current);
    }
    cardTypeLanesSaveTimerRef.current = setTimeout(() => {
      cardTypeLanesSaveTimerRef.current = null;
      void writeClientState("tenant", KANBAN_CARD_TYPE_LANES_KEY, payload);
    }, 400);
    return () => {
      if (cardTypeLanesSaveTimerRef.current) {
        clearTimeout(cardTypeLanesSaveTimerRef.current);
      }
    };
  }, [appState, isDemo, cardTypeLanesReady]);

  useEffect(() => {
    if (isDemo) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/kanban/crm-users", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const j = (await res.json().catch(() => ({}))) as {
          users?: Array<{ id: string; displayName: string; email: string }>;
        };
        if (cancelled) return;
        const rows = Array.isArray(j.users) ? j.users : [];
        setCrmUsers(
          rows
            .filter((u) => typeof u.id === "string" && u.id.trim())
            .map((u) => ({
              id: u.id,
              displayName: u.displayName || u.email || "Пользователь",
              email: u.email || "",
            })),
        );
      } catch {
        if (!cancelled) setCrmUsers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  const board = useMemo(() => getActiveBoard(appState), [appState]);
  const globalAutomations = useMemo(
    () => (appState.boards[0]?.automations || []).map((r) => ({ ...r })),
    [appState.boards],
  );
  const cloneGlobalAutomationsForBoard = useCallback(
    (boardId: string) =>
      structuredClone(globalAutomations).map((r) => ({
        ...r,
        boardId: String(r.boardId || boardId),
      })),
    [globalAutomations],
  );
  const excludedIds = board.excludedCrmUserIds ?? [];
  const excludedSet = useMemo(() => new Set(excludedIds), [excludedIds]);
  const candidatesToExclude = useMemo(
    () => crmUsers.filter((u) => u?.id && !excludedSet.has(u.id)),
    [crmUsers, excludedSet],
  );
  const retentionYears = useMemo(() => {
    const raw = (Number.isFinite(board.archiveRetentionDays) ? Number(board.archiveRetentionDays) : 365) / 365;
    return Math.round(raw * 1000) / 1000;
  }, [board.archiveRetentionDays]);

  useEffect(() => {
    setPickExcludeUserId("");
  }, [board.id]);

  const showToast = useCallback((text: string, err?: boolean) => {
    const id = generateId("toast");
    setToasts((t) => [...t, { id, text, err }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const applyToBoard = useCallback((fn: (b: KanbanBoard) => void) => {
    setAppState((s) => withActiveBoard(s, fn));
  }, []);

  const applyToAllBoards = useCallback((fn: (b: KanbanBoard) => void) => {
    setAppState((s) => {
      const next = structuredClone(s);
      for (const b of next.boards) fn(b);
      return next;
    });
  }, []);

  const patchApp = useCallback((fn: (s: typeof appState) => void) => {
    setAppState((s) => {
      const next = structuredClone(s);
      fn(next);
      return next;
    });
  }, []);

  const applyGlobalAutomations = useCallback(
    (fn: (rules: NonNullable<KanbanBoard["automations"]>) => void) => {
      patchApp((s) => {
        const seedBoard = s.boards[0];
        const nextRules = structuredClone(seedBoard?.automations || []);
        fn(nextRules);
        for (const b of s.boards) {
          b.automations = structuredClone(nextRules).map((r) => ({
            ...r,
            boardId: String(r.boardId || b.id),
          }));
        }
      });
    },
    [patchApp],
  );

  const exportBoard = () => {
    const b = getActiveBoard(appState);
    const blob = new Blob([JSON.stringify(b, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `board-${b.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Доска экспортирована");
  };

  const importBoardFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as KanbanBoard;
        if (!data.columns || !Array.isArray(data.columns))
          throw new Error("Неверный формат");
        if (!data.id) data.id = generateId("board");
        data.title = data.title || "Импортированная доска";
        migrateBoard(data);
        data.automations = cloneGlobalAutomationsForBoard(data.id);
        patchApp((s) => {
          s.boards.push(data);
          s.activeBoardId = data.id;
        });
        showToast("Доска импортирована");
      } catch (e) {
        console.error(e);
        showToast(
          "Ошибка импорта: " + (e instanceof Error ? e.message : "неверный JSON"),
          true,
        );
      }
    };
    reader.readAsText(file);
  };

  const saveNormalized = () => {
    applyToAllBoards((b) => normalizeBoardCardTypes(b));
    showToast("Типы карточек сохранены для всех досок");
  };

  const ensureProductionBoardNow = useCallback(() => {
    let created = false;
    let changed = false;
    patchApp((s) => {
      const source = getActiveBoard(s);
      const srcSettings = normalizeProductionSettings(source);
      const lanes = srcSettings.lanes.length
        ? srcSettings.lanes
        : [{ id: "lane_print", name: "Печать", keywords: [] }];
      const neededTitles: string[] = [];
      for (const lane of lanes) {
        neededTitles.push(`${lane.name} · ${srcSettings.childTodoColumnTitle}`);
        neededTitles.push(`${lane.name} · ${srcSettings.childInProgressColumnTitle}`);
        neededTitles.push(`${lane.name} · ${srcSettings.childDoneColumnTitle}`);
      }
      let prod =
        s.boards.find((b) => b.id === KANBAN_BOARD_PRODUCTION_ID) ??
        s.boards.find((b) => b.title.trim().toLowerCase() === "производство");
      if (!prod) {
        created = true;
        changed = true;
        prod = {
          id: KANBAN_BOARD_PRODUCTION_ID,
          title: "Производство",
          isPrivate: false,
          allowProductionRoleAccess: true,
          accessUserIds: [],
          columns: neededTitles.map((title) => ({ id: generateId("col"), title, cards: [] })),
          users: structuredClone(source.users || []),
          excludedCrmUserIds: structuredClone(source.excludedCrmUserIds || []),
          cardTypes: structuredClone(source.cardTypes || []),
          automations: [],
          autoArchiveRules: [],
          archiveRetentionDays: source.archiveRetentionDays ?? 365,
          archivedCards: [],
          productionSettings: structuredClone(srcSettings),
        };
        prod.automations = cloneGlobalAutomationsForBoard(prod.id);
        s.boards.push(prod);
      } else {
        if (prod.id !== KANBAN_BOARD_PRODUCTION_ID) {
          prod.id = KANBAN_BOARD_PRODUCTION_ID;
          changed = true;
        }
        const existing = new Set(prod.columns.map((c) => c.title.trim().toLowerCase()));
        for (const title of neededTitles) {
          const key = title.trim().toLowerCase();
          if (existing.has(key)) continue;
          changed = true;
          prod.columns.push({ id: generateId("col"), title, cards: [] });
          existing.add(key);
        }
        prod.productionSettings = structuredClone(srcSettings);
        prod.users = structuredClone(source.users || []);
        prod.cardTypes = structuredClone(source.cardTypes || []);
        prod.excludedCrmUserIds = structuredClone(source.excludedCrmUserIds || []);
      }
    });
    if (created) {
      showToast("Доска «Производство» создана");
      return;
    }
    showToast(changed ? "Доска «Производство» обновлена" : "Доска «Производство» уже актуальна");
  }, [patchApp, showToast]);

  const openCreateModal = () => {
    if (!canEditKanbanBoards) return;
    setCreateTitle(`Доска ${appState.boards.length + 1}`);
    setCreatePrivate(false);
    setPickedUserIds([]);
    setCreateOpen(true);
  };

  const createBoard = () => {
    if (!canEditKanbanBoards) return;
    const title = createTitle.trim();
    if (!title) {
      showToast("Введите название доски", true);
      return;
    }
    if (createPrivate && pickedUserIds.length < 1) {
      showToast("Для закрытой доски выберите хотя бы одного пользователя", true);
      return;
    }
    const nb = createInitialBoard();
    nb.id = generateId("board");
    nb.title = title;
    nb.isPrivate = createPrivate;
    nb.accessUserIds = createPrivate ? [...pickedUserIds] : [];
    nb.automations = cloneGlobalAutomationsForBoard(nb.id);
    patchApp((s) => {
      s.boards.push(nb);
      s.activeBoardId = nb.id;
    });
    setCreateOpen(false);
    showToast(createPrivate ? "Создана закрытая доска" : "Создана новая доска");
  };

  const deleteActiveBoard = useCallback(() => {
    const target = board;
    if (!target) return;
    if (appState.boards.length <= 1) {
      showToast("Нельзя удалить последнюю доску", true);
      return;
    }
    const cardsCount = target.columns.reduce((sum, col) => sum + col.cards.length, 0);
    setConfirm({
      message:
        cardsCount > 0
          ? `Удалить доску «${target.title}»? Карточек внутри: ${cardsCount}. Действие необратимо.`
          : `Удалить доску «${target.title}»? Действие необратимо.`,
      onOk: () => {
        patchApp((s) => {
          const keepBoards = s.boards.filter((b) => b.id !== target.id);
          if (keepBoards.length === 0) return;
          s.boards = keepBoards;
          if (s.activeBoardId === target.id || !keepBoards.some((b) => b.id === s.activeBoardId)) {
            s.activeBoardId =
              keepBoards.find((b) => b.id === KANBAN_BOARD_ORTHOPEDICS_ID)?.id ??
              keepBoards[0]!.id;
          }
        });
        setConfirm(null);
        showToast(`Доска «${target.title}» удалена`);
      },
    });
  }, [appState.boards.length, board, patchApp, showToast]);

  return (
    <KanbanCrmUsersProvider>
      <>
      <div className="space-y-8">
        {!isDemo ? (
          <KaitenIntegrationTenantSettings canEdit={canEditKaitenIntegration} />
        ) : null}
        {!isDemo ? (
          <LabDueSlotsTenantSettings canEdit={canEditKanbanAdminTag} />
        ) : null}
        {!isDemo ? (
          <OrderArchiveRetentionTenantSettings canEdit={canEditKanbanAdminTag} />
        ) : null}
        {!isDemo ? (
          <AdminMessengerTenantSettings
            canEdit={canEditAdminMessenger}
            telegramBotUsername={telegramBotUsername}
            canEditKanbanAdminTag={canEditKanbanAdminTag}
          />
        ) : null}
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h2 className="m-0 text-base font-semibold text-[var(--app-text)]">
            Доски
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {isDemo ? (
              <>
                В демо те же доски, что в основной CRM (ортопедия, ортодонтия,
                производство); на них только карточки нарядов. Данные — в хранилище
                CRM, как на{" "}
                <Link
                  href="/kanban"
                  className="text-[var(--sidebar-blue)] hover:underline"
                >
                  Канбан
                </Link>
                .
              </>
            ) : (
              <>
                Выберите активную доску — для неё ниже настраиваются типы карточек и
                участники. Данные хранятся в CRM (БД/хранилище), как на странице{" "}
                <Link
                  href="/kanban"
                  className="text-[var(--sidebar-blue)] hover:underline"
                >
                  Канбан
                </Link>
                .
              </>
            )}
          </p>
          <ul className="mt-4 max-h-[220px] list-none space-y-1 overflow-y-auto p-0">
            {appState.boards.map((b) => (
              <li key={b.id}>
                {canEditKanbanBoards ? (
                  <button
                    type="button"
                    className={`flex w-full max-w-lg items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm ${
                      b.id === appState.activeBoardId
                        ? "bg-[color-mix(in_srgb,var(--sidebar-blue)_12%,transparent)] font-semibold text-[var(--app-text)]"
                        : "text-[var(--app-text)] hover:bg-[var(--surface-hover)]"
                    }`}
                    onClick={() => {
                      patchApp((s) => {
                        s.activeBoardId = b.id;
                      });
                      showToast(`Активная доска: ${b.title}`);
                    }}
                  >
                    <IconBoard aria-hidden />
                    {b.title}
                    {b.isPrivate ? (
                      <span className="ml-2 rounded border border-amber-500/40 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
                        Закрытая
                      </span>
                    ) : null}
                  </button>
                ) : (
                  <div
                    className={`flex w-full max-w-lg items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm ${
                      b.id === appState.activeBoardId
                        ? "bg-[color-mix(in_srgb,var(--sidebar-blue)_12%,transparent)] font-semibold text-[var(--app-text)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    <IconBoard aria-hidden />
                    {b.title}
                    {b.isPrivate ? (
                      <span className="ml-2 rounded border border-amber-500/40 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
                        Закрытая
                      </span>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {!isDemo ? (
              <button
                type="button"
                disabled={!canEditKanbanBoards}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[var(--surface-subtle)]"
                onClick={openCreateModal}
              >
                <IconPlus /> Новая доска
              </button>
            ) : null}
            {!isDemo ? (
              <button
                type="button"
                disabled={!canEditKanbanBoards}
                className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[var(--surface-subtle)]"
                onClick={() => {
                  const t = window.prompt("Название доски:", board.title);
                  if (t === null) return;
                  const title = t.trim();
                  if (!title) return;
                  applyToBoard((b) => {
                    b.title = title;
                  });
                  showToast("Название обновлено");
                }}
              >
                Переименовать…
              </button>
            ) : null}
            {!isDemo ? (
              <button
                type="button"
                disabled={!canEditKanbanBoards || appState.boards.length <= 1}
                className="rounded-md border border-red-300/70 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-800/70 dark:bg-red-950/25 dark:text-red-300 dark:hover:bg-red-950/40"
                onClick={deleteActiveBoard}
                title={
                  !canEditKanbanBoards
                    ? "Нет доступа к изменению досок"
                    : appState.boards.length <= 1
                      ? "Нельзя удалить последнюю доску"
                      : "Удалить активную доску"
                }
              >
                Удалить доску
              </button>
            ) : null}
          </div>
          {!isDemo && !canEditKanbanBoards ? (
            <p className="mt-2 max-w-xl text-xs text-[var(--text-muted)]">
              Изменение досок, режима распределения, исключений пользователей и автоархива — только с правом
              «Конфиг: доски канбана» или для владельца организации.
            </p>
          ) : null}
          <div className="mt-4 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3">
            <h3 className="mb-2 mt-0 text-sm font-semibold text-[var(--text-strong)]">
              Режим доски
            </h3>
            <label className="inline-flex items-center gap-2 text-sm text-[var(--text-body)]">
              <input
                type="checkbox"
                disabled={!canEditKanbanBoards}
                checked={board.distributeNewOrders !== false}
                onChange={(e) =>
                  applyToBoard((b) => {
                    b.distributeNewOrders = e.target.checked;
                  })
                }
              />
              Доска для распределения новых заказов
            </label>
            <p className="mt-2 text-[0.75rem] text-[var(--text-muted)]">
              Только отмеченные доски видны в выборе пространства при создании нового наряда.
            </p>
          </div>

          <div className="mt-6 grid gap-6 border-t border-[var(--card-border)] pt-5 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 mt-0 text-sm font-semibold text-[var(--text-strong)]">
                Исключить пользователей (доска «{board.title}»)
              </h3>
              <p className="mb-3 text-[0.8125rem] leading-snug text-[var(--text-muted)]">
                Эти пользователи не будут доступны в выборе «Ответственные» и «Участники» на текущей доске.
              </p>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)] text-left text-[var(--text-muted)]">
                    <th className="py-2 pr-2">Исключён из списков</th>
                    <th className="w-12 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {excludedIds.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-3 text-[var(--text-muted)]">
                        Никого не исключено.
                      </td>
                    </tr>
                  ) : (
                    excludedIds.map((uid) => {
                      const row = crmUsers.find((u) => u.id === uid);
                      const label = row?.displayName?.trim() || row?.email?.trim() || uid;
                      return (
                        <tr key={uid} className="border-b border-[var(--border-subtle)]">
                          <td className="py-2 pr-2 text-[var(--app-text)]">{label}</td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              disabled={!canEditKanbanBoards}
                              className="rounded-md border border-[var(--card-border)] px-2 py-1 text-xs hover:bg-[var(--surface-hover)] disabled:pointer-events-none disabled:opacity-40 disabled:hover:bg-transparent"
                              onClick={() =>
                                applyToBoard((b) => {
                                  b.excludedCrmUserIds = (b.excludedCrmUserIds || []).filter(
                                    (x) => x !== uid,
                                  );
                                })
                              }
                            >
                              Убрать
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="block min-w-[12rem] flex-1 text-sm">
                  <span className="mb-1 block text-[var(--text-secondary)]">Добавить в исключения</span>
                  <select
                    className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-45"
                    value={pickExcludeUserId}
                    disabled={!canEditKanbanBoards || candidatesToExclude.length === 0}
                    onChange={(e) => setPickExcludeUserId(e.target.value)}
                  >
                    <option value="">
                      {candidatesToExclude.length === 0
                        ? "Нет доступных пользователей"
                        : "Выберите пользователя…"}
                    </option>
                    {candidatesToExclude.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName?.trim() || u.email || u.id}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!canEditKanbanBoards || !pickExcludeUserId.trim()}
                  className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[var(--surface-subtle)]"
                  onClick={() => {
                    const id = pickExcludeUserId.trim();
                    if (!id) return;
                    applyToBoard((b) => {
                      const cur = b.excludedCrmUserIds || [];
                      if (cur.includes(id)) return;
                      b.excludedCrmUserIds = [...cur, id];
                    });
                    setPickExcludeUserId("");
                  }}
                >
                  Исключить
                </button>
              </div>
            </div>

            <div>
              <h3 className="mb-2 mt-0 text-sm font-semibold text-[var(--text-strong)]">
                Автоархивация (доска «{board.title}»)
              </h3>
              <p className="mb-3 text-[0.8125rem] leading-snug text-[var(--text-muted)]">
                Правила автоархивации и срок хранения архива для текущей доски.
              </p>
              <label className="mb-3 block max-w-xs text-sm">
                <span className="mb-1 block text-[var(--text-secondary)]">Хранить в архиве (лет)</span>
                <input
                  type="number"
                  min={1 / 365}
                  max={30}
                  step={0.01}
                  disabled={!canEditKanbanBoards}
                  value={retentionYears}
                  onChange={(e) =>
                    applyToBoard((b) => {
                      const y = Number(e.target.value);
                      if (!Number.isFinite(y)) {
                        b.archiveRetentionDays = clampArchiveRetentionDays(365);
                        return;
                      }
                      b.archiveRetentionDays = clampArchiveRetentionDays(Math.round(y * 365));
                    })
                  }
                  className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-45"
                />
              </label>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)] text-left text-[var(--text-muted)]">
                    <th className="py-2 pr-2">Колонка</th>
                    <th className="w-28 py-2 pr-2">Часов</th>
                    <th className="w-20 py-2 pr-2">Вкл.</th>
                    <th className="w-10 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {(board.autoArchiveRules || []).map((r) => (
                    <tr key={r.id} className="border-b border-[var(--border-subtle)]">
                      <td className="py-2 pr-2">
                        <select
                          value={r.columnId}
                          disabled={!canEditKanbanBoards}
                          onChange={(e) =>
                            applyToBoard((b) => {
                              const x = (b.autoArchiveRules || []).find((y) => y.id === r.id);
                              if (x) x.columnId = e.target.value;
                            })
                          }
                          className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {board.columns.map((col) => (
                            <option key={col.id} value={col.id}>
                              {col.title}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={1}
                          max={24 * 180}
                          disabled={!canEditKanbanBoards}
                          value={r.idleHours}
                          onChange={(e) =>
                            applyToBoard((b) => {
                              const x = (b.autoArchiveRules || []).find((y) => y.id === r.id);
                              if (!x) return;
                              const v = Number(e.target.value);
                              x.idleHours = Number.isFinite(v)
                                ? Math.max(1, Math.min(24 * 180, Math.round(v)))
                                : 24;
                            })
                          }
                          className="w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 disabled:cursor-not-allowed disabled:opacity-45"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="checkbox"
                          disabled={!canEditKanbanBoards}
                          checked={r.enabled !== false}
                          onChange={(e) =>
                            applyToBoard((b) => {
                              const x = (b.autoArchiveRules || []).find((y) => y.id === r.id);
                              if (x) x.enabled = e.target.checked;
                            })
                          }
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          disabled={!canEditKanbanBoards}
                          className="rounded-md border border-[var(--card-border)] px-2 py-1 text-xs hover:bg-[var(--surface-hover)] disabled:pointer-events-none disabled:opacity-40 disabled:hover:bg-transparent"
                          onClick={() =>
                            applyToBoard((b) => {
                              b.autoArchiveRules = (b.autoArchiveRules || []).filter(
                                (x) => x.id !== r.id,
                              );
                            })
                          }
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                disabled={!canEditKanbanBoards}
                className="mt-3 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[var(--surface-subtle)]"
                onClick={() =>
                  applyToBoard((b) => {
                    const firstColumnId = b.columns[0]?.id ?? "";
                    if (!firstColumnId) return;
                    b.autoArchiveRules = b.autoArchiveRules || [];
                    b.autoArchiveRules.push({
                      id: generateId("kar"),
                      enabled: true,
                      columnId: firstColumnId,
                      idleHours: 24,
                    });
                  })
                }
              >
                + Добавить правило автоархивации
              </button>
            </div>
          </div>
        </section>

        {canEditKanbanProductionContour ? (
          <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
            <h2 className="m-0 text-base font-semibold text-[var(--app-text)]">
              Производственный контур (доска «{board.title}»)
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Отдельные настройки создания и маршрутизации дочерних производственных карточек.
            </p>
            <div className="mt-6">
              <KanbanProductionSettingsForm
                board={board}
                onPatchBoard={applyToBoard}
                onEnsureProductionBoardNow={ensureProductionBoardNow}
              />
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h2 className="m-0 text-base font-semibold text-[var(--app-text)]">
            Типы карточек (общие для всех досок)
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Изменения типа (название, цвет, пространство по умолчанию) применяются ко всем доскам.
            Остальные настройки ниже остаются для активной доски «{board.title}».
          </p>
          <div className="mt-6">
            <KanbanBoardSettingsForm
              board={board}
              onPatchBoard={applyToBoard}
              onPatchCardTypes={applyToAllBoards}
              canEditCardTypes={canEditKanbanCardTypes}
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--card-border)] pt-4">
            <button
              type="button"
              disabled={!canEditKanbanCardTypes}
              className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:opacity-40"
              onClick={saveNormalized}
            >
              Сохранить порядок типов
            </button>
          </div>
        </section>

        <section
          id="kanban-automations"
          className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm"
        >
          <h2 className="m-0 text-base font-semibold text-[var(--app-text)]">
            Автоматизации
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Глобальные правила для всех досок. В каждом правиле в блоке «Когда» выбирается доска.
            В «Тогда» можно добавить несколько действий.
          </p>
          {!canEditKanbanBoards ? (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Редактирование автоматизаций — только с правом «Конфиг: доски канбана» или для владельца.
            </p>
          ) : null}
          <fieldset
            disabled={!canEditKanbanBoards}
            className="mt-6 min-w-0 border-0 p-0 disabled:pointer-events-none disabled:opacity-45"
          >
            <KanbanAutomationsForm
              board={board}
              boards={appState.boards}
              rules={globalAutomations}
              onPatchRules={applyGlobalAutomations}
            />
          </fieldset>
        </section>

        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h2 className="m-0 text-base font-semibold text-[var(--app-text)]">
            Резервная копия
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Экспорт и импорт JSON относятся к <strong>активной</strong> доске.
          </p>
          {!canEditKanbanBoards ? (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Экспорт и импорт — только с правом «Конфиг: доски канбана» или для владельца.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canEditKanbanBoards}
              className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[var(--surface-subtle)]"
              onClick={exportBoard}
            >
              Экспорт JSON (текущая доска)
            </button>
            {!isDemo ? (
              <>
                <button
                  type="button"
                  disabled={!canEditKanbanBoards}
                  className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[var(--surface-subtle)]"
                  onClick={() => importRef.current?.click()}
                >
                  Импорт JSON
                </button>
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  disabled={!canEditKanbanBoards}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) importBoardFile(f);
                  }}
                />
              </>
            ) : null}
          </div>
        </section>
      </div>

      {createOpen ? (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCreateOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-[var(--app-text)] shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="m-0 text-base font-semibold">Новая доска</h3>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-[var(--text-secondary)]">Название</span>
              <input
                type="text"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--app-text)]"
                autoFocus
              />
            </label>
            {canSetPrivateBoards ? (
              <>
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={createPrivate}
                    onChange={(e) => {
                      setCreatePrivate(e.target.checked);
                      if (!e.target.checked) setPickedUserIds([]);
                    }}
                  />
                  Закрытая доска
                </label>
                {createPrivate ? (
                  <div className="mt-3 rounded-md border border-[var(--card-border)] p-3">
                    <p className="m-0 text-xs text-[var(--text-secondary)]">
                      Выберите пользователей, у кого будет доступ к доске.
                    </p>
                    <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                      {crmUsers.map((u) => {
                        const checked = pickedUserIds.includes(u.id);
                        return (
                          <label
                            key={u.id}
                            className="flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-1.5 text-sm hover:bg-[var(--surface-hover)]"
                          >
                            <span className="truncate">
                              {u.displayName}
                              {u.email ? (
                                <span className="ml-1 text-xs text-[var(--text-muted)]">
                                  ({u.email})
                                </span>
                              ) : null}
                            </span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setPickedUserIds((prev) =>
                                  e.target.checked
                                    ? [...prev, u.id]
                                    : prev.filter((id) => id !== u.id),
                                );
                              }}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm hover:bg-[var(--surface-hover)]"
                onClick={() => setCreateOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={!canEditKanbanBoards}
                className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:opacity-40"
                onClick={createBoard}
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
    </>
    </KanbanCrmUsersProvider>
  );
}
