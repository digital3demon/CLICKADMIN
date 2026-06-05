"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  StickerLabelOne,
  type StickerLabelData,
} from "@/components/stickers/StickerLabelView";
import {
  STICKER_BLOCK_DEFS,
  STICKER_BLOCK_IDS,
  STICKER_TEMPLATE_LIMITS,
  clonePreset,
  createDefaultPreset,
  newPresetId,
  normalizeStickerPrintSettingsV2,
  type StickerBlockId,
  type StickerPrintSettingsV2,
  type StickerTemplateBlock,
  type StickerTemplatePreset,
} from "@/lib/sticker-template";
import {
  DEFAULT_STICKER_PRINT_SETTINGS,
  STICKER_PRINT_SIZE_LIMITS,
} from "@/lib/sticker-print-settings";

const inputClass =
  "w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)] disabled:cursor-not-allowed disabled:opacity-45";

const previewData: StickerLabelData = {
  clinicLine: "Частное лицо",
  addressLine: "г. Москва, ул. Примерная, д. 1",
  doctorLine: "Иванов И. И.",
  patientLine: "Петров П. П.",
  orderNumber: "2605-048",
  qrDataUrl:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyOCAyOCI+PHJlY3Qgd2lkdGg9IjI4IiBoZWlnaHQ9IjI4IiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTIgMmgyOHY4SDJ6TTIgMThoOHY4SDJ6TTE4IDJoOHY4aC04ek0xMiAxMmgydjJoLTJ6TTE2IDEyaDJ2Mmg0djJoLTZ6TTEyIDE2aDR2Mmg0djJoLTh6TTE2IDIyaDJ2MmgtMnoiIGZpbGw9IiMwZjE3MmEiLz48L3N2Zz4=",
};

function updateBlock(
  preset: StickerTemplatePreset,
  id: StickerBlockId,
  patch: Partial<StickerTemplateBlock>,
): StickerTemplatePreset {
  return {
    ...preset,
    blocks: preset.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
  };
}

type DragState = {
  id: StickerBlockId;
  startX: number;
  startY: number;
  originXPct: number;
  originYPct: number;
};

