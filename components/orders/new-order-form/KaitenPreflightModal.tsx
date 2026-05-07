"use client";

import type { KaitenTrackLane } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DueDatetimeComboPicker } from "@/components/ui/DueDatetimeComboPicker";
import { readClientState } from "@/lib/client-state-client";
import {
  KANBAN_BOARD_ORTHODONTICS_ID,
  KANBAN_BOARD_ORTHOPEDICS_ID,
} from "@/lib/kanban/model";
export type KaitenSavePayload =
  | { kaitenDecideLater: true; createKanbanWithoutKaiten?: false }
  | {
      kaitenDecideLater: true;
      createKanbanWithoutKaiten: true;
      kaitenCardTypeId: string;
      kaitenTrackLane: KaitenTrackLane;
      kaitenCardTitleLabel: string;
    }
  | {
      kaitenDecideLater: false;
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
      const typeLane = String((t as { defaultTrackLane?: unknown }).defaultTrackLane ?? "").trim();
      if (!typeId || (typeLane !== "ORTHOPEDICS" && typeLane !== "ORTHODONTICS" && typeLane !== "TEST")) {
        continue;
      }
      out[typeId] = typeLane as KaitenTrackLane;
    }
    for (const t of board.cardTypes) {
      if (!t || typeof t !== "object" || Array.isArray(t)) continue;
      const typeId = String((t as { id?: unknown }).id ?? "").trim();
      if (!typeId || out[typeId]) continue;
      out[typeId] = lane;
    }
  }
  return out;
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

function cardTypeColorsFromTenantKanbanState(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const state = raw as { boards?: unknown };
  if (!Array.isArray(state.boards)) return {};
  const out: Record<string, string> = {};
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
      const color = normalizeHexColor((t as { color?: unknown }).color);
      if (!typeId || !color || out[typeId]) continue;
      out[typeId] = color;
    }
  }
  return out;
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
    options?: { printPdf?: boolean },
  ) => void;
  /** Дублирование поля из шапки наряда — можно поправить перед сохранением. */
  labDueLocal: string;
  labDueMinLocal: string;
  /** Слоты времени «Срок лабораторный» из конфигурации тенанта. */
  labHmSlots?: readonly string[] | null;
  onLabDueLocalChange: (raw: string) => void;
  /** Ошибка сохранения наряда (видна поверх формы, пока открыта модалка). */
  saveError?: string | null;
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

