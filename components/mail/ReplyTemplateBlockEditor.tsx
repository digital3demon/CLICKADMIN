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
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { EmailReplyTemplatePlaceholderBar } from "@/components/mail/EmailReplyTemplatePlaceholderBar";
import { insertTokenIntoControlledInput } from "@/lib/mail/insert-template-token";
import {
  blockStyleForButtonSizePreset,
  buttonSizePresetFromStyle,
  type ButtonSizePreset,
} from "@/lib/mail/reply-block-editor/button-size-presets";
import {
  createClickLabPreset,
  createEmptyBlock,
  newReplyBlockId,
  REPLY_BLOCK_TYPE_LABELS,
  REPLY_EDITOR_FONT_OPTIONS,
  type FooterLink,
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

export type ReplyTemplateBlockEditorHandle = {
  /** Применяет отложенный текст и возвращает актуальный document. */
  flushPendingChanges: () => ReplyEditorDocument;
};

type Props = {
  document: ReplyEditorDocument;
  onChange: (doc: ReplyEditorDocument) => void;
  assets: BlockEditorAsset[];
  disabled?: boolean;
  selectedBlockId?: string | null;
  onSelectedBlockIdChange?: (id: string | null) => void;
  onUploadImage?: (file: File) => Promise<BlockEditorAsset | null>;
};

const BLOCK_TYPES = Object.keys(REPLY_BLOCK_TYPE_LABELS) as ReplyBlockType[];

const BLOCK_TILE_SHORT: Record<ReplyBlockType, string> = {
  hero: "Шапка",
  text: "Текст",
  buttons: "Кнопки",
  image: "Фото",
  divider: "Линия",
  attach_hint: "Файлы",
  footer: "Футер",
};

const TEXT_DEBOUNCE_MS = 120;

function SortableBlockListItem({
  block,
  index,
  selected,
  disabled,
  onSelect,
  onRemove,
}: {
  block: ReplyBlock;
  index: number;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onRemove: () => void;
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
          selected
            ? "bg-[var(--sidebar-blue)] text-white"
            : "text-[var(--app-text)] hover:bg-[var(--surface-hover)]",
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
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={[
            "shrink-0 px-1.5 text-xs",
            selected ? "text-white/90 hover:text-white" : "text-red-600 hover:underline",
          ].join(" ")}
          title="Удалить"
        >
          ×
        </button>
      </div>
    </li>
  );
}

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
        Шрифт блока
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

function FooterLinksEditor({
  links,
  disabled,
  onChange,
}: {
  links: FooterLink[];
  disabled?: boolean;
  onChange: (links: FooterLink[]) => void;
}) {
  const rows = links.length ? links : [{ label: "", href: "" }];
  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--text-secondary)]">Ссылки (до 3)</p>
      {rows.slice(0, 3).map((link, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-2">
          <input
            type="text"
            disabled={disabled}
            placeholder="Подпись"
            value={link.label}
            onChange={(e) => {
              const next = [...rows.slice(0, 3)];
              next[i] = { ...next[i]!, label: e.target.value };
              onChange(next.filter((l) => l.label.trim() || l.href.trim()));
            }}
            className="h-8 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-xs"
          />
          <input
            type="text"
            disabled={disabled}
            placeholder="https://…"
            value={link.href}
            onChange={(e) => {
              const next = [...rows.slice(0, 3)];
              next[i] = { ...next[i]!, href: e.target.value };
              onChange(next.filter((l) => l.label.trim() || l.href.trim()));
            }}
            className="h-8 rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-xs"
          />
        </div>
      ))}
      {rows.length < 3 ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...rows, { label: "", href: "" }].slice(0, 3))}
          className="text-xs font-semibold text-[var(--sidebar-blue)]"
        >
          + Ссылка
        </button>
      ) : null}
    </div>
  );
}

