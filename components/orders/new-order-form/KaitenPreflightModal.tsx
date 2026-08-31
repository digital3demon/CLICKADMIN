"use client";

import type { ReactNode } from "react";
import type { KaitenTrackLane } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { DueDatetimeComboPicker } from "@/components/ui/DueDatetimeComboPicker";
import { readClientState } from "@/lib/client-state-client";
import {
  KANBAN_BOARD_ORTHODONTICS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
} from "@/lib/kanban/model";
import {
  defaultTrackLaneForCardTypeName,
  isCardTypeTrackLane,
  normalizeCardTypeNameKey,
} from "@/lib/kanban/card-type-default-lane";
import {
  defaultSpaceByCardTypeFromLaneSnapshot,
  KANBAN_CARD_TYPE_LANES_KEY,
} from "@/lib/kanban/card-type-lanes-sync";
export type KaitenSavePayload =
  | {
      kaitenDecideLater: true;
      createKanbanWithoutKaiten: true;
      kaitenCardTypeId: string;
      kaitenTrackLane: KaitenTrackLane;
      kaitenCardTitleLabel: string;
    }
  | {
      kaitenDecideLater: false;
      createKanbanWithoutKaiten?: boolean;
      kaitenCardTypeId: string;
      kaitenTrackLane: KaitenTrackLane;
      kaitenCardTitleLabel: string;
    };

const SPACE_OPTIONS: {
  value: KaitenTrackLane;
  label: string;
}[] = [
  { value: "ORTHOPEDICS", label: "Ортопедия" },
  { value: "ORTHODONTICS", label: "Ортодонтия" },
  { value: "TEST", label: "ТЕСТ" },
];

type UiCardType = { id: string; name: string; externalTypeId: number };

function normalizeCardTypeName(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return normalizeCardTypeNameKey(value);
}

function normalizeHexColor(raw: unknown): string | null {
  const v = String(raw ?? "").trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return null;
  return v;
}

function colorWithAlpha(hex: string, alpha: number): string {
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

function laneNamesFromColumnTitles(rawColumns: unknown): string[] {
  if (!Array.isArray(rawColumns)) return [];
  const names = new Set<string>();
  for (const c of rawColumns) {
    if (!c || typeof c !== "object" || Array.isArray(c)) continue;
    const title = String((c as { title?: unknown }).title ?? "").trim();
    const splitIx = title.indexOf("·");
    if (splitIx <= 0) continue;
    const lane = title.slice(0, splitIx).trim();
    if (lane) names.add(lane);
  }
  return [...names];
}

function defaultSpaceByCardTypeFromTenantKanbanState(
  raw: unknown,
): Record<string, KaitenTrackLane> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const state = raw as { boards?: unknown };
  if (!Array.isArray(state.boards)) return {};
  const out: Record<string, KaitenTrackLane> = {};
  for (const item of state.boards) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const board = item as {
      id?: unknown;
      cardTypes?: unknown;
    };
    const boardId = String(board.id ?? "");
    const lane =
      boardId === KANBAN_BOARD_ORTHOPEDICS_ID
        ? "ORTHOPEDICS"
        : boardId === KANBAN_BOARD_ORTHODONTICS_ID
          ? "ORTHODONTICS"
          : null;
    if (!lane || !Array.isArray(board.cardTypes)) continue;
    for (const t of board.cardTypes) {
      if (!t || typeof t !== "object" || Array.isArray(t)) continue;
      const typeId = String((t as { id?: unknown }).id ?? "").trim();
      const typeName = normalizeCardTypeName((t as { name?: unknown }).name);
      const typeLane = String((t as { defaultTrackLane?: unknown }).defaultTrackLane ?? "").trim();
      if (isCardTypeTrackLane(typeLane)) {
        if (typeId) out[typeId] = typeLane;
        if (typeName) out[`name:${typeName}`] = typeLane;
        continue;
      }
      const inferred = defaultTrackLaneForCardTypeName(typeName);
      if (!inferred) continue;
      if (typeId && !out[typeId]) out[typeId] = inferred;
      if (typeName && !out[`name:${typeName}`]) out[`name:${typeName}`] = inferred;
    }
  }
  return out;
}