/** При сбросе невалидного выбора — не ставим «Тест», если доступна ортопедия/ортодонтия. */
function defaultTrackLane(lanes: KaitenTrackLane[]): KaitenTrackLane {
  if (lanes.includes("ORTHOPEDICS")) return "ORTHOPEDICS";
  if (lanes.includes("ORTHODONTICS")) return "ORTHODONTICS";
  return lanes[0]!;
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
}: KaitenPreflightModalProps) {
  const [decideLater, setDecideLater] = useState(false);
  /** При «Решу позже»: только карточка CRM-канбана; нужны тип и пространство для доски. */
  const [kanbanOnly, setKanbanOnly] = useState(false);
  const [cardTypes, setCardTypes] = useState<UiCardType[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [cardTypeId, setCardTypeId] = useState("");
  const [space, setSpace] = useState<KaitenTrackLane>("ORTHOPEDICS");
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
  const [boardLaneName, setBoardLaneName] = useState("");
  const [workLabel, setWorkLabel] = useState("");

  useEffect(() => {
    if (!open) return;
    setDecideLater(false);
    setKanbanOnly(false);
    setSpace("ORTHOPEDICS");
    setLaneAllowlist(null);
    setDistributionLaneAllowlist(null);
    setDefaultSpaceByCardType({});
    setBoardLaneOptionsBySpace({});
    setCardTypeColorById({});
    setBoardLaneName("");
    setWorkLabel("");
    setLoadError(null);
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/kaiten-ui-options");
        const data = (await res.json()) as {
          cardTypes?: UiCardType[];
          trackLanes?: KaitenTrackLane[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Ошибка загрузки");
        }
        if (cancelled) return;
        setCardTypes(data.cardTypes ?? []);
        const firstType = data.cardTypes?.[0]?.id ?? "";
        setLaneAllowlist(
          Array.isArray(data.trackLanes) ? data.trackLanes : [],
        );
        const tenantKanbanState = await readClientState<unknown>(
          "tenant",
          "kanbanAppStateV3",
        );
        if (!cancelled) {
          const distribution = distributionLanesFromTenantKanbanState(tenantKanbanState);
          setDistributionLaneAllowlist(distribution);
          const defaults = defaultSpaceByCardTypeFromTenantKanbanState(tenantKanbanState);
          setDefaultSpaceByCardType(defaults);
          setBoardLaneOptionsBySpace(
            boardLaneOptionsBySpaceFromTenantKanbanState(tenantKanbanState),
          );
          setCardTypeColorById(cardTypeColorsFromTenantKanbanState(tenantKanbanState));
          const allowedFromEnv = Array.isArray(data.trackLanes) ? data.trackLanes : [];
          const allowedByDistribution = distribution ?? allowedFromEnv;
          const allowedFinal = allowedFromEnv.filter((lane) =>
            allowedByDistribution.includes(lane),
          );
          const preferredSpace = firstType ? defaults[firstType] : undefined;
          setCardTypeId(firstType);
          if (preferredSpace && allowedFinal.includes(preferredSpace)) {
            setSpace(preferredSpace);
          }
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
    if (!available.includes(space)) {
      setSpace(defaultTrackLane(available));
    }
  }, [spaceOptions, space]);

  const laneOptionsForSelectedSpace = boardLaneOptionsBySpace[space] ?? [];

  useEffect(() => {
    if (laneOptionsForSelectedSpace.length <= 1) {
      setBoardLaneName("");
      return;
    }
    if (!laneOptionsForSelectedSpace.includes(boardLaneName)) {
      setBoardLaneName(laneOptionsForSelectedSpace[0] ?? "");
    }
  }, [laneOptionsForSelectedSpace, boardLaneName]);

  const kaitenFieldsRequired = !decideLater || kanbanOnly;

  const canSubmit = useMemo(() => {
    if (!kaitenFieldsRequired) return true;
    if (loadError || cardTypes.length === 0 || !cardTypeId) return false;
    if (spaceOptions.length === 0) return false;
    if (!space) return false;
    return true;
  }, [
    kaitenFieldsRequired,
    loadError,
    cardTypes.length,
    cardTypeId,
    spaceOptions.length,
    space,
  ]);

  const submit = useCallback(
    (printPdf: boolean) => {
      if (!canSubmit) return;
      if (decideLater && !kanbanOnly) {
        onConfirm({ kaitenDecideLater: true }, { printPdf });
        return;
      }
      if (decideLater && kanbanOnly) {
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
          kaitenCardTypeId: cardTypeId,
          kaitenTrackLane: space,
          kaitenCardTitleLabel: workLabel.trim(),
        },
        { printPdf },
      );
    },
    [canSubmit, decideLater, kanbanOnly, onConfirm, cardTypeId, space, workLabel],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-zinc-900/50 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kaiten-preflight-title"
    >
      <div className="flex max-h-[min(96vh,920px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl">
        <div className="shrink-0 border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2
                id="kaiten-preflight-title"
                className="text-xl font-semibold text-[var(--app-text)]"
              >
                Кайтен
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Укажите вид работы и тип карточки для Kaiten. Дату записи задайте
                в форме наряда. Срок лаборатории продублирован ниже на всякий
                случай — в шапке карточки и на печати используется он; в поле
                срока карточки Kaiten он не передаётся. Типы карточек — в
                конфигурации «Кайтен».
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
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
                      const accent = cardTypeColorById[o.id] ?? "#64748b";
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
                      const preferred = defaultSpaceByCardType[o.id];
                      if (!preferred) return;
                      if (!spaceOptions.some((x) => x.value === preferred)) return;
                      setSpace(preferred);
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
                    В .env не задано ни одного пространства Kaiten (нужны
                    KAITEN_ORTHOPEDICS_* и/или KAITEN_ORTHODONTICS_* и при
                    необходимости KAITEN_TEST_* — board id и id колонки «в
                    работу»).
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
                        onChange={() => setSpace(o.value)}
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
                            onChange={() => setBoardLaneName(laneName)}
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
                const v = e.target.checked;
                setDecideLater(v);
                if (!v) setKanbanOnly(false);
              }}
            />
            <span className="text-sm font-medium text-[var(--text-strong)]">
              Решу позже
            </span>
          </label>
          {decideLater ? (
            <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-[var(--input-border)] text-[var(--sidebar-blue)]"
                checked={kanbanOnly}
                onChange={(e) => setKanbanOnly(e.target.checked)}
              />
              <span className="min-w-0 text-sm font-medium text-[var(--text-strong)]">
                Создать только в канбан
                <span className="mt-0.5 block text-xs font-normal text-[var(--text-muted)]">
                  Карточку Kaiten не создаём; для доски CRM укажите тип и пространство ниже.
                </span>
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
              disabled={saving || !canSubmit}
              onClick={() => submit(true)}
            >
              {saving ? "Сохранение…" : "Сохранить и напечатать"}
            </button>
            <button
              type="button"
              className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--sidebar-blue-hover)] disabled:opacity-50"
              disabled={saving || !canSubmit}
              onClick={() => submit(false)}
            >
              {saving ? "Сохранение…" : "Сохранить заказ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