export function StickerTemplateEditor({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<StickerPrintSettingsV2>(() =>
    normalizeStickerPrintSettingsV2(null),
  );
  const [draft, setDraft] = useState<StickerTemplatePreset>(() =>
    createDefaultPreset(),
  );
  const [selectedId, setSelectedId] = useState<StickerBlockId>("clinic");
  const [presetName, setPresetName] = useState("Основной");
  const [widthInput, setWidthInput] = useState(String(draft.widthMm));
  const [heightInput, setHeightInput] = useState(String(draft.heightMm));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const applySizeInputs = useCallback(() => {
    const next = normalizeStickerPrintSettingsV2({
      version: 2,
      activePresetId: settings.activePresetId,
      presets: [
        {
          ...draft,
          widthMm: widthInput,
          heightMm: heightInput,
        },
      ],
    }).presets[0]!;
    setDraft(next);
    setWidthInput(String(next.widthMm));
    setHeightInput(String(next.heightMm));
    setOk(false);
    return next;
  }, [draft, heightInput, settings.activePresetId, widthInput]);

  const loadPresetIntoDraft = useCallback((preset: StickerTemplatePreset) => {
    setDraft(preset);
    setPresetName(preset.name);
    setWidthInput(String(preset.widthMm));
    setHeightInput(String(preset.heightMm));
    setSelectedId("clinic");
    setOk(false);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/tenant/print-settings", {
          cache: "no-store",
        });
        const j = (await res.json()) as Partial<StickerPrintSettingsV2> & {
          error?: string;
        };
        if (!res.ok) throw new Error(j.error ?? "Ошибка загрузки");
        const next = normalizeStickerPrintSettingsV2(j);
        if (cancelled) return;
        setSettings(next);
        const active =
          next.presets.find((p) => p.id === next.activePresetId) ??
          next.presets[0]!;
        loadPresetIntoDraft(active);
      } catch (e) {
        if (!cancelled) {
          const fallback = normalizeStickerPrintSettingsV2(null);
          setSettings(fallback);
          loadPresetIntoDraft(fallback.presets[0]!);
          setError(e instanceof Error ? e.message : "Ошибка");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPresetIntoDraft]);

  const selectedBlock = useMemo(
    () => draft.blocks.find((b) => b.id === selectedId) ?? draft.blocks[0]!,
    [draft.blocks, selectedId],
  );

  const onBlockPointerDown = useCallback(
    (id: StickerBlockId, e: ReactPointerEvent<HTMLDivElement>) => {
      if (!canEdit) return;
      e.preventDefault();
      e.stopPropagation();
      setSelectedId(id);
      const block = draft.blocks.find((b) => b.id === id);
      const canvas = canvasRef.current;
      if (!block || !canvas) return;
      dragRef.current = {
        id,
        startX: e.clientX,
        startY: e.clientY,
        originXPct: block.xPct,
        originYPct: block.yPct,
      };

      const onMove = (ev: PointerEvent) => {
        const drag = dragRef.current;
        const root = canvasRef.current;
        if (!drag || !root) return;
        const rect = root.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const dxPct = ((ev.clientX - drag.startX) / rect.width) * 100;
        const dyPct = ((ev.clientY - drag.startY) / rect.height) * 100;
        const xPct = Math.min(
          STICKER_TEMPLATE_LIMITS.xPctMax,
          Math.max(STICKER_TEMPLATE_LIMITS.xPctMin, drag.originXPct + dxPct),
        );
        const yPct = Math.min(
          STICKER_TEMPLATE_LIMITS.yPctMax,
          Math.max(STICKER_TEMPLATE_LIMITS.yPctMin, drag.originYPct + dyPct),
        );
        setDraft((prev) => updateBlock(prev, drag.id, { xPct, yPct }));
        setOk(false);
      };

      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [canEdit, draft.blocks],
  );

  const persistSettings = async (
    nextSettings: StickerPrintSettingsV2,
    savedDraft: StickerTemplatePreset,
  ) => {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/tenant/print-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings),
      });
      const j = (await res.json()) as Partial<StickerPrintSettingsV2> & {
        error?: string;
      };
      if (!res.ok) throw new Error(j.error ?? "Не сохранено");
      const saved = normalizeStickerPrintSettingsV2(j);
      setSettings(saved);
      const active =
        saved.presets.find((p) => p.id === saved.activePresetId) ??
        saved.presets[0]!;
      loadPresetIntoDraft(
        active.id === savedDraft.id ? savedDraft : active,
      );
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const saveCurrentPreset = async (makeActive: boolean) => {
    if (!canEdit) return;
    const sized = applySizeInputs();
    const named: StickerTemplatePreset = {
      ...sized,
      name: presetName.trim() || sized.name,
    };
    const presets = settings.presets.map((p) =>
      p.id === named.id ? named : p,
    );
    const hasId = presets.some((p) => p.id === named.id);
    const mergedPresets = hasId ? presets : [...presets, named];
    const next: StickerPrintSettingsV2 = {
      version: 2,
      activePresetId: makeActive ? named.id : settings.activePresetId,
      presets: mergedPresets,
    };
    setDraft(named);
    await persistSettings(next, named);
  };

  const saveAsNewPreset = async () => {
    if (!canEdit) return;
    const sized = applySizeInputs();
    const id = newPresetId();
    const name = presetName.trim() || `Пресет ${settings.presets.length + 1}`;
    const created = clonePreset(sized, id, name);
    const next: StickerPrintSettingsV2 = {
      version: 2,
      activePresetId: id,
      presets: [...settings.presets, created],
    };
    setDraft(created);
    setPresetName(name);
    await persistSettings(next, created);
  };

  const deleteCurrentPreset = async () => {
    if (!canEdit || settings.presets.length <= 1) return;
    const remaining = settings.presets.filter((p) => p.id !== draft.id);
    const next: StickerPrintSettingsV2 = {
      version: 2,
      activePresetId:
        settings.activePresetId === draft.id
          ? remaining[0]!.id
          : settings.activePresetId,
      presets: remaining,
    };
    const fallback =
      remaining.find((p) => p.id === next.activePresetId) ?? remaining[0]!;
    loadPresetIntoDraft(fallback);
    await persistSettings(next, fallback);
  };

  const selectPreset = (id: string) => {
    const preset = settings.presets.find((p) => p.id === id);
    if (preset) loadPresetIntoDraft(preset);
  };

  const resetToDefaultLayout = () => {
    const next = createDefaultPreset(draft.widthMm, draft.heightMm, draft.name, draft.id);
    setDraft(next);
    setOk(false);
  };

  const patchSelected = (patch: Partial<StickerTemplateBlock>) => {
    setDraft((prev) => updateBlock(prev, selectedId, patch));
    setOk(false);
  };

  const editorCss = useMemo(
    () => `
      .sticker-editor-canvas .sticker-page--template {
        position: relative;
        width: var(--sticker-w);
        height: var(--sticker-h);
        box-sizing: border-box;
        padding: 1.2mm 1.4mm;
        overflow: hidden;
        background: #fff;
        color: #0f172a;
        border: 1px solid #94a3b8;
        border-radius: 1.2mm;
        font-family: var(--font-body-loaded), "Muller", ui-sans-serif, system-ui, sans-serif;
      }
      .sticker-editor-canvas .sticker-tpl-block {
        position: absolute;
        max-width: 96%;
        z-index: 1;
      }
      .sticker-editor-canvas .sticker-tpl-block--field {
        display: flex;
        gap: 1.5mm;
        align-items: baseline;
        line-height: 1.05;
      }
      .sticker-editor-canvas .sticker-tpl-k {
        font-weight: 700;
        color: #475569;
        white-space: nowrap;
      }
      .sticker-editor-canvas .sticker-tpl-v {
        font-weight: 800;
        color: #0f172a;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .sticker-editor-canvas .sticker-tpl-block--qr {
        display: flex;
        align-items: flex-end;
        gap: 0.7mm;
      }
      .sticker-editor-canvas .sticker-tpl-qr-img {
        width: 14.2mm;
        height: 14.2mm;
        object-fit: contain;
      }
      .sticker-editor-canvas .sticker-tpl-scan-caption {
        display: flex;
        align-items: flex-end;
        gap: 0.25mm;
        height: 14.2mm;
        font-size: 6pt;
        font-weight: 800;
        color: #334155;
      }
      .sticker-editor-canvas .sticker-tpl-scan-word {
        writing-mode: vertical-rl;
        transform: rotate(180deg);
      }
      .sticker-editor-canvas .sticker-tpl-logo-img {
        height: 13.9mm;
        width: auto;
        max-width: 31mm;
        object-fit: contain;
      }
      .sticker-editor-canvas .sticker-tpl-block--selected {
        outline: 2px dashed #2563eb;
        outline-offset: 1px;
        z-index: 3;
        cursor: grab;
      }
    `,
    [],
  );

  if (loading) {
    return (
      <p className="text-sm text-[var(--text-muted)]">Загрузка шаблона…</p>
    );
  }

  const isActive = settings.activePresetId === draft.id;
  const selectedKind = STICKER_BLOCK_DEFS[selectedBlock.id].kind;

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
      <h2 className="m-0 text-base font-semibold text-[var(--app-text)]">
        Этикетки отгрузки
      </h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Настройка макета для всех пользователей организации. Перетаскивайте блоки
        на предпросмотре, меняйте шрифт и масштаб. Сохранённый пресет используется
        при печати из отгрузок и строки заказа.
      </p>

      <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="space-y-4">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Пресет
            <select
              className={inputClass}
              value={draft.id}
              disabled={saving}
              onChange={(e) => selectPreset(e.target.value)}
            >
              {settings.presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.id === settings.activePresetId ? " · для печати" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Название пресета
            <input
              type="text"
              maxLength={STICKER_TEMPLATE_LIMITS.presetNameMax}
              value={presetName}
              disabled={!canEdit || saving}
              onChange={(e) => {
                setPresetName(e.target.value);
                setOk(false);
              }}
              className={inputClass}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Ширина, мм
              <input
                type="number"
                min={STICKER_PRINT_SIZE_LIMITS.widthMin}
                max={STICKER_PRINT_SIZE_LIMITS.widthMax}
                value={widthInput}
                disabled={!canEdit || saving}
                onChange={(e) => setWidthInput(e.target.value)}
                onBlur={applySizeInputs}
                className="w-28 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm"
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
                onBlur={applySizeInputs}
                className="w-28 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-sm"
              />
            </label>
          </div>

          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Блоки
            </p>
            <ul className="mt-2 space-y-1">
              {STICKER_BLOCK_IDS.map((id) => {
                const block = draft.blocks.find((b) => b.id === id)!;
                const def = STICKER_BLOCK_DEFS[id];
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={[
                        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm",
                        selectedId === id
                          ? "bg-[var(--accent-selection-bg)] text-[var(--app-text)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
                      ].join(" ")}
                      onClick={() => setSelectedId(id)}
                    >
                      <span>{def.label}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {block.visible ? "вкл" : "выкл"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3 space-y-3">
            <p className="text-sm font-medium text-[var(--app-text)]">
              {STICKER_BLOCK_DEFS[selectedBlock.id].label}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedBlock.visible}
                disabled={!canEdit || saving}
                onChange={(e) => patchSelected({ visible: e.target.checked })}
              />
              Показывать на этикетке
            </label>
            {selectedKind === "field" ? (
              <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
                Размер шрифта, pt
                <input
                  type="range"
                  min={STICKER_TEMPLATE_LIMITS.fontSizeMin}
                  max={STICKER_TEMPLATE_LIMITS.fontSizeMax}
                  step={0.1}
                  value={selectedBlock.fontSizePt}
                  disabled={!canEdit || saving}
                  onChange={(e) =>
                    patchSelected({ fontSizePt: Number(e.target.value) })
                  }
                />
                <span className="text-[var(--app-text)]">
                  {selectedBlock.fontSizePt.toFixed(1)} pt
                </span>
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
              Масштаб
              <input
                type="range"
                min={STICKER_TEMPLATE_LIMITS.scaleMin}
                max={STICKER_TEMPLATE_LIMITS.scaleMax}
                step={0.05}
                value={selectedBlock.scale}
                disabled={!canEdit || saving}
                onChange={(e) =>
                  patchSelected({ scale: Number(e.target.value) })
                }
              />
              <span className="text-[var(--app-text)]">
                {Math.round(selectedBlock.scale * 100)} %
              </span>
            </label>
            <p className="text-xs text-[var(--text-muted)]">
              Позиция: {selectedBlock.xPct.toFixed(1)} % ×{" "}
              {selectedBlock.yPct.toFixed(1)} % — перетащите блок на макете.
            </p>
          </div>

          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-40"
                disabled={saving}
                onClick={() => void saveCurrentPreset(true)}
              >
                {saving ? "Сохранение…" : "Сохранить для всех"}
              </button>
              <button
                type="button"
                className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)] disabled:opacity-40"
                disabled={saving}
                onClick={() => void saveAsNewPreset()}
              >
                Сохранить как новый
              </button>
              <button
                type="button"
                className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)] disabled:opacity-40"
                disabled={saving || settings.presets.length <= 1}
                onClick={() => void deleteCurrentPreset()}
              >
                Удалить пресет
              </button>
              <button
                type="button"
                className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)] disabled:opacity-40"
                disabled={saving}
                onClick={resetToDefaultLayout}
              >
                Сбросить расположение
              </button>
              <button
                type="button"
                className="rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)] disabled:opacity-40"
                disabled={saving}
                onClick={() => {
                  setDraft(
                    createDefaultPreset(
                      DEFAULT_STICKER_PRINT_SETTINGS.widthMm,
                      DEFAULT_STICKER_PRINT_SETTINGS.heightMm,
                      draft.name,
                      draft.id,
                    ),
                  );
                  setWidthInput(String(DEFAULT_STICKER_PRINT_SETTINGS.widthMm));
                  setHeightInput(String(DEFAULT_STICKER_PRINT_SETTINGS.heightMm));
                  setOk(false);
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

          {!isActive ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Этот пресет не используется для печати. Нажмите «Сохранить для всех»,
              чтобы сделать его активным.
            </p>
          ) : null}

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {ok ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Сохранено. Макет применится у всех пользователей при следующей печати.
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Предпросмотр {draft.widthMm}×{draft.heightMm} мм
            {canEdit ? " · перетаскивание блоков" : ""}
          </p>
          <style>{editorCss}</style>
          <div
            ref={canvasRef}
            className="sticker-editor-canvas overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4"
          >
            <StickerLabelOne
              data={previewData}
              preset={draft}
              editorMode={canEdit}
              selectedBlockId={selectedId}
              onSelectBlock={setSelectedId}
              onBlockPointerDown={onBlockPointerDown}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
