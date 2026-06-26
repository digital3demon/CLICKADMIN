"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  catalogLabel,
  columnRefFromCatalogEntry,
  type KanbanColumnCatalogEntry,
} from "@/lib/kanban-column-catalog";
import {
  normalizeStickerPrintSettingsV2,
  type StickerPrintSettingsV2,
} from "@/lib/sticker-template";
import {
  DEFAULT_PUBLIC_HUB_TIMELINE,
  PUBLIC_HUB_TIMELINE_LIMITS,
  describePublicHubCondition,
  newTimelineRowId,
  normalizePublicHubTimeline,
  type PublicHubColumnRef,
  type PublicHubTimelineCondition,
  type PublicHubTimelineRow,
} from "@/lib/sticker-public-hub-timeline";

const inputClass =
  "w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)] disabled:cursor-not-allowed disabled:opacity-45";

const selectClass = inputClass;

type AddRowKind =
  | "kanban_move"
  | "kanban_enter"
  | "kanban_leave"
  | "kanban_blocked"
  | "revision_field_changed"
  | "order_created"
  | "order_received";

function defaultColumnRef(
  catalog: KanbanColumnCatalogEntry[],
): PublicHubColumnRef {
  if (catalog[0]) return columnRefFromCatalogEntry(catalog[0]);
  return { mode: "column", boardId: "", columnId: "", title: "" };
}

function createRowForKind(
  kind: AddRowKind,
  catalog: KanbanColumnCatalogEntry[],
): PublicHubTimelineRow {
  const col = defaultColumnRef(catalog);
  const id = newTimelineRowId();
  switch (kind) {
    case "kanban_move":
      return {
        id,
        label: "Перемещение",
        condition: {
          type: "kanban_move",
          from: col,
          to: { mode: "any" },
        },
      };
    case "kanban_enter":
      return {
        id,
        label: "В колонку",
        condition: { type: "kanban_enter", column: col },
      };
    case "kanban_leave":
      return {
        id,
        label: "Выход из колонки",
        condition: { type: "kanban_leave", column: col },
      };
    case "kanban_blocked":
      return {
        id,
        label: "Заблокировано",
        condition: { type: "kanban_blocked" },
      };
    case "revision_field_changed":
      return {
        id,
        label: "Изменена срочность",
        condition: { type: "revision_field_changed", field: "isUrgent" },
      };
    case "order_created":
      return {
        id,
        label: "Оформлено",
        condition: { type: "order_field", field: "createdAt" },
      };
    case "order_received":
      return {
        id,
        label: "Поступление в лабораторию",
        condition: {
          type: "order_field",
          field: "workReceivedAt",
          fallback: "createdAt",
        },
      };
  }
}

function ColumnRefEditor({
  label,
  value,
  catalog,
  onChange,
  allowAny,
  allowNext,
  disabled,
}: {
  label: string;
  value: PublicHubColumnRef;
  catalog: KanbanColumnCatalogEntry[];
  onChange: (ref: PublicHubColumnRef) => void;
  allowAny?: boolean;
  allowNext?: boolean;
  disabled?: boolean;
}) {
  const mode =
    value.mode === "any"
      ? "any"
      : value.mode === "next"
        ? "next"
        : "column";

  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
      <div className="flex flex-wrap gap-1">
        {allowAny ? (
          <button
            type="button"
            disabled={disabled}
            className={`rounded px-2 py-0.5 text-xs ${mode === "any" ? "bg-[var(--sidebar-blue)] text-white" : "bg-[var(--surface-subtle)]"}`}
            onClick={() => onChange({ mode: "any" })}
          >
            Любая
          </button>
        ) : null}
        {allowNext ? (
          <button
            type="button"
            disabled={disabled}
            className={`rounded px-2 py-0.5 text-xs ${mode === "next" ? "bg-[var(--sidebar-blue)] text-white" : "bg-[var(--surface-subtle)]"}`}
            onClick={() => onChange({ mode: "next" })}
          >
            Следующая
          </button>
        ) : null}
        <button
          type="button"
          disabled={disabled}
          className={`rounded px-2 py-0.5 text-xs ${mode === "column" ? "bg-[var(--sidebar-blue)] text-white" : "bg-[var(--surface-subtle)]"}`}
          onClick={() => onChange(defaultColumnRef(catalog))}
        >
          Колонка
        </button>
      </div>
      {mode === "column" ? (
        <select
          disabled={disabled}
          className={selectClass}
          value={
            value.mode === "column"
              ? `${value.boardId}\0${value.columnId}\0${value.title}`
              : ""
          }
          onChange={(e) => {
            const entry = catalog.find(
              (c) => `${c.boardId}\0${c.columnId}\0${c.title}` === e.target.value,
            );
            if (entry) onChange(columnRefFromCatalogEntry(entry));
          }}
        >
          {catalog.length === 0 ? (
            <option value="">Нет колонок на досках</option>
          ) : (
            catalog.map((c) => (
              <option
                key={`${c.boardId}-${c.columnId}-${c.orderIndex}`}
                value={`${c.boardId}\0${c.columnId}\0${c.title}`}
              >
                {catalogLabel(c)}
              </option>
            ))
          )}
        </select>
      ) : null}
    </div>
  );
}

