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
import { useMemo, useState } from "react";
import {
  createClickLabPreset,
  createEmptyBlock,
  newReplyBlockId,
  REPLY_BLOCK_TYPE_LABELS,
  REPLY_EDITOR_FONT_OPTIONS,
  type ReplyBlock,
  type ReplyBlockType,
  type ReplyButtonDef,
  type ReplyEditorDocument,
} from "@/lib/mail/reply-block-editor";

export type BlockEditorAsset = {
  id: string;
  fileName: string;
  kind: "INLINE_IMAGE" | "ATTACHMENT";
};

type Props = {
  document: ReplyEditorDocument;
  onChange: (doc: ReplyEditorDocument) => void;
  assets: BlockEditorAsset[];
  disabled?: boolean;
  selectedBlockId?: string | null;
  onSelectedBlockIdChange?: (id: string | null) => void;
};

function SortableBlockListItem({
  block,
  index,
  selected,
  disabled,
  onSelect,
}: {
  block: ReplyBlock;
  index: number;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };
  return (
    <li ref={setNodeRef} style={style}>
      <div
        className={[
          "flex w-full items-center gap-1 rounded-lg px-1 py-0.5",
          selected ? "bg-[var(--sidebar-blue)] text-white" : "text-[var(--app-text)] hover:bg-[var(--surface-hover)]",
        ].join(" ")}
      >
        <button
          type="button"
          disabled={disabled}
          className={[
            "shrink-0 cursor-grab px-1 text-xs active:cursor-grabbing",
            selected ? "text-white/80" : "text-[var(--text-muted)]",
          ].join(" ")}
          title="Перетащить"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onSelect}
          className="min-w-0 flex-1 truncate py-1.5 text-left text-xs font-medium"
        >
          {index + 1}. {REPLY_BLOCK_TYPE_LABELS[block.type]}
        </button>
      </div>
    </li>
  );
}

const BLOCK_TYPES = Object.keys(REPLY_BLOCK_TYPE_LABELS) as ReplyBlockType[];

function ColorInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block text-xs text-[var(--text-secondary)]">
      {label}
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          disabled={disabled}
          value={value?.match(/^#[0-9a-fA-F]{6}$/) ? value : "#2563eb"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-[var(--input-border)]"
        />
        <input
          type="text"
          disabled={disabled}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#2563eb"
          className="h-8 min-w-0 flex-1 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-xs"
        />
      </div>
    </label>
  );
}

function BlockStyleFields({
  block,
  onUpdate,
  disabled,
  showButtonStyle,
}: {
  block: ReplyBlock;
  onUpdate: (patch: Partial<NonNullable<ReplyBlock["style"]>>) => void;
  disabled?: boolean;
  showButtonStyle?: boolean;
}) {
  const style = block.style ?? {};
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ColorInput
        label="Фон"
        value={style.backgroundColor}
        disabled={disabled}
        onChange={(backgroundColor) => onUpdate({ backgroundColor })}
      />
      <ColorInput
        label="Цвет текста"
        value={style.textColor}
        disabled={disabled}
        onChange={(textColor) => onUpdate({ textColor })}
      />
      <label className="block text-xs text-[var(--text-secondary)]">
        Отступ, px
        <input
          type="number"
          min={0}
          max={80}
          disabled={disabled}
          value={style.paddingPx ?? 16}
          onChange={(e) => onUpdate({ paddingPx: Number(e.target.value) })}
          className="mt-1 h-8 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-xs"
        />
      </label>
      <label className="block text-xs text-[var(--text-secondary)]">
        Размер шрифта, px
        <input
          type="number"
          min={10}
          max={36}
          disabled={disabled}
          value={style.fontSizePx ?? 15}
          onChange={(e) => onUpdate({ fontSizePx: Number(e.target.value) })}
          className="mt-1 h-8 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-xs"
        />
      </label>
      <label className="block text-xs text-[var(--text-secondary)] sm:col-span-2">
        Шрифт
        <select
          disabled={disabled}
          value={style.fontFamily ?? ""}
          onChange={(e) => onUpdate({ fontFamily: e.target.value || undefined })}
          className="mt-1 h-8 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-xs"
        >
          <option value="">По умолчанию</option>
          {REPLY_EDITOR_FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f.split(",")[0]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-[var(--text-secondary)]">
        Выравнивание
        <select
          disabled={disabled}
          value={style.align ?? "left"}
          onChange={(e) =>
            onUpdate({ align: e.target.value as "left" | "center" | "right" })
          }
          className="mt-1 h-8 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-xs"
        >
          <option value="left">Слева</option>
          <option value="center">По центру</option>
          <option value="right">Справа</option>
        </select>
      </label>
      {showButtonStyle ? (
        <>
          <ColorInput
            label="Цвет кнопки"
            value={style.buttonBgColor}
            disabled={disabled}
            onChange={(buttonBgColor) => onUpdate({ buttonBgColor })}
          />
          <ColorInput
            label="Текст кнопки"
            value={style.buttonTextColor}
            disabled={disabled}
            onChange={(buttonTextColor) => onUpdate({ buttonTextColor })}
          />
          <label className="block text-xs text-[var(--text-secondary)]">
            Скругление кнопки, px
            <input
              type="number"
              min={0}
              max={24}
              disabled={disabled}
              value={style.buttonRadiusPx ?? 8}
              onChange={(e) => onUpdate({ buttonRadiusPx: Number(e.target.value) })}
              className="mt-1 h-8 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-xs"
            />
          </label>
          <label className="block text-xs text-[var(--text-secondary)]">
            Размер текста кнопки, px
            <input
              type="number"
              min={11}
              max={24}
              disabled={disabled}
              value={style.buttonFontSizePx ?? 15}
              onChange={(e) => onUpdate({ buttonFontSizePx: Number(e.target.value) })}
              className="mt-1 h-8 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-xs"
            />
          </label>
          <label className="block text-xs text-[var(--text-secondary)]">
            Отступ кнопки X, px
            <input
              type="number"
              min={8}
              max={40}
              disabled={disabled}
              value={style.buttonPaddingXPx ?? 20}
              onChange={(e) => onUpdate({ buttonPaddingXPx: Number(e.target.value) })}
              className="mt-1 h-8 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-xs"
            />
          </label>
          <label className="block text-xs text-[var(--text-secondary)]">
            Отступ кнопки Y, px
            <input
              type="number"
              min={6}
              max={24}
              disabled={disabled}
              value={style.buttonPaddingYPx ?? 12}
              onChange={(e) => onUpdate({ buttonPaddingYPx: Number(e.target.value) })}
              className="mt-1 h-8 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-xs"
            />
          </label>
        </>
      ) : null}
    </div>
  );
}

