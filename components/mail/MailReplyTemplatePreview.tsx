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
import { useCallback, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import {
  defaultReplySubject,
  renderEmailReplyTemplate,
} from "@/lib/mail/email-reply-template";
import {
  REPLY_BLOCK_TYPE_LABELS,
  createClickLabPreset,
  renderReplyBlocksHtml,
  renderSingleReplyBlockHtml,
  SAMPLE_ORDER_STATUS_URL,
  type ReplyBlock,
  type ReplyEditorDocument,
  type ReplyLayoutType,
} from "@/lib/mail/reply-block-editor";
import { substituteReplyTemplateCidsForPreview } from "@/lib/mail/reply-template-cid";

const SAMPLE_CONTEXT = {
  orderNumber: "2606-285",
  patientName: "Иванова А. С.",
  doctorName: "Петров П. П.",
  clinicName: "Клиника «Альфа»",
  clinicAddress: "ул. Ленина, 1",
  date: "20.06.26",
  dueDate: "22.06.26, 14:00",
  appointmentDate: "25.06.26, 10:00",
  originalSubject: "Заказ на коронки",
  originalFrom: "Клиника <clinic@example.com>",
  orderStatusUrl: SAMPLE_ORDER_STATUS_URL,
};

type AssetPreview = { id: string; contentId: string };

type InteractiveProps = {
  document: ReplyEditorDocument;
  onDocumentChange: (doc: ReplyEditorDocument) => void;
  selectedBlockId: string | null;
  onSelectBlockId: (id: string | null) => void;
  disabled?: boolean;
};

function reorderBlocks(doc: ReplyEditorDocument, activeId: string, overId: string): ReplyEditorDocument {
  const oldIndex = doc.blocks.findIndex((b) => b.id === activeId);
  const newIndex = doc.blocks.findIndex((b) => b.id === overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return doc;
  return { ...doc, blocks: arrayMove(doc.blocks, oldIndex, newIndex) };
}

function WidthResizeHandle({
  disabled,
  onResize,
}: {
  disabled?: boolean;
  onResize: (deltaPx: number) => void;
}) {
  const lastX = useRef(0);
  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    lastX.current = e.clientX;
    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - lastX.current;
      if (delta !== 0) {
        lastX.current = ev.clientX;
        onResize(delta);
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  return (
    <button
      type="button"
      aria-label="Изменить ширину"
      disabled={disabled}
      onPointerDown={onPointerDown}
      className="absolute bottom-1 right-1 z-10 flex h-6 w-6 cursor-ew-resize items-center justify-center rounded-md border border-blue-400 bg-white/95 text-[10px] font-bold text-blue-600 shadow-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
      title="Потяните для изменения ширины"
    >
      ↔
    </button>
  );
}

function ScaleResizeHandle({
  disabled,
  onResize,
}: {
  disabled?: boolean;
  onResize: (deltaPx: number) => void;
}) {
  const lastY = useRef(0);
  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    lastY.current = e.clientY;
    const onMove = (ev: PointerEvent) => {
      const delta = lastY.current - ev.clientY;
      if (delta !== 0) {
        lastY.current = ev.clientY;
        onResize(delta);
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  return (
    <button
      type="button"
      aria-label="Изменить размер"
      disabled={disabled}
      onPointerDown={onPointerDown}
      className="absolute bottom-1 right-1 z-10 flex h-6 w-6 cursor-ns-resize items-center justify-center rounded-md border border-blue-400 bg-white/95 text-[10px] font-bold text-blue-600 shadow-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
      title="Потяните для масштаба"
    >
      ↕
    </button>
  );
}

function SortablePreviewBlock({
  block,
  html,
  selected,
  disabled,
  onSelect,
  onResizeWidth,
  onResizeScale,
}: {
  block: ReplyBlock;
  html: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onResizeWidth?: (delta: number) => void;
  onResizeScale?: (delta: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "group relative rounded-md",
        selected ? "ring-2 ring-[var(--sidebar-blue)] ring-offset-1" : "hover:ring-1 hover:ring-blue-200",
      ].join(" ")}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <div className="absolute left-1 top-1 z-10 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          disabled={disabled}
          className="cursor-grab rounded border border-[var(--card-border)] bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] shadow-sm active:cursor-grabbing"
          title="Перетащите блок"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        <span className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] shadow-sm">
          {REPLY_BLOCK_TYPE_LABELS[block.type]}
        </span>
      </div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {onResizeWidth ? (
        <WidthResizeHandle disabled={disabled} onResize={onResizeWidth} />
      ) : null}
      {onResizeScale ? (
        <ScaleResizeHandle disabled={disabled} onResize={onResizeScale} />
      ) : null}
    </div>
  );
}

function InteractiveBlocksPreview({
  document,
  onDocumentChange,
  selectedBlockId,
  onSelectBlockId,
  assets,
  accountId,
  disabled,
}: InteractiveProps & { assets: AssetPreview[]; accountId?: string }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const contentWidth = document.global?.contentWidthPx ?? 600;
  const globalFont = document.global?.fontFamily;

  const blockHtmlById = useMemo(() => {
    const map = new Map<string, string>();
    for (const block of document.blocks) {
      let html = renderSingleReplyBlockHtml(block, SAMPLE_CONTEXT, assets, {
        globalFont,
        contentWidthPx: contentWidth,
      });
      if (accountId) {
        html = substituteReplyTemplateCidsForPreview(html, assets, accountId);
      }
      map.set(block.id, html);
    }
    return map;
  }, [document.blocks, assets, accountId, contentWidth, globalFont]);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      onDocumentChange(reorderBlocks(document, String(active.id), String(over.id)));
    },
    [document, onDocumentChange],
  );

  function patchBlock(id: string, patch: Partial<ReplyBlock>) {
    onDocumentChange({
      ...document,
      blocks: document.blocks.map((b) =>
        b.id === id ? ({ ...b, ...patch } as ReplyBlock) : b,
      ),
    });
  }

  function patchBlockStyle(id: string, patch: Partial<NonNullable<ReplyBlock["style"]>>) {
    const block = document.blocks.find((b) => b.id === id);
    if (!block) return;
    patchBlock(id, { style: { ...block.style, ...patch } });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={document.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div
          className="mx-auto space-y-0 bg-[#f3f4f6] p-2"
          style={{ maxWidth: contentWidth + 16 }}
          onClick={() => onSelectBlockId(null)}
        >
          {document.blocks.map((block) => {
            const html = blockHtmlById.get(block.id) ?? "";
            const selected = selectedBlockId === block.id;
            let onResizeWidth: ((d: number) => void) | undefined;
            let onResizeScale: ((d: number) => void) | undefined;

            if (block.type === "image") {
              onResizeWidth = (delta) => {
                const next = Math.min(800, Math.max(40, block.widthPx + delta));
                patchBlock(block.id, { widthPx: next });
              };
            } else if (block.type === "hero") {
              onResizeWidth = (delta) => {
                const cur = block.logoWidthPx ?? 200;
                const next = Math.min(480, Math.max(48, cur + delta));
                patchBlock(block.id, { logoWidthPx: next });
              };
            } else if (block.type === "buttons") {
              onResizeScale = (delta) => {
                const style = block.style ?? {};
                const fontSize = Math.min(24, Math.max(11, (style.buttonFontSizePx ?? 15) + Math.round(delta / 4)));
                const padY = Math.min(24, Math.max(6, (style.buttonPaddingYPx ?? 12) + Math.round(delta / 6)));
                const padX = Math.min(40, Math.max(8, (style.buttonPaddingXPx ?? 20) + Math.round(delta / 5)));
                patchBlockStyle(block.id, {
                  buttonFontSizePx: fontSize,
                  buttonPaddingYPx: padY,
                  buttonPaddingXPx: padX,
                });
              };
            }

            return (
              <SortablePreviewBlock
                key={block.id}
                block={block}
                html={html}
                selected={selected}
                disabled={disabled}
                onSelect={() => onSelectBlockId(block.id)}
                onResizeWidth={onResizeWidth}
                onResizeScale={onResizeScale}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function MailReplyTemplatePreview({
  subjectTemplate,
  htmlTemplate,
  layoutType = "freeform",
  editorDocument,
  assets = [],
  accountId,
  interactive,
}: {
  subjectTemplate: string;
  htmlTemplate: string;
  layoutType?: ReplyLayoutType;
  editorDocument?: ReplyEditorDocument | null;
  assets?: AssetPreview[];
  accountId?: string;
  interactive?: InteractiveProps | null;
}) {
  const subject = useMemo(() => {
    const raw = subjectTemplate.trim();
    if (!raw) return defaultReplySubject(SAMPLE_CONTEXT.originalSubject);
    return renderEmailReplyTemplate(raw, SAMPLE_CONTEXT);
  }, [subjectTemplate]);

  const bodyHtml = useMemo(() => {
    if (layoutType === "blocks") {
      const doc = editorDocument ?? createClickLabPreset();
      const html = renderReplyBlocksHtml(doc, SAMPLE_CONTEXT, assets);
      if (accountId) {
        return substituteReplyTemplateCidsForPreview(html, assets, accountId);
      }
      return html;
    }
    return renderEmailReplyTemplate(htmlTemplate || "<p></p>", SAMPLE_CONTEXT, {
      html: true,
    });
  }, [layoutType, editorDocument, htmlTemplate, assets, accountId]);

  const useInteractive =
    layoutType === "blocks" && interactive && editorDocument && editorDocument.blocks.length > 0;

  return (
    <div className="flex min-h-[20rem] flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)] shadow-sm">
      <div className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--card-bg)] px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Предпросмотр
        </p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-muted)]">Тема: </span>
          {subject}
        </p>
        {useInteractive ? (
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">
            Перетащите блоки за ⋮⋮; ↔ и ↕ — масштаб картинки и кнопок.
          </p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-white px-0 py-0 text-sm leading-relaxed text-gray-900 [&_a]:text-blue-600">
        {useInteractive ? (
          <InteractiveBlocksPreview
            document={editorDocument}
            onDocumentChange={interactive.onDocumentChange}
            selectedBlockId={interactive.selectedBlockId}
            onSelectBlockId={interactive.onSelectBlockId}
            disabled={interactive.disabled}
            assets={assets}
            accountId={accountId}
          />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        )}
      </div>
      <p className="shrink-0 border-t border-[var(--border-subtle)] px-3 py-2 text-[10px] text-[var(--text-muted)]">
        Плейсхолдеры подставлены примером; кнопки и блоки — как в редакторе.
      </p>
    </div>
  );
}
