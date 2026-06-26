"use client";

import { useMemo } from "react";
import {
  defaultReplySubject,
  renderEmailReplyTemplate,
} from "@/lib/mail/email-reply-template";
import {
  createClickLabPreset,
  renderReplyBlocksHtml,
  SAMPLE_ORDER_STATUS_URL,
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

export function MailReplyTemplatePreview({
  subjectTemplate,
  htmlTemplate,
  layoutType = "freeform",
  editorDocument,
  assets = [],
  accountId,
}: {
  subjectTemplate: string;
  htmlTemplate: string;
  layoutType?: ReplyLayoutType;
  editorDocument?: ReplyEditorDocument | null;
  assets?: AssetPreview[];
  accountId?: string;
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
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto bg-white px-0 py-0 text-sm leading-relaxed text-gray-900 [&_a]:text-blue-600"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
      <p className="shrink-0 border-t border-[var(--border-subtle)] px-3 py-2 text-[10px] text-[var(--text-muted)]">
        Плейсхолдеры подставлены примером; кнопки и блоки — как в редакторе.
      </p>
    </div>
  );
}