function ButtonEditor({
  btn,
  onChange,
  disabled,
}: {
  btn: ReplyButtonDef;
  onChange: (next: ReplyButtonDef) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3">
      <label className="block text-xs text-[var(--text-secondary)]">
        Подпись
        <input
          type="text"
          disabled={disabled}
          value={btn.label}
          onChange={(e) => onChange({ ...btn, label: e.target.value })}
          className="mt-1 h-8 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-sm"
        />
      </label>
      <label className="block text-xs text-[var(--text-secondary)]">
        Стиль
        <select
          disabled={disabled}
          value={btn.variant}
          onChange={(e) =>
            onChange({ ...btn, variant: e.target.value as ReplyButtonDef["variant"] })
          }
          className="mt-1 h-8 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-xs"
        >
          <option value="primary">Основная</option>
          <option value="secondary">Вторичная</option>
          <option value="outline">Контур</option>
        </select>
      </label>
      <label className="block text-xs text-[var(--text-secondary)]">
        Действие
        <select
          disabled={disabled}
          value={btn.action.type}
          onChange={(e) => {
            const t = e.target.value as ReplyButtonDef["action"]["type"];
            if (t === "tel") onChange({ ...btn, action: { type: "tel", phone: "" } });
            else if (t === "download")
              onChange({ ...btn, action: { type: "download", href: "https://" } });
            else onChange({ ...btn, action: { type: "url", href: "" } });
          }}
          className="mt-1 h-8 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-xs"
        >
          <option value="url">Ссылка</option>
          <option value="download">Скачать (публичный URL)</option>
          <option value="tel">Телефон</option>
        </select>
      </label>
      {btn.action.type === "tel" ? (
        <label className="block text-xs text-[var(--text-secondary)]">
          Номер
          <input
            type="text"
            disabled={disabled}
            value={btn.action.phone}
            onChange={(e) =>
              onChange({ ...btn, action: { type: "tel", phone: e.target.value } })
            }
            className="mt-1 h-8 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-sm"
          />
        </label>
      ) : (
        <label className="block text-xs text-[var(--text-secondary)]">
          {btn.action.type === "download" ? "Публичный URL файла" : "URL"}
          <input
            type="text"
            disabled={disabled}
            value={btn.action.href}
            onChange={(e) =>
              onChange({
                ...btn,
                action: { type: btn.action.type, href: e.target.value },
              } as ReplyButtonDef)
            }
            placeholder="{{orderStatusUrl}} или https://…"
            className="mt-1 h-8 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-sm"
          />
        </label>
      )}
    </div>
  );
}