/**
 * Пространство при выборе типа: эвристика по «орто…» имени → карта из канбана (id/имя) →
 * единственная опция / ортопедия по умолчанию.
 *
 * Имена вроде «ОртоАппараты» важнее карты: типы зеркалятся на обе CRM-доски, и первая
 * (ортопедия) иначе залипает после случайного клика по «Временные».
 */
export function resolvePreferredSpaceForCardType(opts: {
  typeId: string;
  typeName: string;
  defaultSpaceByCardType: Record<string, KaitenTrackLane>;
  availableSpaces: readonly KaitenTrackLane[];
}): KaitenTrackLane | null {
  const available = new Set(opts.availableSpaces);
  const pick = (lane: KaitenTrackLane | null | undefined): KaitenTrackLane | null =>
    lane && available.has(lane) ? lane : null;

  const n = normalizeCardTypeName(opts.typeName);
  const looksOrthodontics =
    n.includes("ортоаппарат") ||
    n.includes("ортодонт") ||
    n.includes("миосплинт");
  if (looksOrthodontics) {
    const od = pick("ORTHODONTICS");
    if (od) return od;
  }

  const byId = pick(opts.defaultSpaceByCardType[opts.typeId]);
  if (byId) return byId;

  const nameKey = `name:${n}`;
  const byName = pick(opts.defaultSpaceByCardType[nameKey]);
  if (byName) return byName;

  const op = pick("ORTHOPEDICS");
  if (op) return op;
  if (opts.availableSpaces.length === 1) return opts.availableSpaces[0] ?? null;
  return null;
}

function boardLaneOptionsBySpaceFromTenantKanbanState(
  raw: unknown,
): Partial<Record<KaitenTrackLane, string[]>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const state = raw as { boards?: unknown };
  if (!Array.isArray(state.boards)) return {};
  const out: Partial<Record<KaitenTrackLane, string[]>> = {};
  for (const item of state.boards) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const board = item as { id?: unknown; columns?: unknown };
    const boardId = String(board.id ?? "");
    const lane =
      boardId === KANBAN_BOARD_ORTHOPEDICS_ID
        ? "ORTHOPEDICS"
        : boardId === KANBAN_BOARD_ORTHODONTICS_ID
          ? "ORTHODONTICS"
          : null;
    if (!lane) continue;
    const laneNames = laneNamesFromColumnTitles(board.columns);
    if (laneNames.length > 1) out[lane] = laneNames;
  }
  return out;
}

function cardTypeColorsFromTenantKanbanState(raw: unknown): {
  byId: Record<string, string>;
  byName: Record<string, string>;
} {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { byId: {}, byName: {} };
  const state = raw as { boards?: unknown };
  if (!Array.isArray(state.boards)) return { byId: {}, byName: {} };
  const byId: Record<string, string> = {};
  const byName: Record<string, string> = {};
  for (const item of state.boards) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const board = item as { id?: unknown; cardTypes?: unknown };
    const boardId = String(board.id ?? "");
    if (
      boardId !== KANBAN_BOARD_ORTHOPEDICS_ID &&
      boardId !== KANBAN_BOARD_ORTHODONTICS_ID
    ) {
      continue;
    }
    if (!Array.isArray(board.cardTypes)) continue;
    for (const t of board.cardTypes) {
      if (!t || typeof t !== "object" || Array.isArray(t)) continue;
      const typeId = String((t as { id?: unknown }).id ?? "").trim();
      const typeName = normalizeCardTypeName((t as { name?: unknown }).name);
      const color = normalizeHexColor((t as { color?: unknown }).color);
      if (!color) continue;
      if (typeId && !byId[typeId]) byId[typeId] = color;
      if (typeName && !byName[typeName]) byName[typeName] = color;
    }
  }
  return { byId, byName };
}

