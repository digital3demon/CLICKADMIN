"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ContinueWorkSearchDialog,
  type PickedOrder,
} from "./ContinueWorkSearchDialog";
import { QuickOrderTileEditorModal } from "./QuickOrderTileEditorModal";
import { useTheme } from "@/components/providers/ThemeProvider";
import {
  accentBackgroundCss,
  accentTileBackground,
  MAX_QUICK_TILES,
  normalizeAccentColor,
  type QuickOrderState,
  type QuickOrderTile,
} from "./quick-order-types";

/** Общая вёрстка плашки; граница и фон задаются отдельно для «выбрано» / «нет». */
const tileShellBase =
  "flex min-h-[88px] flex-col gap-1.5 rounded-lg p-2 text-left sm:min-h-[92px] sm:p-2.5";

type QuickOrderSectionProps = {
  value: QuickOrderState;
  clinicId?: string | null;
  doctorId?: string | null;
  onChange: (next: QuickOrderState) => void;
};

export function QuickOrderSection({
  value: q,
  clinicId = null,
  doctorId = null,
  onChange,
}: QuickOrderSectionProps) {
  const { resolvedDark } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTileId, setEditingTileId] = useState<string | null>(null);
  const [tileToDeleteId, setTileToDeleteId] = useState<string | null>(null);

  const tiles = q.v === 2 ? q.tiles : [];

  const openCreate = useCallback(() => {
    setEditingTileId(null);
    setEditorOpen(true);
  }, []);

  const openEdit = useCallback((id: string) => {
    setEditingTileId(id);
    setEditorOpen(true);
  }, []);

  const editingTile =
    editingTileId == null
      ? null
      : tiles.find((t) => t.id === editingTileId) ?? null;

  const saveTile = useCallback(
    (tile: QuickOrderTile) => {
      if (editingTileId == null) {
        if (tiles.length >= MAX_QUICK_TILES) return;
        onChange({ ...q, tiles: [...tiles, tile] });
        return;
      }
      onChange({
        ...q,
        tiles: tiles.map((t) => (t.id === tile.id ? tile : t)),
      });
    },
    [editingTileId, onChange, q, tiles],
  );

  const removeTile = useCallback(
    (id: string) => {
      onChange({ ...q, tiles: tiles.filter((t) => t.id !== id) });
    },
    [onChange, q, tiles],
  );

  const patchTile = useCallback(
    (id: string, patch: Partial<QuickOrderTile>) => {
      onChange({
        ...q,
        tiles: tiles.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      });
    },
    [onChange, q, tiles],
  );

  const tilePendingDelete =
    tileToDeleteId == null
      ? null
      : tiles.find((t) => t.id === tileToDeleteId) ?? null;

  useEffect(() => {
    if (!tileToDeleteId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTileToDeleteId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tileToDeleteId]);

  return (
    <>
      <section className="border-t border-[var(--card-border)] pt-3">
        <h3 className="mb-2 text-center text-sm font-semibold uppercase tracking-wide text-[var(--app-text)] sm:text-base">
          Быстрый наряд
        </h3>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {tiles.map((tile) => {
            const accent = normalizeAccentColor(tile.accentColor);
            const hasBase = Boolean(tile.basePriceListItemId?.trim());
            const selected =
              (hasBase && tile.baseActive) ||
              tile.options.some(
                (o) => o.checked && Boolean(o.priceListItemId?.trim()),
              );
            return (
              <div
                key={tile.id}
                role="group"
                aria-label={`Плашка «${tile.title}»`}
                data-selected={selected ? "true" : "false"}
                className={`${tileShellBase} ${
                  selected
                    ? "border-[4px] shadow-md transition-[border-color,box-shadow,background-color]"
                    : "border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm transition-[border-color,background-color]"
                }`}
                style={
                  selected
                    ? {
                        borderColor: accent,
                        backgroundColor: accentTileBackground(accent, resolvedDark),
                        boxShadow: `0 0 0 3px ${accent}, 0 0 32px -2px ${accentBackgroundCss(accent, 0.55)}, 0 14px 36px -10px rgba(0, 0, 0, 0.42)`,
                      }
                    : undefined
                }
              >
                <div className="flex min-w-0 items-start justify-between gap-1">
                  {hasBase ? (
                    <button
                      type="button"
                      aria-pressed={tile.baseActive}
                      className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-blue)]"
                      onClick={() =>
                        patchTile(tile.id, { baseActive: !tile.baseActive })
                      }
                    >
                      <span
                        className={`text-xs font-bold uppercase leading-tight tracking-wide sm:text-sm ${
                          tile.baseActive
                            ? "text-[var(--app-text)]"
                            : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {tile.title}
                      </span>
                      {tile.basePriceSummary ? (
                        <span className="mt-0.5 block truncate text-[10px] font-normal normal-case text-[var(--text-secondary)]">
                          {tile.basePriceSummary}
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold uppercase leading-tight tracking-wide text-[var(--text-strong)] sm:text-sm">
                        {tile.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-normal normal-case text-[var(--text-muted)]">
                        Основной прайс не задан — отметьте варианты ниже
                      </span>
                    </div>
                  )}
                </div>

                {tile.options.length > 0 ? (
                  <ul className="flex flex-col gap-1 border-t border-[var(--card-border)]/80 pt-1.5">
                    {tile.options.map((o) => {
                      const linked = Boolean(o.priceListItemId?.trim());
                      return (
                        <li key={o.id}>
                          <label
                            className={`flex cursor-pointer items-start gap-2 text-xs ${
                              linked
                                ? "text-[var(--text-strong)]"
                                : "cursor-not-allowed text-[var(--text-placeholder)]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-[var(--input-border)] text-[var(--sidebar-blue)] focus:ring-[var(--sidebar-blue)]"
                              checked={Boolean(linked && o.checked)}
                              disabled={!linked}
                              aria-checked={linked ? o.checked : undefined}
                              title={
                                linked
                                  ? undefined
                                  : "Настройте плашку и привяжите позицию прайса"
                              }
                              onChange={() => {
                                if (!linked) return;
                                patchTile(tile.id, {
                                  options: tile.options.map((x) =>
                                    x.id === o.id
                                      ? { ...x, checked: !x.checked }
                                      : x,
                                  ),
                                });
                              }}
                            />
                            <span className="min-w-0 leading-snug">
                              <span className="font-medium">{o.label || "—"}</span>
                              {o.priceSummary ? (
                                <span className="mt-0.5 block truncate text-[10px] text-[var(--text-muted)]">
                                  {o.priceSummary}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-[var(--card-border)]/60 pt-1.5">
                  <button
                    type="button"
                    className="text-[10px] font-semibold uppercase tracking-wide text-[var(--sidebar-blue)] underline hover:no-underline"
                    onClick={() => openEdit(tile.id)}
                  >
                    Настроить
                  </button>
                  <button
                    type="button"
                    className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] underline hover:text-red-700"
                    onClick={() => setTileToDeleteId(tile.id)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            );
          })}

          <div
            className={`${tileShellBase} border-2 border-dashed border-[var(--input-border)] bg-[var(--surface-subtle)]/70 shadow-sm hover:bg-[var(--surface-hover)]`}
          >
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-body)] sm:text-sm">
              Продолжение работы
            </span>
            <button
              type="button"
              className="w-full rounded-md bg-[var(--surface-hover)] px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-strong)] hover:bg-[var(--surface-hover)]"
              onClick={() => setSearchOpen(true)}
            >
              Найти наряд…
            </button>
            {q.continueWork ? (
              <div className="w-full min-w-0 text-xs">
                <Link
                  href={q.continueWork.href}
                  className="break-all font-medium text-[var(--sidebar-blue)] underline hover:no-underline"
                >
                  {q.continueWork.label}
                </Link>
                <button
                  type="button"
                  className="mt-1 block w-full text-left text-[10px] uppercase tracking-wide text-[var(--text-muted)] underline hover:text-[var(--text-strong)]"
                  onClick={() => onChange({ ...q, continueWork: null })}
                >
                  Сбросить
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            disabled={tiles.length >= MAX_QUICK_TILES}
            className={`${tileShellBase} items-center justify-center border-2 border-dashed border-[var(--input-border)] bg-[var(--surface-subtle)]/70 text-center shadow-sm hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50`}
            onClick={openCreate}
          >
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-strong)] sm:text-sm">
              + Плашка
            </span>
            <span className="text-[10px] font-medium text-[var(--text-muted)]">
              название, цвет, прайс, чекбоксы
            </span>
          </button>
        </div>
      </section>

      <QuickOrderTileEditorModal
        open={editorOpen}
        clinicId={clinicId}
        doctorId={doctorId}
        editing={editingTile}
        onClose={() => {
          setEditorOpen(false);
          setEditingTileId(null);
        }}
        onSave={saveTile}
      />

      <ContinueWorkSearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPick={(o: PickedOrder) => {
          onChange({
            ...q,
            continueWork: { href: o.href, label: o.label },
          });
          setSearchOpen(false);
        }}
      />

      {tilePendingDelete ? (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-zinc-900/50 p-4"
          role="presentation"
          onClick={() => setTileToDeleteId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-tile-title"
            className="w-full max-w-sm rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-tile-title"
              className="text-base font-semibold text-[var(--app-text)]"
            >
              Удалить плашку?
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Плашка{" "}
              <strong className="text-[var(--app-text)]">
                «{tilePendingDelete.title.trim() || "без названия"}»
              </strong>{" "}
              и все её настройки будут удалены из быстрого наряда.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
                onClick={() => setTileToDeleteId(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={() => {
                  removeTile(tilePendingDelete.id);
                  setTileToDeleteId(null);
                }}
              >
                Да, удалить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
