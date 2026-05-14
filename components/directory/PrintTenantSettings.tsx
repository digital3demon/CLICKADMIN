"use client";

import { useCallback, useEffect, useState } from "react";
import { ShipmentsStickersSheet } from "@/components/shipments/ShipmentsStickersSheet";
import {
  DEFAULT_STICKER_PRINT_SETTINGS,
  normalizeStickerPrintSettings,
  STICKER_PRINT_SIZE_LIMITS,
  type StickerPrintSettings,
} from "@/lib/sticker-print-settings";

const inputClass =
  "w-28 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)] disabled:cursor-not-allowed disabled:opacity-45";

const previewRows = [
  {
    id: "preview",
    clinicLine: "Частное лицо",
    doctorLine: "Иванов И. И.",
    patientLine: "Петров П. П.",
    orderNumber: "2605-048",
    qrDataUrl:
      "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyOCAyOCI+PHJlY3Qgd2lkdGg9IjI4IiBoZWlnaHQ9IjI4IiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTIgMmgyOHY4SDJ6TTIgMThoOHY4SDJ6TTE4IDJoOHY4aC04ek0xMiAxMmgydjJoLTJ6TTE2IDEyaDJ2Mmg0djJoLTZ6TTEyIDE2aDR2Mmg0djJoLTh6TTE2IDIyaDJ2MmgtMnoiIGZpbGw9IiMwZjE3MmEiLz48L3N2Zz4=",
  },
];

export function PrintTenantSettings({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<StickerPrintSettings>(
    DEFAULT_STICKER_PRINT_SETTINGS,
  );
  const [widthInput, setWidthInput] = useState(String(settings.widthMm));
  const [heightInput, setHeightInput] = useState(String(settings.heightMm));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const applyInputs = useCallback(() => {
    const next = normalizeStickerPrintSettings({
      widthMm: widthInput,
      heightMm: heightInput,
    });
    setSettings(next);
    setWidthInput(String(next.widthMm));
    setHeightInput(String(next.heightMm));
    setOk(false);
    setError(null);
    return next;
  }, [widthInput, heightInput]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/tenant/print-settings", {
          cache: "no-store",
        });
        const j = (await res.json()) as Partial<StickerPrintSettings> & {
          error?: string;
        };
        if (!res.ok) throw new Error(j.error ?? "Ошибка загрузки");
        const next = normalizeStickerPrintSettings(j);
        if (!cancelled) {
          setSettings(next);
          setWidthInput(String(next.widthMm));
          setHeightInput(String(next.heightMm));
        }
      } catch (e) {
        if (!cancelled) {
          setSettings(DEFAULT_STICKER_PRINT_SETTINGS);
          setWidthInput(String(DEFAULT_STICKER_PRINT_SETTINGS.widthMm));
          setHeightInput(String(DEFAULT_STICKER_PRINT_SETTINGS.heightMm));
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

  const save = async () => {
    if (!canEdit) return;
    const next = applyInputs();
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/tenant/print-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const j = (await res.json()) as Partial<StickerPrintSettings> & {
        error?: string;
      };
      if (!res.ok) throw new Error(j.error ?? "Не сохранено");
      const saved = normalizeStickerPrintSettings(j);
      setSettings(saved);
      setWidthInput(String(saved.widthMm));
      setHeightInput(String(saved.heightMm));
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
      <h2 className="m-0 text-base font-semibold text-[var(--app-text)]">
        Этикетки отгрузки
      </h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Размер этикетки для кнопки печати в строке заказа и для общей печати
        этикеток в отгрузках. Диалог печати лучше ставить на масштаб 100 %.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Загрузка…</p>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Ширина, мм
                <input
                  type="number"
                  min={STICKER_PRINT_SIZE_LIMITS.widthMin}
                  max={STICKER_PRINT_SIZE_LIMITS.widthMax}
                  value={widthInput}
                  disabled={!canEdit || saving}
                  onChange={(e) => setWidthInput(e.target.value)}
                  onBlur={applyInputs}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Высота, мм
                <input
                  type="number"
                  min={STICKER_PRINT_SIZE_LIMITS.heightMin}
                  max={STICKER_PRINT_SIZE_LIMITS.heightMax}
                  value={heightInput}
                  disabled={!canEdit || saving}
                  onChange={(e) => setHeightInput(e.target.value)}
                  onBlur={applyInputs}
                  className={inputClass}
                />
              </label>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Допустимо: ширина {STICKER_PRINT_SIZE_LIMITS.widthMin}–
              {STICKER_PRINT_SIZE_LIMITS.widthMax} мм, высота{" "}
              {STICKER_PRINT_SIZE_LIMITS.heightMin}–
              {STICKER_PRINT_SIZE_LIMITS.heightMax} мм.
            </p>
            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={saving}
                  onClick={() => void save()}
                >
                  {saving ? "Сохранение…" : "Сохранить"}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={saving}
                  onClick={() => {
                    setSettings(DEFAULT_STICKER_PRINT_SETTINGS);
                    setWidthInput(String(DEFAULT_STICKER_PRINT_SETTINGS.widthMm));
                    setHeightInput(String(DEFAULT_STICKER_PRINT_SETTINGS.heightMm));
                    setOk(false);
                    setError(null);
                  }}
                >
                  58×40 по умолчанию
                </button>
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                Изменение — только у владельца, старшего или обычного администратора.
              </p>
            )}
            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            {ok ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Сохранено. Новые размеры применятся при следующей печати этикеток.
              </p>
            ) : null}
          </div>

          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Предпросмотр {settings.widthMm}×{settings.heightMm} мм
            </p>
            <div className="overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3">
              <ShipmentsStickersSheet
                rows={previewRows}
                widthMm={settings.widthMm}
                heightMm={settings.heightMm}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