function ConditionEditor({
  condition,
  catalog,
  onChange,
  disabled,
}: {
  condition: PublicHubTimelineCondition;
  catalog: KanbanColumnCatalogEntry[];
  onChange: (c: PublicHubTimelineCondition) => void;
  disabled?: boolean;
}) {
  switch (condition.type) {
    case "order_field":
      return (
        <div className="space-y-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3 text-sm">
          <p className="text-[var(--text-secondary)]">Поле наряда</p>
          <select
            disabled={disabled}
            className={selectClass}
            value={
              condition.field === "workReceivedAt"
                ? condition.fallback === "createdAt"
                  ? "workReceivedAt+fallback"
                  : "workReceivedAt"
                : "createdAt"
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v === "createdAt") {
                onChange({ type: "order_field", field: "createdAt" });
              } else if (v === "workReceivedAt+fallback") {
                onChange({
                  type: "order_field",
                  field: "workReceivedAt",
                  fallback: "createdAt",
                });
              } else {
                onChange({ type: "order_field", field: "workReceivedAt" });
              }
            }}
          >
            <option value="createdAt">Дата оформления</option>
            <option value="workReceivedAt">Дата поступления</option>
            <option value="workReceivedAt+fallback">
              Дата поступления (или оформления)
            </option>
          </select>
        </div>
      );
    case "kanban_enter":
    case "kanban_leave":
      return (
        <div className="space-y-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3">
          <ColumnRefEditor
            label={condition.type === "kanban_enter" ? "В колонку" : "Из колонки"}
            value={condition.column}
            catalog={catalog}
            onChange={(column) => onChange({ ...condition, column })}
            disabled={disabled}
          />
        </div>
      );
    case "kanban_move":
      return (
        <div className="space-y-3 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3">
          <ColumnRefEditor
            label="Из"
            value={condition.from}
            catalog={catalog}
            onChange={(from) => onChange({ ...condition, from })}
            disabled={disabled}
          />
          <ColumnRefEditor
            label="В"
            value={condition.to}
            catalog={catalog}
            onChange={(to) => onChange({ ...condition, to })}
            allowAny
            allowNext
            disabled={disabled}
          />
        </div>
      );
    case "kanban_blocked":
      return (
        <p className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-secondary)]">
          Дата первой блокировки карточки в журнале CRM-канбана.
        </p>
      );
    case "revision_field_changed":
      return (
        <div className="space-y-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3 text-sm">
          <p className="text-[var(--text-secondary)]">
            По истории ревизий наряда (не журнал канбана).
          </p>
          <select
            disabled={disabled}
            className={selectClass}
            value={condition.field}
            onChange={(e) =>
              onChange({
                type: "revision_field_changed",
                field:
                  e.target.value === "urgentCoefficient"
                    ? "urgentCoefficient"
                    : "isUrgent",
              })
            }
          >
            <option value="isUrgent">Изменена срочность</option>
            <option value="urgentCoefficient">Изменён коэф. срочности</option>
          </select>
        </div>
      );
    default:
      return null;
  }
}