type KaitenPreflightModalProps = {
  open: boolean;
  saving: boolean;
  /** Только закрыть модалку (крестик), форма нового наряда остаётся открытой. */
  onCloseModal: () => void;
  /** «Отмена (свернуть наряд)» — закрыть модалку и свернуть панель наряда. */
  onCancelCollapse: () => void;
  onConfirm: (
    payload: KaitenSavePayload,
    options?: {
      printPdf?: boolean;
      autoReply?: { send: boolean; subject: string; html: string };
    },
  ) => void;
  /** Дублирование поля из шапки наряда — можно поправить перед сохранением. */
  labDueLocal: string;
  labDueMinLocal: string;
  /** Слоты времени «Срок лабораторный» из конфигурации тенанта. */
  labHmSlots?: readonly string[] | null;
  onLabDueLocalChange: (raw: string) => void;
  /** Ошибка сохранения наряда (видна поверх формы, пока открыта модалка). */
  saveError?: string | null;
  /** Панель «Ответное письмо» справа (заказ из почты). */
  replyAside?: ReactNode;
  /** Галочка «Отправить ответ» — только при replyAside. */
  sendReply?: boolean;
  onSendReplyChange?: (value: boolean) => void;
  /** Показывать «…и ответить» на кнопках сохранения. */
  replyActionsEnabled?: boolean;
};

function ModalCloseIcon(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/** При сбросе невалидного выбора — не ставим пространство автоматически. */
function isTrackLane(value: string): value is KaitenTrackLane {
  return value === "ORTHOPEDICS" || value === "ORTHODONTICS" || value === "TEST";
}

function distributionLanesFromTenantKanbanState(raw: unknown): KaitenTrackLane[] | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const state = raw as { boards?: unknown };
  if (!Array.isArray(state.boards)) return null;
  const lanes = new Set<KaitenTrackLane>();
  for (const item of state.boards) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const board = item as { id?: unknown; distributeNewOrders?: unknown };
    const id = typeof board.id === "string" ? board.id : "";
    const enabled = board.distributeNewOrders !== false;
    if (!enabled) continue;
    if (id === KANBAN_BOARD_ORTHOPEDICS_ID) lanes.add("ORTHOPEDICS");
    if (id === KANBAN_BOARD_ORTHODONTICS_ID) lanes.add("ORTHODONTICS");
  }
  return [...lanes];
}

