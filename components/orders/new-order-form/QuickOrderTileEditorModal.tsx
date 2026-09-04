"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MAX_OPTION_LABEL_LEN,
  MAX_TILE_BLOCK_REASON_LEN,
  MAX_TILE_TITLE_LEN,
  newQuickOrderTile,
  newQuickOrderTileOption,
  normalizeAccentColor,
  type QuickOrderTile,
} from "./quick-order-types";
import {
  PriceListPickModal,
  type PriceListPickRow,
} from "./PriceListPickModal";

const PRESET_COLORS = [
  "#0ea5e9",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
];

type PickTarget =
  | null
  | { kind: "base" }
  | { kind: "option"; optionId: string };

type QuickOrderTileEditorModalProps = {
  open: boolean;
  clinicId?: string | null;
  doctorId?: string | null;
  /** null — создать новую плашку */
  editing: QuickOrderTile | null;
  onClose: () => void;
  onSave: (tile: QuickOrderTile) => void;
};

function cloneTile(t: QuickOrderTile): QuickOrderTile {
  return JSON.parse(JSON.stringify(t)) as QuickOrderTile;
}

export function QuickOrderTileEditorModal({
  open,
  clinicId = null,
  doctorId = null,
  editing,
  onClose,
  onSave,
}: QuickOrderTileEditorModalProps) {
  const [draft, setDraft] = useState<QuickOrderTile>(() => newQuickOrderTile());
  const [pickTarget, setPickTarget] = useState<PickTarget>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDraft(cloneTile(editing));
    } else {
      setDraft(newQuickOrderTile());
    }
    setPickTarget(null);
  }, [open, editing]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pickTarget) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, pickTarget]);

  const applyPricePick = useCallback(
    (row: PriceListPickRow) => {
      const summary = `${row.code} · ${row.name}`;
      if (!pickTarget) return;
      if (pickTarget.kind === "base") {
        setDraft((d) => ({
          ...d,
          basePriceListItemId: row.id,
          basePriceSummary: summary,
        }));
      } else {
        const oid = pickTarget.optionId;
        setDraft((d) => ({
          ...d,
          options: d.options.map((o) =>
            o.id === oid
              ? {
                  ...o,
                  priceListItemId: row.id,
                  priceSummary: summary,
                }
              : o,
          ),
        }));
      }
    },
    [pickTarget],
  );

  const commit = useCallback(() => {
    const title = draft.title.trim().slice(0, MAX_TILE_TITLE_LEN);
    if (!title) return;
    const accent = normalizeAccentColor(draft.accentColor);
    const isBlockTile = Boolean(draft.isBlockTile);
    const baseId = isBlockTile
      ? null
      : draft.basePriceListItemId?.trim() || null;
    const blockReason = draft.blockReason
      .trim()
      .slice(0, MAX_TILE_BLOCK_REASON_LEN);
    onSave({
      ...draft,
      title,
      accentColor: accent,
      isBlockTile,
      basePriceListItemId: baseId,
      basePriceSummary: baseId ? draft.basePriceSummary : null,
      baseActive: baseId ? draft.baseActive : false,
      // Плашка-блокировка: в новом наряде сразу активна; причина из редактора.
      blockOnSave: isBlockTile,
      blockReason: isBlockTile ? blockReason : "",
      options: isBlockTile
        ? []
        : draft.options.map((o) => ({
            ...o,
            label: o.label.trim().slice(0, MAX_OPTION_LABEL_LEN),
            priceListItemId: o.priceListItemId?.trim() || null,
            priceSummary: o.priceListItemId?.trim()
              ? o.priceSummary
              : null,
            checked: o.priceListItemId?.trim() ? o.checked : false,
          })),
    });
    onClose();
  }, [draft, onSave, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[130] flex items-center justify-center bg-zinc-900/45 p-4"
        role="presentation"
        onClick={() => {
          if (!pickTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="qo-tile-editor-title"
          className="crm-modal-max-h w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            id="qo-tile-editor-title"
            className="text-base font-semibold text-[var(--app-text)]"
          >
            {editing ? "Плашка: настройка" : "Новая плашка"}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Обычная плашка — прайс и чекбоксы в состав наряда. Плашка-блокировка
            — блокирует карточку в канбан/Kaiten при сохранении наряда, состав
            работы не нужен.
          </p>

          <label className="mt-4 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Название плашки
            </span>
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-[var(--input-border)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
              maxLength={MAX_TILE_TITLE_LEN}
              placeholder={
                draft.isBlockTile
                  ? "Например: Ждём сканы"
                  : "Например: Сплинт"
              }
            />
          </label>

          <div className="mt-4 rounded-lg border border-red-300/40 bg-red-50/40 p-3 dark:border-red-800/50 dark:bg-red-950/20">
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-red-400/70 text-red-600 focus:ring-red-500"
                checked={draft.isBlockTile}
                onChange={(e) => {
                  const on = e.target.checked;
                  setDraft((d) => ({
                    ...d,
                    isBlockTile: on,
                    blockOnSave: on,
                    blockReason: on ? d.blockReason : "",
                    ...(on
                      ? {
                          basePriceListItemId: null,
                          basePriceSummary: null,
                          baseActive: false,
                          options: [],
                        }
                      : {}),
                  }));
                }}
              />
              <span className="text-sm font-semibold text-red-800 dark:text-red-200">
                Плашка-блокировка
              </span>
            </label>
            <p className="mt-1 pl-6 text-xs text-[var(--text-muted)]">
              При сохранении наряда блокирует карточку в канбан/Kaiten — независимо
              от состава работы.
            </p>
            {draft.isBlockTile ? (
              <label className="mt-3 block pl-6">
                <span className="text-xs font-semibold uppercase tracking-wide text-red-700/80 dark:text-red-300/80">
                  Причина блокировки
                </span>
                <textarea
                  className="mt-1 w-full resize-y rounded-md border border-red-300/50 bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/50 dark:border-red-800/50"
                  rows={3}
                  value={draft.blockReason}
                  maxLength={MAX_TILE_BLOCK_REASON_LEN}
                  placeholder="Например: ждём сканы с КТ"
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      blockReason: e.target.value.slice(
                        0,
                        MAX_TILE_BLOCK_REASON_LEN,
                      ),
                    }))
                  }
                />
              </label>
            ) : null}
          </div>

          <div className="mt-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Цвет плашки
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="color"
                value={normalizeAccentColor(draft.accentColor)}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    accentColor: e.target.value,
                  }))
                }
                className="h-9 w-14 cursor-pointer rounded border border-[var(--input-border)] bg-[var(--card-bg)] p-0.5"
                title="Свой цвет"
              />
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-8 w-8 rounded-md border border-[var(--card-border)] shadow-sm ring-offset-2 hover:ring-2 hover:ring-[var(--input-border)]"
                  style={{ backgroundColor: c }}
                  title={c}
                  onClick={() => setDraft((d) => ({ ...d, accentColor: c }))}
                />
              ))}
            </div>
          </div>

          {!draft.isBlockTile ? (
            <>
              <div className="mt-5 rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] p-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  Основная позиция прайса
                </span>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Опционально. В наряд попадёт, если включить переключатель на
                  самой плашке.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {draft.basePriceSummary ? (
                    <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-strong)]">
                      {draft.basePriceSummary}
                    </span>
                  ) : (
                    <span className="text-sm text-[var(--text-placeholder)]">
                      не выбрано
                    </span>
                  )}
                  <button
                    type="button"
                    className="shrink-0 rounded-md bg-[var(--card-bg)] px-2.5 py-1.5 text-xs font-medium text-[var(--sidebar-blue)] ring-1 ring-[var(--card-border)] hover:bg-[var(--table-row-hover)]"
                    onClick={() => setPickTarget({ kind: "base" })}
                  >
                    Из прайса…
                  </button>
                  {draft.basePriceListItemId ? (
                    <button
                      type="button"
                      className="shrink-0 text-xs text-[var(--text-muted)] underline hover:text-red-700"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          basePriceListItemId: null,
                          basePriceSummary: null,
                          baseActive: false,
                        }))
                      }
                    >
                      Сбросить
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Чекбоксы и прайс
                  </span>
                  <button
                    type="button"
                    className="text-xs font-medium text-[var(--sidebar-blue)] underline hover:no-underline"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        options: [...d.options, newQuickOrderTileOption()],
                      }))
                    }
                  >
                    + Вариант
                  </button>
                </div>
                <ul className="mt-2 space-y-3">
                  {draft.options.length === 0 ? (
                    <li className="text-sm text-[var(--text-muted)]">
                      Нет вариантов — добавьте строку «+ Вариант».
                    </li>
                  ) : null}
                  {draft.options.map((o, idx) => (
                    <li
                      key={o.id}
                      className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-medium uppercase text-[var(--text-placeholder)]">
                          Вариант {idx + 1}
                        </span>
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              options: d.options.filter((x) => x.id !== o.id),
                            }))
                          }
                        >
                          Удалить
                        </button>
                      </div>
                      <input
                        type="text"
                        className="mt-1 w-full rounded border border-[var(--card-border)] px-2 py-1 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1"
                        placeholder="Подпись чекбокса"
                        value={o.label}
                        maxLength={MAX_OPTION_LABEL_LEN}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDraft((d) => ({
                            ...d,
                            options: d.options.map((x) =>
                              x.id === o.id ? { ...x, label: v } : x,
                            ),
                          }));
                        }}
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {o.priceSummary ? (
                          <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-body)]">
                            {o.priceSummary}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--text-placeholder)]">
                            прайс не привязан
                          </span>
                        )}
                        <button
                          type="button"
                          className="shrink-0 rounded bg-[var(--surface-hover)] px-2 py-1 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--surface-hover)]"
                          onClick={() =>
                            setPickTarget({ kind: "option", optionId: o.id })
                          }
                        >
                          К прайсу…
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
            <button
              type="button"
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              type="button"
              disabled={!draft.title.trim()}
              className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={commit}
            >
              Сохранить плашку
            </button>
          </div>
        </div>
      </div>

      <PriceListPickModal
        open={pickTarget != null}
        clinicId={clinicId}
        doctorId={doctorId}
        onClose={() => setPickTarget(null)}
        onPick={applyPricePick}
      />
    </>
  );
}