function SortableTimelineRow({
  row,
  expanded,
  catalog,
  disabled,
  onToggleExpand,
  onLabelChange,
  onConditionChange,
  onRemove,
}: {
  row: PublicHubTimelineRow;
  expanded: boolean;
  catalog: KanbanColumnCatalogEntry[];
  disabled?: boolean;
  onToggleExpand: () => void;
  onLabelChange: (label: string) => void;
  onConditionChange: (c: PublicHubTimelineCondition) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3"
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-1 cursor-grab touch-none text-[var(--text-secondary)] active:cursor-grabbing"
          disabled={disabled}
          aria-label="Перетащить"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            disabled={disabled}
            className={inputClass}
            value={row.label}
            maxLength={PUBLIC_HUB_TIMELINE_LIMITS.labelMax}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="Подпись строки"
          />
          <p className="text-xs text-[var(--text-secondary)]">
            {describePublicHubCondition(row.condition)}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              className="text-xs text-[var(--sidebar-blue)] hover:underline"
              onClick={onToggleExpand}
            >
              {expanded ? "Скрыть условие" : "Изменить условие"}
            </button>
            <button
              type="button"
              disabled={disabled}
              className="text-xs text-red-600 hover:underline"
              onClick={onRemove}
            >
              Удалить
            </button>
          </div>
          {expanded ? (
            <ConditionEditor
              condition={row.condition}
              catalog={catalog}
              onChange={onConditionChange}
              disabled={disabled}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function StickerPublicHubTimelineEditor({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<StickerPrintSettingsV2>(() =>
    normalizeStickerPrintSettingsV2(null),
  );
  const [rows, setRows] = useState<PublicHubTimelineRow[]>(
    () => DEFAULT_PUBLIC_HUB_TIMELINE.rows,
  );
  const [catalog, setCatalog] = useState<KanbanColumnCatalogEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [settingsRes, catalogRes] = await Promise.all([
          fetch("/api/tenant/print-settings", { cache: "no-store" }),
          fetch("/api/tenant/kanban-column-catalog", { cache: "no-store" }),
        ]);
        const settingsJson = (await settingsRes.json()) as Partial<StickerPrintSettingsV2> & {
          error?: string;
        };
        const catalogJson = (await catalogRes.json()) as {
          columns?: KanbanColumnCatalogEntry[];
          error?: string;
        };
        if (!settingsRes.ok) throw new Error(settingsJson.error ?? "Ошибка загрузки");
        if (!catalogRes.ok) throw new Error(catalogJson.error ?? "Ошибка каталога колонок");
        if (cancelled) return;
        const nextSettings = normalizeStickerPrintSettingsV2(settingsJson);
        setSettings(nextSettings);
        setRows(
          normalizePublicHubTimeline(nextSettings.publicHubTimeline).rows,
        );
        setCatalog(catalogJson.columns ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Ошибка");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rowIds = useMemo(() => rows.map((r) => r.id), [rows]);

  const onDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRows((prev) => {
      const oldIndex = prev.findIndex((r) => r.id === active.id);
      const newIndex = prev.findIndex((r) => r.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      setOk(false);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const addRow = (kind: AddRowKind) => {
    if (!canEdit || rows.length >= PUBLIC_HUB_TIMELINE_LIMITS.rowsMax) return;
    setRows((prev) => [...prev, createRowForKind(kind, catalog)]);
    setAddOpen(false);
    setOk(false);
  };

  const save = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const next: StickerPrintSettingsV2 = {
        ...settings,
        publicHubTimeline: { rows },
      };
      const res = await fetch("/api/tenant/print-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const j = (await res.json()) as Partial<StickerPrintSettingsV2> & {
        error?: string;
      };
      if (!res.ok) throw new Error(j.error ?? "Не сохранено");
      const saved = normalizeStickerPrintSettingsV2(j);
      setSettings(saved);
      setRows(normalizePublicHubTimeline(saved.publicHubTimeline).rows);
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    if (!canEdit) return;
    setRows(structuredClone(DEFAULT_PUBLIC_HUB_TIMELINE.rows));
    setOk(false);
  };

  if (loading) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">Загрузка настроек…</p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-secondary)]">
        Строки блока «Сроки» на публичной странице по QR-коду на этикетке. Порядок,
        подписи и условия появления даты настраиваются для всей организации.
      </p>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Сохранено
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {rows.map((row) => (
              <SortableTimelineRow
                key={row.id}
                row={row}
                expanded={expandedId === row.id}
                catalog={catalog}
                disabled={!canEdit}
                onToggleExpand={() =>
                  setExpandedId((id) => (id === row.id ? null : row.id))
                }
                onLabelChange={(label) => {
                  setOk(false);
                  setRows((prev) =>
                    prev.map((r) => (r.id === row.id ? { ...r, label } : r)),
                  );
                }}
                onConditionChange={(condition) => {
                  setOk(false);
                  setRows((prev) =>
                    prev.map((r) => (r.id === row.id ? { ...r, condition } : r)),
                  );
                }}
                onRemove={() => {
                  setOk(false);
                  setRows((prev) => prev.filter((r) => r.id !== row.id));
                  if (expandedId === row.id) setExpandedId(null);
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="relative">
        <button
          type="button"
          disabled={!canEdit || rows.length >= PUBLIC_HUB_TIMELINE_LIMITS.rowsMax}
          className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-sm hover:bg-[var(--card-bg)] disabled:opacity-45"
          onClick={() => setAddOpen((v) => !v)}
        >
          + Строка
        </button>
        {addOpen ? (
          <div className="absolute left-0 z-10 mt-1 min-w-[14rem] rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] py-1 shadow-lg">
            {(
              [
                ["kanban_move", "Перемещение"],
                ["kanban_enter", "В колонку"],
                ["kanban_leave", "Выход из колонки"],
                ["kanban_blocked", "Заблокировано"],
                ["revision_field_changed", "Изменена срочность"],
                ["order_received", "Поле: поступление"],
                ["order_created", "Поле: оформление"],
              ] as const
            ).map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--surface-subtle)]"
                onClick={() => addRow(kind)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {catalog.length === 0 ? (
        <p className="text-xs text-amber-700">
          Колонки CRM-канбана не найдены — для условий по колонкам сначала настройте
          доски в конфигурации канбана.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-[var(--card-border)] pt-4">
        <button
          type="button"
          disabled={!canEdit || saving}
          className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-medium text-white disabled:opacity-45"
          onClick={() => void save()}
        >
          {saving ? "Сохранение…" : "Сохранить строки"}
        </button>
        <button
          type="button"
          disabled={!canEdit || saving}
          className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm disabled:opacity-45"
          onClick={resetToDefault}
        >
          Сбросить к умолчанию
        </button>
      </div>
    </div>
  );
}
