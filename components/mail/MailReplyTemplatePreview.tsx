"use client";

import { useMemo } from "react";
import {
  defaultReplySubject,
  renderEmailReplyTemplate,
} from "@/lib/mail/email-reply-template";
import {
  createClickLabPreset,
  renderReplyBlocksHtml,
  type ReplyBlockAssetRef,
  type ReplyEditorDocument,
  type ReplyLayoutType,
} from "@/lib/mail/reply-block-editor";
import { substituteReplyTemplateCidsForPreview } from "@/lib/mail/reply-template-cid";
import { ReplyPreviewBlock } from "@/components/mail/ReplyPreviewBlock";

type Props = {
  subjectTemplate: string;
  htmlTemplate: string;
  layoutType?: ReplyLayoutType;
  editorDocument?: ReplyEditorDocument | null;
  assets?: ReplyBlockAssetRef[];
  accountId?: string;
  selectedBlockId?: string | null;
  onSelectBlockId?: (id: string | null) => void;
  disabled?: boolean;
};

export function MailReplyTemplatePreview({
  subjectTemplate,
  htmlTemplate,
  layoutType = "freeform",
  editorDocument,
  assets = [],
  accountId,
  selectedBlockId = null,
  onSelectBlockId,
  disabled,
}: Props) {
  const subject = useMemo(() => {
    const raw = subjectTemplate.trim();
    if (!raw) {
      return defaultReplySubject("Заказ на коронки");
    }
    return renderEmailReplyTemplate(raw, {
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
      orderStatusUrl: "https://example.com/p/t/demo/s/token",
    });
  }, [subjectTemplate]);

  const doc = editorDocument ?? createClickLabPreset();
  const contentWidth = doc.global?.contentWidthPx ?? 600;
  const globalFont = doc.global?.fontFamily;

  const freeformHtml = useMemo(() => {
    if (layoutType === "blocks") return "";
    const html = renderEmailReplyTemplate(htmlTemplate || "<p></p>", {
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
      orderStatusUrl: "https://example.com/p/t/demo/s/token",
    }, { html: true });
    return html;
  }, [layoutType, htmlTemplate]);

  const blocksMode = layoutType === "blocks" && doc.blocks.length > 0;

  const blockKeys = useMemo(
    () => doc.blocks.map((b) => JSON.stringify(b)),
    [doc.blocks],
  );

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
        {blocksMode && onSelectBlockId ? (
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">
            Кликните блок, чтобы редактировать свойства слева. Порядок — в списке блоков.
          </p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-white px-0 py-0 text-sm leading-relaxed text-gray-900 [&_a]:text-blue-600">
        {blocksMode ? (
          <div
            className="mx-auto space-y-0 bg-[#f3f4f6] p-2"
            style={{ maxWidth: contentWidth + 16 }}
            onClick={() => onSelectBlockId?.(null)}
          >
            {doc.blocks.map((block, i) => (
              <ReplyPreviewBlock
                key={block.id}
                block={block}
                blockKey={blockKeys[i] ?? block.id}
                assets={assets}
                accountId={accountId}
                contentWidth={contentWidth}
                globalFont={globalFont}
                selected={selectedBlockId === block.id}
                disabled={disabled}
                onSelect={() => onSelectBlockId?.(block.id)}
              />
            ))}
          </div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: freeformHtml }} />
        )}
      </div>
      <p className="shrink-0 border-t border-[var(--border-subtle)] px-3 py-2 text-[10px] text-[var(--text-muted)]">
        Плейсхолдеры подставлены примером; кнопки и блоки — как в редакторе.
      </p>
    </div>
  );
}