export function KaitenPreflightModal({
  open,
  saving,
  onCloseModal,
  onCancelCollapse,
  onConfirm,
  labDueLocal,
  labDueMinLocal,
  labHmSlots,
  onLabDueLocalChange,
  saveError,
  replyAside,
  sendReply = true,
  onSendReplyChange,
  replyActionsEnabled = false,
}: KaitenPreflightModalProps) {
  const [decideLater, setDecideLater] = useState(false);
  const [cardTypes, setCardTypes] = useState<UiCardType[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectionHint, setSelectionHint] = useState<string | null>(null);

  const [cardTypeId, setCardTypeId] = useState("");
  const [space, setSpace] = useState<KaitenTrackLane | "">("");
  /** null — ещё не загрузили с сервера; [] — в .env нет ни одной доски */
  const [laneAllowlist, setLaneAllowlist] = useState<KaitenTrackLane[] | null>(
    null,
  );
  const [distributionLaneAllowlist, setDistributionLaneAllowlist] = useState<
    KaitenTrackLane[] | null
  >(null);
  const [defaultSpaceByCardType, setDefaultSpaceByCardType] = useState<
    Record<string, KaitenTrackLane>
  >({});
  const [boardLaneOptionsBySpace, setBoardLaneOptionsBySpace] = useState<
    Partial<Record<KaitenTrackLane, string[]>>
  >({});
  const [cardTypeColorById, setCardTypeColorById] = useState<Record<string, string>>({});
  const [cardTypeColorByName, setCardTypeColorByName] = useState<Record<string, string>>({});
  const [boardLaneName, setBoardLaneName] = useState("");
  const [workLabel, setWorkLabel] = useState("");
  const [kaitenIntegrationEnabled, setKaitenIntegrationEnabled] = useState(true);

  useEffect(() => {
    if (!open) return;
    setDecideLater(false);
    setKaitenIntegrationEnabled(true);
    setCardTypeId("");
    setSpace("");
    setSelectionHint(null);
    setLaneAllowlist(null);
    setDistributionLaneAllowlist(null);
    setDefaultSpaceByCardType({});
    setBoardLaneOptionsBySpace({});
    setBoardLaneName("");
    setWorkLabel("");
    setLoadError(null);
    let cancelled = false;
    void (async () => {
      try {
        // Читаем серверный client-state параллельно с API типов,
        // чтобы не было "серой" перерисовки кнопок с задержкой.
        const tenantKanbanStatePromise = readClientState<unknown>(
          "tenant",
          "kanbanAppStateV3",
        );
        const tenantCardTypeLanesPromise = readClientState<unknown>(
          "tenant",
          KANBAN_CARD_TYPE_LANES_KEY,
        );
        const res = await fetch("/api/kaiten-ui-options");
        const data = (await res.json()) as {
          enabled?: boolean;
          cardTypes?: UiCardType[];
          trackLanes?: KaitenTrackLane[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Ошибка загрузки");
        }
        if (cancelled) return;
        setCardTypes(data.cardTypes ?? []);
        setKaitenIntegrationEnabled(data.enabled !== false);
        setLaneAllowlist(
          Array.isArray(data.trackLanes) ? data.trackLanes : [],
        );
        const [tenantKanbanState, tenantCardTypeLanes] = await Promise.all([
          tenantKanbanStatePromise,
          tenantCardTypeLanesPromise,
        ]);
        if (!cancelled) {
          const distribution = distributionLanesFromTenantKanbanState(tenantKanbanState);
          setDistributionLaneAllowlist(distribution);
          const defaults = {
            ...defaultSpaceByCardTypeFromTenantKanbanState(tenantKanbanState),
            ...defaultSpaceByCardTypeFromLaneSnapshot(tenantCardTypeLanes),
          };
          setDefaultSpaceByCardType(defaults);
          setBoardLaneOptionsBySpace(
            boardLaneOptionsBySpaceFromTenantKanbanState(tenantKanbanState),
          );
          const colors = cardTypeColorsFromTenantKanbanState(tenantKanbanState);
          setCardTypeColorById(colors.byId);
          setCardTypeColorByName(colors.byName);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Сеть недоступна");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const spaceOptions = useMemo(() => {
    let base = SPACE_OPTIONS;
    if (laneAllowlist != null) {
      base = base.filter((o) => laneAllowlist.includes(o.value));
    }
    if (distributionLaneAllowlist != null) {
      base = base.filter((o) => distributionLaneAllowlist.includes(o.value));
    }
    return base;
  }, [laneAllowlist, distributionLaneAllowlist]);

  useEffect(() => {
    if (spaceOptions.length === 0) return;
    const available = spaceOptions.map((o) => o.value);
    if (space && !available.includes(space)) {
      setSpace("");
    }
  }, [spaceOptions, space]);

  const laneOptionsForSelectedSpace =
    space && isTrackLane(space) ? (boardLaneOptionsBySpace[space] ?? []) : [];

  useEffect(() => {
    if (laneOptionsForSelectedSpace.length <= 1) {
      setBoardLaneName("");
      return;
    }
    if (boardLaneName && !laneOptionsForSelectedSpace.includes(boardLaneName)) {
      setBoardLaneName("");
    }
  }, [laneOptionsForSelectedSpace, boardLaneName]);

  /** Тип и пространство нужны всегда: карточка CRM-канбана создаётся первой. */
  const kaitenFieldsRequired = true;

  const missingSelectionMessage = useMemo(() => {
    if (loadError) return null;
    if (laneAllowlist === null) return null;
    const missing: string[] = [];
    if (!cardTypeId) missing.push("тип карточки");
    if (!space) missing.push("пространство");
    if (laneOptionsForSelectedSpace.length > 1 && !boardLaneName) {
      missing.push("дорожку");
    }
    if (missing.length === 0) return null;
    if (missing.length === 1) {
      return `Выберите ${missing[0]} — без этого сохранить нельзя.`;
    }
    return `Выберите ${missing.join(" и ")} — без этого сохранить нельзя.`;
  }, [
    loadError,
    laneAllowlist,
    cardTypeId,
    space,
    laneOptionsForSelectedSpace.length,
    boardLaneName,
  ]);

  const canSubmit = useMemo(() => {
    if (!kaitenFieldsRequired) return true;
    if (loadError || cardTypes.length === 0 || !cardTypeId) return false;
    if (spaceOptions.length === 0) return false;
    if (!space || !isTrackLane(space)) return false;
    if (laneOptionsForSelectedSpace.length > 1 && !boardLaneName) return false;
    return true;
  }, [
    kaitenFieldsRequired,
    loadError,
    cardTypes.length,
    cardTypeId,
    spaceOptions.length,
    space,
    laneOptionsForSelectedSpace.length,
    boardLaneName,
  ]);

  const submit = useCallback(
    (printPdf: boolean) => {
      if (!canSubmit || !isTrackLane(space) || !cardTypeId) {
        setSelectionHint(
          missingSelectionMessage ??
            "Выберите тип карточки и пространство — без этого сохранить нельзя.",
        );
        return;
      }
      setSelectionHint(null);
      if (decideLater) {
        onConfirm(
          {
            kaitenDecideLater: true,
            createKanbanWithoutKaiten: true,
            kaitenCardTypeId: cardTypeId,
            kaitenTrackLane: space,
            kaitenCardTitleLabel: workLabel.trim(),
          },
          { printPdf },
        );
        return;
      }
      onConfirm(
        {
          kaitenDecideLater: false,
          ...(kaitenIntegrationEnabled ? {} : { createKanbanWithoutKaiten: true }),
          kaitenCardTypeId: cardTypeId,
          kaitenTrackLane: space,
          kaitenCardTitleLabel: workLabel.trim(),
        },
        { printPdf },
      );
    },
    [
      canSubmit,
      decideLater,
      kaitenIntegrationEnabled,
      onConfirm,
      cardTypeId,
      space,
      workLabel,
      missingSelectionMessage,
    ],
  );

  const saveLabel = replyActionsEnabled ? "Сохранить заказ и ответить" : "Сохранить заказ";
  const printLabel = replyActionsEnabled
    ? "Сохранить, напечатать и ответить"
    : "Сохранить и напечатать";

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[600] overflow-y-auto bg-zinc-900/50 p-3 sm:p-5"
      role="presentation"
    >
      <div
        className={`mx-auto flex w-full items-start justify-center gap-3 py-2 ${
          replyAside ? "max-w-[min(96vw,72rem)] flex-col lg:flex-row" : "max-w-5xl"
        }`}
      >
      <div
        className="flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kaiten-preflight-title"
      >
        <div className="shrink-0 border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2
                id="kaiten-preflight-title"
                className="text-xl font-semibold text-[var(--app-text)]"
              >
                Канбан
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Сначала создаётся карточка в канбане. Укажите вид работы и
                тип карточки. «Решу позже» откладывает только внешнюю карточку —
                канбан всё равно появится. Дату записи задайте в форме наряда.
              </p>
              {loadError ? (
                <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {loadError}
                </p>
              ) : null}
              {saveError ? (
                <p
                  className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800/80 dark:bg-red-950/50 dark:text-red-100"
                  role="alert"
                  aria-live="polite"
                >
                  {saveError}
                </p>
              ) : null}
              {selectionHint ? (
                <p
                  className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-100"
                  role="alert"
                  aria-live="polite"
                >
                  {selectionHint}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="shrink-0 rounded-md p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]"
              aria-label="Закрыть окно Кайтен"
              title="Закрыть"
              onClick={() => onCloseModal()}
            >
              <ModalCloseIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 sm:px-6 sm:py-5">
          <div className="mb-5 rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-3 sm:px-4">
            <DueDatetimeComboPicker
              id="kaiten-modal-lab-due"
              label="Срок лаборатории"
              labelPlacement="inside"
              value={labDueLocal}
              minLocal={labDueMinLocal}
              timeGrid="labDue"
              labHmSlots={labHmSlots ?? undefined}
              onChange={onLabDueLocalChange}
              title={
                labHmSlots?.length
                  ? `То же поле, что в шапке наряда: ${labHmSlots.join(", ")} или «В теч. дня»`
                  : "То же поле, что в шапке наряда"
              }
            />
          </div>
          <div
            className={`space-y-2 ${kaitenFieldsRequired ? "" : "pointer-events-none opacity-45"}`}
          >
            <label
              htmlFor="kaiten-work-label"
              className="block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]"
            >
              Вид работы
            </label>
            <p className="text-xs text-[var(--text-muted)]">
              Между врачом и сроком лаборатории в шапке карточки. Пусто — подставится
              название типа карточки.
            </p>
            <input
              id="kaiten-work-label"
              type="text"
              value={workLabel}
              onChange={(e) => setWorkLabel(e.target.value)}
              placeholder="Например: коронки 14–16"
              maxLength={120}
              className="h-10 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 text-sm text-[var(--app-text)] shadow-sm outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
            />
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-2 lg:gap-8">
            <fieldset
              disabled={!kaitenFieldsRequired || !!loadError}
              className={`min-w-0 space-y-3 ${kaitenFieldsRequired ? "" : "opacity-45"}`}
            >
              <legend className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Тип карточки в Кайтен
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Тип карточки в Кайтен">
                {cardTypes.map((o) => (
                  <button
                    type="button"
                    key={o.id}
                    role="radio"
                    aria-checked={cardTypeId === o.id}
                    className="flex items-center rounded-lg border px-3 py-2.5 text-left transition-all hover:brightness-[0.98] dark:hover:brightness-110"
                    style={(() => {
                      const accent =
                        cardTypeColorById[o.id] ??
                        cardTypeColorByName[normalizeCardTypeName(o.name)] ??
                        "#64748b";
                      const selected = cardTypeId === o.id;
                      return {
                        borderColor: selected ? accent : "var(--card-border)",
                        backgroundColor: selected
                          ? colorWithAlpha(accent, 0.2)
                          : colorWithAlpha(accent, 0.08),
                        boxShadow: selected ? `0 0 0 2px ${colorWithAlpha(accent, 0.9)}` : undefined,
                      };
                    })()}
                    onClick={() => {
                      setCardTypeId(o.id);
                      setSelectionHint(null);
                      const preferred = resolvePreferredSpaceForCardType({
                        typeId: o.id,
                        typeName: o.name,
                        defaultSpaceByCardType,
                        availableSpaces: spaceOptions.map((x) => x.value),
                      });
                      if (preferred) setSpace(preferred);
                    }}
                  >
                    <span className="min-w-0 text-sm font-medium text-[var(--text-strong)]">
                      {o.name}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex min-w-0 flex-col gap-6">
            <fieldset
              disabled={
                !kaitenFieldsRequired ||
                !!loadError ||
                laneAllowlist === null ||
                laneAllowlist.length === 0
              }
              className={`space-y-3 ${kaitenFieldsRequired ? "" : "opacity-45"}`}
            >
              <legend className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Пространство
              </legend>
                {laneAllowlist !== null && laneAllowlist.length === 0 ? (
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Нет доступных пространств канбана. В CRM нужны доски
                    ортопедии и/или ортодонтии; для выгрузки в Kaiten — ещё
                    KAITEN_ORTHOPEDICS_* / KAITEN_ORTHODONTICS_* в .env.
                  </p>
                ) : null}
                {distributionLaneAllowlist !== null &&
                distributionLaneAllowlist.length === 0 ? (
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    В настройках канбана не отмечено ни одной доски как «Доска для распределения
                    новых заказов».
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {spaceOptions.map((o) => (
                    <label
                      key={o.value}
                      className="flex min-w-[8.5rem] flex-1 cursor-pointer items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 py-2.5 hover:bg-[var(--table-row-hover)] sm:flex-none"
                    >
                      <input
                        type="radio"
                        name="kaiten-space"
                        value={o.value}
                        checked={space === o.value}
                        onChange={() => {
                          setSpace(o.value);
                          setSelectionHint(null);
                        }}
                        className="text-[var(--sidebar-blue)]"
                      />
                      <span className="text-sm text-[var(--text-strong)]">{o.label}</span>
                    </label>
                  ))}
                </div>
                {laneOptionsForSelectedSpace.length > 1 ? (
                  <div className="mt-3">
                    <div className="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                      Дорожка
                    </div>
                    <p className="mb-2 text-xs text-[var(--text-muted)]">
                      Для выбранного пространства доступно несколько дорожек.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {laneOptionsForSelectedSpace.map((laneName) => (
                        <label
                          key={laneName}
                          className="flex min-w-[8.5rem] flex-1 cursor-pointer items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 py-2.5 hover:bg-[var(--table-row-hover)] sm:flex-none"
                        >
                          <input
                            type="radio"
                            name="kaiten-board-lane"
                            value={laneName}
                            checked={boardLaneName === laneName}
                            onChange={() => {
                              setBoardLaneName(laneName);
                              setSelectionHint(null);
                            }}
                            className="text-[var(--sidebar-blue)]"
                          />
                          <span className="text-sm text-[var(--text-strong)]">{laneName}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </fieldset>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 py-4 sm:px-6">
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-[var(--input-border)] text-[var(--sidebar-blue)]"
              checked={decideLater}
              onChange={(e) => {
                setDecideLater(e.target.checked);
              }}
            />
            <span className="min-w-0 text-sm font-medium text-[var(--text-strong)]">
              Решу позже (только канбан)
              <span className="mt-0.5 block text-xs font-normal text-[var(--text-muted)]">
                Карточка в канбане создаётся сразу; внешнюю — когда решите
                создать или привязать.
              </span>
            </span>
          </label>
          {replyAside ? (
            <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-[var(--input-border)] text-[var(--sidebar-blue)]"
                checked={sendReply}
                onChange={(e) => onSendReplyChange?.(e.target.checked)}
              />
              <span className="text-sm font-medium text-[var(--text-strong)]">
                Отправить ответ
              </span>
            </label>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
              disabled={saving}
              onClick={() => {
                onCancelCollapse();
              }}
            >
              Отмена (свернуть наряд)
            </button>
            <button
              type="button"
              className="rounded-md border-2 border-[var(--sidebar-blue)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-[var(--sidebar-blue)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
              disabled={saving || !!loadError || cardTypes.length === 0}
              onClick={() => submit(true)}
            >
              {saving ? "Сохранение…" : printLabel}
            </button>
            <button
              type="button"
              className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--sidebar-blue-hover)] disabled:opacity-50"
              disabled={saving || !!loadError || cardTypes.length === 0}
              onClick={() => submit(false)}
            >
              {saving ? "Сохранение…" : saveLabel}
            </button>
          </div>
        </div>
      </div>
      {replyAside ? (
        <div className="min-h-0 w-full min-w-0 shrink-0 lg:w-auto lg:max-w-[34rem]">
          {replyAside}
        </div>
      ) : null}
      </div>
    </div>,
    document.body,
  );
}