export function ReplyTemplateBlockEditor({
  document,
  onChange,
  assets,
  disabled = false,
  selectedBlockId: selectedBlockIdProp,
  onSelectedBlockIdChange,
}: Props) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    document.blocks[0]?.id ?? null,
  );
  const selectedId = selectedBlockIdProp ?? internalSelectedId;
  const setSelectedId = (id: string | null) => {
    onSelectedBlockIdChange?.(id);
    if (selectedBlockIdProp === undefined) setInternalSelectedId(id);
  };
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const selected = useMemo(
    () => document.blocks.find((b) => b.id === selectedId) ?? null,
    [document.blocks, selectedId],
  );
  const inlineAssets = useMemo(
    () => assets.filter((a) => a.kind === "INLINE_IMAGE"),
    [assets],
  );

  function updateBlock(id: string, patch: Partial<ReplyBlock>) {
    onChange({
      ...document,
      blocks: document.blocks.map((b) =>
        b.id === id ? ({ ...b, ...patch } as ReplyBlock) : b,
      ),
    });
  }

  function updateStyle(id: string, patch: Partial<NonNullable<ReplyBlock["style"]>>) {
    const block = document.blocks.find((b) => b.id === id);
    if (!block) return;
    updateBlock(id, { style: { ...block.style, ...patch } });
  }

  function onBlockListDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = document.blocks.findIndex((b) => b.id === active.id);
    const newIndex = document.blocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange({ ...document, blocks: arrayMove(document.blocks, oldIndex, newIndex) });
  }

  function removeBlock(id: string) {
    const blocks = document.blocks.filter((b) => b.id !== id);
    onChange({ ...document, blocks });
    if (selectedId === id) setSelectedId(blocks[0]?.id ?? null);
  }

  function addBlock(type: ReplyBlockType) {
    const block = createEmptyBlock(type, newReplyBlockId());
    onChange({ ...document, blocks: [...document.blocks, block] });
    setSelectedId(block.id);
  }

  return (
    <div className="space-y-4">
      <label className="block text-xs text-[var(--text-secondary)]">
        Ширина письма, px
        <input
          type="range"
          min={320}
          max={720}
          step={10}
          disabled={disabled}
          value={document.global?.contentWidthPx ?? 600}
          onChange={(e) =>
            onChange({
              ...document,
              global: {
                ...document.global,
                contentWidthPx: Number(e.target.value),
              },
            })
          }
          className="mt-1 w-full"
        />
        <span className="text-[10px] text-[var(--text-muted)]">
          {document.global?.contentWidthPx ?? 600} px
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <select
          disabled={disabled}
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value as ReplyBlockType;
            if (v) addBlock(v);
            e.target.value = "";
          }}
          className="h-9 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-sm"
        >
          <option value="">+ Добавить блок</option>
          {BLOCK_TYPES.map((t) => (
            <option key={t} value={t}>
              {REPLY_BLOCK_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (window.confirm("Заменить все блоки пресетом Click Lab?")) {
              onChange(createClickLabPreset());
            }
          }}
          className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--surface-hover)] disabled:opacity-50"
        >
          Пресет Click Lab
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,12rem)_1fr]">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onBlockListDragEnd}>
          <SortableContext
            items={document.blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-1">
              {document.blocks.map((block, index) => (
                <SortableBlockListItem
                  key={block.id}
                  block={block}
                  index={index}
                  selected={selectedId === block.id}
                  disabled={disabled}
                  onSelect={() => setSelectedId(block.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        {selected ? (
          <div className="space-y-4 rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--app-text)]">
                {REPLY_BLOCK_TYPE_LABELS[selected.type]}
              </p>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeBlock(selected.id)}
                className="text-xs text-red-600 hover:underline dark:text-red-300"
              >
                Удалить
              </button>
            </div>

            {selected.type === "hero" ? (
              <>
                <label className="block text-xs text-[var(--text-secondary)]">
                  Логотип
                  <select
                    disabled={disabled}
                    value={selected.logoAssetId ?? ""}
                    onChange={(e) =>
                      updateBlock(selected.id, {
                        logoAssetId: e.target.value || null,
                      })
                    }
                    className="mt-1 h-9 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-sm"
                  >
                    <option value="">Без лого</option>
                    {inlineAssets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.fileName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-[var(--text-secondary)]">
                  Ширина логотипа, px
                  <input
                    type="number"
                    min={48}
                    max={480}
                    disabled={disabled}
                    value={selected.logoWidthPx ?? 200}
                    onChange={(e) =>
                      updateBlock(selected.id, { logoWidthPx: Number(e.target.value) })
                    }
                    className="mt-1 h-8 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-xs"
                  />
                </label>
                <label className="block text-xs text-[var(--text-secondary)]">
                  Заголовок
                  <input
                    type="text"
                    disabled={disabled}
                    value={selected.headline}
                    onChange={(e) => updateBlock(selected.id, { headline: e.target.value })}
                    className="mt-1 h-9 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={Boolean(selected.editableHeadlineInPreflight)}
                    onChange={(e) =>
                      updateBlock(selected.id, {
                        editableHeadlineInPreflight: e.target.checked,
                      })
                    }
                  />
                  Редактировать при отправке наряда
                </label>
                <label className="block text-xs text-[var(--text-secondary)]">
                  Подзаголовок
                  <input
                    type="text"
                    disabled={disabled}
                    value={selected.subtitle ?? ""}
                    onChange={(e) => updateBlock(selected.id, { subtitle: e.target.value })}
                    className="mt-1 h-9 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-sm"
                  />
                </label>
              </>
            ) : null}

            {selected.type === "text" ? (
              <>
                <label className="block text-xs text-[var(--text-secondary)]">
                  Текст (абзацы — пустая строка)
                  <textarea
                    disabled={disabled}
                    rows={8}
                    value={selected.content}
                    onChange={(e) => updateBlock(selected.id, { content: e.target.value })}
                    className="mt-1 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={Boolean(selected.editableInPreflight)}
                    onChange={(e) =>
                      updateBlock(selected.id, { editableInPreflight: e.target.checked })
                    }
                  />
                  Редактировать при отправке наряда
                </label>
              </>
            ) : null}

            {selected.type === "buttons" ? (
              <div className="space-y-3">
                {selected.buttons.map((btn) => (
                  <ButtonEditor
                    key={btn.id}
                    btn={btn}
                    disabled={disabled}
                    onChange={(next) =>
                      updateBlock(selected.id, {
                        buttons: selected.buttons.map((b) =>
                          b.id === btn.id ? next : b,
                        ),
                      })
                    }
                  />
                ))}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    updateBlock(selected.id, {
                      buttons: [
                        ...selected.buttons,
                        {
                          id: newReplyBlockId(),
                          label: "Кнопка",
                          variant: "primary",
                          action: { type: "url", href: "" },
                        },
                      ],
                    })
                  }
                  className="text-xs font-semibold text-[var(--sidebar-blue)]"
                >
                  + Кнопка
                </button>
              </div>
            ) : null}

            {selected.type === "image" ? (
              <>
                <label className="block text-xs text-[var(--text-secondary)]">
                  Картинка
                  <select
                    disabled={disabled}
                    value={selected.assetId}
                    onChange={(e) => updateBlock(selected.id, { assetId: e.target.value })}
                    className="mt-1 h-9 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-sm"
                  >
                    <option value="">Выберите файл</option>
                    {inlineAssets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.fileName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-[var(--text-secondary)]">
                  Ширина, px
                  <input
                    type="number"
                    min={40}
                    max={800}
                    disabled={disabled}
                    value={selected.widthPx}
                    onChange={(e) =>
                      updateBlock(selected.id, { widthPx: Number(e.target.value) })
                    }
                    className="mt-1 h-8 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-xs"
                  />
                </label>
              </>
            ) : null}

            {selected.type === "divider" ? (
              <>
                <label className="block text-xs text-[var(--text-secondary)]">
                  Высота, px
                  <input
                    type="number"
                    min={4}
                    max={80}
                    disabled={disabled}
                    value={selected.heightPx}
                    onChange={(e) =>
                      updateBlock(selected.id, { heightPx: Number(e.target.value) })
                    }
                    className="mt-1 h-8 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-xs"
                  />
                </label>
                <ColorInput
                  label="Цвет"
                  value={selected.color}
                  disabled={disabled}
                  onChange={(color) => updateBlock(selected.id, { color })}
                />
              </>
            ) : null}

            {selected.type === "attach_hint" ? (
              <label className="block text-xs text-[var(--text-secondary)]">
                Текст
                <input
                  type="text"
                  disabled={disabled}
                  value={selected.text}
                  onChange={(e) => updateBlock(selected.id, { text: e.target.value })}
                  className="mt-1 h-9 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-sm"
                />
              </label>
            ) : null}

            {selected.type === "footer" ? (
              <label className="block text-xs text-[var(--text-secondary)]">
                Текст футера
                <textarea
                  disabled={disabled}
                  rows={3}
                  value={selected.text}
                  onChange={(e) => updateBlock(selected.id, { text: e.target.value })}
                  className="mt-1 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-sm"
                />
              </label>
            ) : null}

            {selected.type !== "divider" ? (
              <BlockStyleFields
                block={selected}
                disabled={disabled}
                showButtonStyle={selected.type === "buttons"}
                onUpdate={(patch) => updateStyle(selected.id, patch)}
              />
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Выберите блок или добавьте новый</p>
        )}
      </div>
    </div>
  );
}