export const ReplyTemplateBlockEditor = forwardRef<ReplyTemplateBlockEditorHandle, Props>(
  function ReplyTemplateBlockEditor(
    {
      document,
      onChange,
      assets,
      disabled = false,
      selectedBlockId: selectedBlockIdProp,
      onSelectedBlockIdChange,
      onUploadImage,
    },
    ref,
  ) {
    const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
      document.blocks[0]?.id ?? null,
    );
    const selectedId = selectedBlockIdProp ?? internalSelectedId;
    const setSelectedId = (id: string | null) => {
      onSelectedBlockIdChange?.(id);
      if (selectedBlockIdProp === undefined) setInternalSelectedId(id);
    };

    const textDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingTextRef = useRef<{
      blockId: string;
      field: "content" | "text";
      value: string;
    } | null>(null);
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
    const textSelectionRef = useRef({ start: 0, end: 0 });
    const [localText, setLocalText] = useState("");

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

    const flushTextPending = useCallback((): ReplyEditorDocument => {
      if (textDebounceRef.current) {
        clearTimeout(textDebounceRef.current);
        textDebounceRef.current = null;
      }
      const pending = pendingTextRef.current;
      if (!pending) return document;
      pendingTextRef.current = null;
      const next: ReplyEditorDocument = {
        ...document,
        blocks: document.blocks.map((b) => {
          if (b.id !== pending.blockId) return b;
          if (pending.field === "content" && b.type === "text") {
            return { ...b, content: pending.value };
          }
          if (pending.field === "text" && b.type === "footer") {
            return { ...b, text: pending.value };
          }
          return b;
        }),
      };
      onChange(next);
      return next;
    }, [document, onChange]);

    useImperativeHandle(ref, () => ({ flushPendingChanges: flushTextPending }), [
      flushTextPending,
    ]);

    useEffect(() => {
      flushTextPending();
      const block = document.blocks.find((b) => b.id === selectedId);
      if (block?.type === "text") setLocalText(block.content);
      else if (block?.type === "footer") setLocalText(block.text);
      else setLocalText("");
      // eslint-disable-next-line react-hooks/exhaustive-deps -- только при смене выбранного блока
    }, [selectedId, flushTextPending]);

    function scheduleTextUpdate(blockId: string, field: "content" | "text", value: string) {
      pendingTextRef.current = { blockId, field, value };
      if (textDebounceRef.current) clearTimeout(textDebounceRef.current);
      textDebounceRef.current = setTimeout(flushTextPending, TEXT_DEBOUNCE_MS);
    }

    function updateBlock(id: string, patch: Partial<ReplyBlock>) {
      flushTextPending();
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
      flushTextPending();
      const oldIndex = document.blocks.findIndex((b) => b.id === active.id);
      const newIndex = document.blocks.findIndex((b) => b.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      onChange({ ...document, blocks: arrayMove(document.blocks, oldIndex, newIndex) });
    }

    function removeBlock(id: string) {
      flushTextPending();
      const blocks = document.blocks.filter((b) => b.id !== id);
      onChange({ ...document, blocks });
      if (selectedId === id) setSelectedId(blocks[0]?.id ?? null);
    }

    function addBlock(type: ReplyBlockType) {
      flushTextPending();
      const block = createEmptyBlock(type, newReplyBlockId());
      onChange({ ...document, blocks: [...document.blocks, block] });
      setSelectedId(block.id);
    }

    function insertTextToken(token: string) {
      const { nextValue, caret } = insertTokenIntoControlledInput(
        localText,
        textSelectionRef.current.start,
        textSelectionRef.current.end,
        token,
      );
      setLocalText(nextValue);
      if (!selected) return;
      const field = selected.type === "footer" ? "text" : "content";
      scheduleTextUpdate(selected.id, field, nextValue);
      requestAnimationFrame(() => {
        const el = textAreaRef.current;
        el?.focus();
        el?.setSelectionRange(caret, caret);
        textSelectionRef.current = { start: caret, end: caret };
      });
    }

    async function handleImageUpload(
      file: File,
      onPicked: (assetId: string) => void,
    ) {
      if (!onUploadImage) return;
      const asset = await onUploadImage(file);
      if (asset?.id) onPicked(asset.id);
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Оформление письма
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-[var(--text-secondary)] sm:col-span-2">
              Ширина, px — {document.global?.contentWidthPx ?? 600}
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
            </label>
            <label className="block text-xs text-[var(--text-secondary)] sm:col-span-2">
              Шрифт по умолчанию
              <select
                disabled={disabled}
                value={document.global?.fontFamily ?? ""}
                onChange={(e) =>
                  onChange({
                    ...document,
                    global: {
                      ...document.global,
                      fontFamily: e.target.value || undefined,
                    },
                  })
                }
                className="mt-1 h-9 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-sm"
              >
                <option value="">Системный</option>
                {REPLY_EDITOR_FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f.split(",")[0]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">Добавить блок</p>
          <div className="flex flex-wrap gap-2">
            {BLOCK_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                disabled={disabled}
                onClick={() => addBlock(t)}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs font-medium hover:bg-[var(--surface-hover)] disabled:opacity-50"
              >
                + {BLOCK_TILE_SHORT[t]}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (window.confirm("Заменить все блоки пресетом Click Lab?")) {
                flushTextPending();
                onChange(createClickLabPreset());
              }
            }}
            className="mt-2 text-xs font-semibold text-[var(--sidebar-blue)] hover:underline disabled:opacity-50"
          >
            Сбросить к пресету Click Lab
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,11rem)_1fr]">
          <div>
            <p className="mb-1 text-xs font-semibold text-[var(--text-secondary)]">Порядок</p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onBlockListDragEnd}
            >
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
                      onRemove={() => removeBlock(block.id)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>

          {selected ? (
            <div className="space-y-4 rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-4">
              <p className="text-sm font-semibold text-[var(--app-text)]">
                {REPLY_BLOCK_TYPE_LABELS[selected.type]}
              </p>

              {selected.type === "hero" ? (
                <>
                  <label className="block text-xs text-[var(--text-secondary)]">
                    Логотип
                    <select
                      disabled={disabled}
                      value={selected.logoAssetId ?? ""}
                      onChange={(e) =>
                        updateBlock(selected.id, { logoAssetId: e.target.value || null })
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
                  {onUploadImage ? (
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--sidebar-blue)]">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={disabled}
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void handleImageUpload(file, (id) => updateBlock(selected.id, { logoAssetId: id }));
                        }}
                      />
                      Загрузить логотип
                    </label>
                  ) : null}
                  <label className="block text-xs text-[var(--text-secondary)]">
                    Ширина логотипа — {selected.logoWidthPx ?? 200} px
                    <input
                      type="range"
                      min={48}
                      max={480}
                      disabled={disabled}
                      value={selected.logoWidthPx ?? 200}
                      onChange={(e) =>
                        updateBlock(selected.id, { logoWidthPx: Number(e.target.value) })
                      }
                      className="mt-1 w-full"
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

              {selected.type === "text" || selected.type === "footer" ? (
                <>
                  <label className="block text-xs text-[var(--text-secondary)]">
                    {selected.type === "footer" ? "Текст футера" : "Текст (абзацы — пустая строка)"}
                    <textarea
                      ref={textAreaRef}
                      disabled={disabled}
                      rows={selected.type === "footer" ? 3 : 8}
                      value={localText}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLocalText(v);
                        scheduleTextUpdate(
                          selected.id,
                          selected.type === "footer" ? "text" : "content",
                          v,
                        );
                      }}
                      onSelect={(e) => {
                        textSelectionRef.current = {
                          start: e.currentTarget.selectionStart ?? 0,
                          end: e.currentTarget.selectionEnd ?? 0,
                        };
                      }}
                      onClick={(e) => {
                        textSelectionRef.current = {
                          start: e.currentTarget.selectionStart ?? 0,
                          end: e.currentTarget.selectionEnd ?? 0,
                        };
                      }}
                      className="mt-1 w-full rounded border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-sm"
                    />
                  </label>
                  <EmailReplyTemplatePlaceholderBar
                    disabled={disabled}
                    onInsert={insertTextToken}
                  />
                  {selected.type === "text" ? (
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
                  ) : (
                    <FooterLinksEditor
                      links={selected.links ?? []}
                      disabled={disabled}
                      onChange={(links) => updateBlock(selected.id, { links })}
                    />
                  )}
                </>
              ) : null}

              {selected.type === "buttons" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-secondary)]">Размер кнопок</span>
                    {(["S", "M", "L"] as ButtonSizePreset[]).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          updateStyle(selected.id, blockStyleForButtonSizePreset(preset))
                        }
                        className={[
                          "rounded-md border px-2.5 py-1 text-xs font-semibold",
                          buttonSizePresetFromStyle(selected.style) === preset
                            ? "border-[var(--sidebar-blue)] bg-[var(--sidebar-blue)] text-white"
                            : "border-[var(--card-border)] bg-[var(--card-bg)]",
                        ].join(" ")}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
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
                  {onUploadImage ? (
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--sidebar-blue)]">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={disabled}
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void handleImageUpload(file, (id) => updateBlock(selected.id, { assetId: id }));
                        }}
                      />
                      Загрузить картинку
                    </label>
                  ) : null}
                  <label className="block text-xs text-[var(--text-secondary)]">
                    Ширина — {selected.widthPx} px
                    <input
                      type="range"
                      min={40}
                      max={800}
                      disabled={disabled}
                      value={selected.widthPx}
                      onChange={(e) =>
                        updateBlock(selected.id, { widthPx: Number(e.target.value) })
                      }
                      className="mt-1 w-full"
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

              {selected.type !== "divider" ? (
                <details className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-[var(--text-secondary)]">
                    Цвета и отступы
                  </summary>
                  <div className="mt-3">
                    <BlockStyleFields
                      block={selected}
                      disabled={disabled}
                      showButtonStyle={selected.type === "buttons"}
                      onUpdate={(patch) => updateStyle(selected.id, patch)}
                    />
                  </div>
                </details>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Выберите блок в списке или кликните на превью справа
            </p>
          )}
        </div>
      </div>
    );
  },
);
