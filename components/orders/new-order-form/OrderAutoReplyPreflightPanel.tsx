"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrderSourceEmail } from "@/components/orders/new-order-panel-context";
import {
  buildEmailReplyTemplateContext,
  formatMailDate,
  localInputToDateYmd,
} from "@/lib/mail/build-email-reply-context";
import {
  defaultReplySubject,
  renderEmailReplyTemplate,
} from "@/lib/mail/email-reply-template";
import {
  createClickLabPreset,
  getEditablePreflightBlocks,
  renderReplyBlocksHtml,
  SAMPLE_ORDER_STATUS_URL,
  type ReplyEditorDocument,
  type ReplyLayoutType,
  type ReplyPreflightOverrides,
} from "@/lib/mail/reply-block-editor";
import {
  restoreReplyTemplateCidsFromPreview,
  substituteReplyTemplateCidsForPreview,
} from "@/lib/mail/reply-template-cid";

export type AutoReplyPreflightDraft = {
  subject: string;
  html: string;
};

export type AutoReplyPreflightState = {
  sendReply: boolean;
  draft: AutoReplyPreflightDraft | null;
  canSendReply: boolean;
  loading: boolean;
  hint: string | null;
};

type Props = {
  open: boolean;
  sourceEmail: OrderSourceEmail | null;
  orderNumberPreview: string;
  patientName: string;
  doctorName: string;
  clinicName: string;
  clinicAddress: string;
  dueDateLocal: string;
  appointmentLocal: string;
  sendReply: boolean;
  onSendReplyChange: (value: boolean) => void;
  onStateChange: (state: AutoReplyPreflightState) => void;
};

type LoadedTemplate = {
  subjectTemplate: string;
  htmlTemplate: string;
  layoutType: ReplyLayoutType;
  editorDocument: ReplyEditorDocument | null;
};

const DATE_PLACEHOLDER_RE = /\{\{\s*date\s*\}\}/i;

const EDITOR_CLASS =
  "min-h-[12rem] w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-muted)] px-3 py-2 text-sm leading-relaxed text-[var(--app-text)] shadow-sm outline-none [&_img]:my-2 [&_img]:max-h-48 [&_img]:max-w-full [&_img]:rounded-md [&_p]:my-1";

const PREVIEW_CLASS =
  "min-h-[12rem] w-full overflow-y-auto rounded-md border border-[var(--input-border)] bg-white px-3 py-2 text-sm leading-relaxed text-gray-900 [&_a]:text-blue-600";

function templateUsesDatePlaceholder(template: LoadedTemplate): boolean {
  const hay =
    template.layoutType === "blocks"
      ? JSON.stringify(template.editorDocument ?? {})
      : `${template.subjectTemplate}\n${template.htmlTemplate}`;
  return DATE_PLACEHOLDER_RE.test(hay);
}

function senderLabel(email: OrderSourceEmail): string {
  const name = email.fromName?.trim();
  const addr = email.fromAddress?.trim();
  if (name && addr) return `${name} <${addr}>`;
  return name || addr || "—";
}

export function OrderAutoReplyPreflightPanel({
  open,
  sourceEmail,
  orderNumberPreview,
  patientName,
  doctorName,
  clinicName,
  clinicAddress,
  dueDateLocal,
  appointmentLocal,
  sendReply,
  onSendReplyChange,
  onStateChange,
}: Props) {
  const [subject, setSubject] = useState("");
  const [editorHtml, setEditorHtml] = useState("");
  const [layoutType, setLayoutType] = useState<ReplyLayoutType>("blocks");
  const [textOverrides, setTextOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [canSendReply, setCanSendReply] = useState(false);
  const dirtyRef = useRef(false);
  const templateRef = useRef<LoadedTemplate | null>(null);
  const templateAssetsRef = useRef<Array<{ id: string; contentId: string }>>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorFocusedRef = useRef(false);
  const [pickerDateYmd, setPickerDateYmd] = useState("");
  const [needsDatePicker, setNeedsDatePicker] = useState(false);

  const preflightOverrides: ReplyPreflightOverrides = useMemo(
    () => ({
      dateYmd: pickerDateYmd || undefined,
      textOverrides,
    }),
    [pickerDateYmd, textOverrides],
  );

  const buildContext = useCallback(
    (dateYmd?: string) =>
      buildEmailReplyTemplateContext({
        orderNumber: orderNumberPreview,
        patientName,
        doctorName,
        clinicName,
        clinicAddress,
        date: (dateYmd ?? pickerDateYmd).trim() || null,
        dueDate: dueDateLocal.trim() || null,
        appointmentDate: appointmentLocal.trim() || null,
        originalSubject: sourceEmail!.subject,
        originalFromName: sourceEmail!.fromName,
        originalFromAddress: sourceEmail!.fromAddress,
        orderStatusUrl: SAMPLE_ORDER_STATUS_URL,
      }),
    [
      pickerDateYmd,
      orderNumberPreview,
      patientName,
      doctorName,
      clinicName,
      clinicAddress,
      dueDateLocal,
      appointmentLocal,
      sourceEmail,
    ],
  );

  const renderPreviewHtml = useCallback(
    (template: LoadedTemplate, accountId: string, dateYmd?: string) => {
      const ctx = buildContext(dateYmd);
      const subjectRaw = template.subjectTemplate.trim();
      const nextSubject = subjectRaw
        ? renderEmailReplyTemplate(subjectRaw, ctx)
        : defaultReplySubject(ctx.originalSubject);

      let html: string;
      if (template.layoutType === "blocks") {
        const doc = template.editorDocument ?? createClickLabPreset();
        html = renderReplyBlocksHtml(
          doc,
          ctx,
          templateAssetsRef.current,
          preflightOverrides,
        );
      } else {
        html = renderEmailReplyTemplate(template.htmlTemplate, ctx, { html: true });
      }
      const previewHtml = substituteReplyTemplateCidsForPreview(
        html,
        templateAssetsRef.current,
        accountId,
      );
      return { nextSubject, previewHtml };
    },
    [buildContext, preflightOverrides],
  );

  const applyTemplate = useCallback(
    (template: LoadedTemplate, accountId: string, opts?: { dateYmd?: string }) => {
      const { nextSubject, previewHtml } = renderPreviewHtml(
        template,
        accountId,
        opts?.dateYmd,
      );
      setSubject(nextSubject);
      setLayoutType(template.layoutType);
      if (template.layoutType === "freeform") {
        setEditorHtml(previewHtml);
        const el = editorRef.current;
        if (el && !editorFocusedRef.current) el.innerHTML = previewHtml;
      } else {
        setEditorHtml(previewHtml);
      }
    },
    [renderPreviewHtml],
  );

  const handlePickerDateChange = useCallback((nextYmd: string) => {
    setPickerDateYmd(nextYmd);
    dirtyRef.current = true;
  }, []);

  useEffect(() => {
    if (!open || !sourceEmail) return;
    dirtyRef.current = false;
    templateRef.current = null;
    setTextOverrides({});
    setNeedsDatePicker(false);
    setPickerDateYmd("");
    let cancelled = false;
    setLoading(true);
    setHint(null);
    void (async () => {
      try {
        const [templateRes, assetsRes] = await Promise.all([
          fetch(
            `/api/mail/accounts/${encodeURIComponent(sourceEmail.accountId)}/reply-template`,
            { credentials: "include" },
          ),
          fetch(
            `/api/mail/accounts/${encodeURIComponent(sourceEmail.accountId)}/reply-template/assets`,
            { credentials: "include" },
          ),
        ]);
        const data = (await templateRes.json()) as {
          template?: {
            subjectTemplate?: string;
            htmlTemplate?: string;
            layoutType?: ReplyLayoutType;
            editorDocument?: ReplyEditorDocument | null;
          } | null;
          error?: string;
        };
        const assetsData = assetsRes.ok
          ? ((await assetsRes.json()) as {
              assets?: Array<{ id: string; contentId: string }>;
            })
          : { assets: [] as Array<{ id: string; contentId: string }> };
        if (!templateRes.ok) {
          throw new Error(data.error ?? "Не удалось загрузить шаблон");
        }
        if (cancelled) return;
        const template = data.template;
        const lt = template?.layoutType ?? "blocks";
        const hasContent =
          lt === "blocks"
            ? Boolean(template?.editorDocument)
            : Boolean(template?.htmlTemplate?.trim());
        if (!template || !hasContent) {
          setCanSendReply(false);
          setHint("Шаблон ответа не настроен или пустой");
          setSubject("");
          setEditorHtml("");
          templateRef.current = null;
          return;
        }
        setCanSendReply(true);
        setHint(null);
        templateAssetsRef.current = assetsData.assets ?? [];
        templateRef.current = {
          subjectTemplate: template.subjectTemplate ?? "",
          htmlTemplate: template.htmlTemplate ?? "",
          layoutType: lt,
          editorDocument: template.editorDocument ?? null,
        };
        const loaded = templateRef.current;
        const usesDate = templateUsesDatePlaceholder(loaded);
        setNeedsDatePicker(usesDate);
        const initialYmd =
          localInputToDateYmd(dueDateLocal) || localInputToDateYmd(appointmentLocal);
        if (usesDate) setPickerDateYmd(initialYmd);
        applyTemplate(loaded, sourceEmail.accountId, {
          dateYmd: usesDate ? initialYmd : undefined,
        });
      } catch (e) {
        if (!cancelled) {
          setCanSendReply(false);
          setHint(e instanceof Error ? e.message : "Ошибка загрузки шаблона");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, sourceEmail?.id, sourceEmail?.accountId, sourceEmail, applyTemplate, dueDateLocal, appointmentLocal]);

  useEffect(() => {
    if (!open || !sourceEmail || !templateRef.current || dirtyRef.current) return;
    applyTemplate(templateRef.current, sourceEmail.accountId);
  }, [
    open,
    sourceEmail,
    orderNumberPreview,
    patientName,
    doctorName,
    clinicName,
    clinicAddress,
    dueDateLocal,
    appointmentLocal,
    pickerDateYmd,
    textOverrides,
    applyTemplate,
  ]);

  useEffect(() => {
    if (!sourceEmail || !templateRef.current) return;
    const { previewHtml } = renderPreviewHtml(
      templateRef.current,
      sourceEmail.accountId,
    );
    setEditorHtml(previewHtml);
  }, [textOverrides, pickerDateYmd, renderPreviewHtml, sourceEmail]);

  useEffect(() => {
    let htmlForSend = editorHtml;
    if (sourceEmail && editorHtml.trim()) {
      htmlForSend = restoreReplyTemplateCidsFromPreview(
        editorHtml,
        templateAssetsRef.current,
        sourceEmail.accountId,
      );
    }
    onStateChange({
      sendReply,
      draft:
        subject.trim() && htmlForSend.trim()
          ? { subject: subject.trim(), html: htmlForSend.trim() }
          : null,
      canSendReply,
      loading,
      hint,
    });
  }, [
    sendReply,
    subject,
    editorHtml,
    canSendReply,
    loading,
    hint,
    onStateChange,
    sourceEmail,
  ]);

  if (!sourceEmail) return null;

  const editableBlocks =
    layoutType === "blocks" && templateRef.current?.editorDocument
      ? getEditablePreflightBlocks(templateRef.current.editorDocument)
      : [];

  const dateMissing =
    needsDatePicker && !pickerDateYmd.trim() && editorHtml.includes("{{date}}");

  return (
    <div className="flex max-h-[min(96vh,920px)] w-full min-w-[min(100%,22rem)] max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl lg:w-[32rem] lg:max-w-[32rem]">
      <div className="shrink-0 border-b border-[var(--border-subtle)] px-5 py-4">
        <h2 className="text-lg font-semibold text-[var(--app-text)]">Ответное письмо</h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Кому: {senderLabel(sourceEmail)}
        </p>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-2.5">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-[var(--input-border)] text-[var(--sidebar-blue)]"
            checked={sendReply}
            onChange={(e) => onSendReplyChange(e.target.checked)}
          />
          <span className="text-sm font-medium text-[var(--text-strong)]">Отправить ответ</span>
        </label>
        {hint ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100">
            {hint}
          </p>
        ) : null}
        {dateMissing ? (
          <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950 dark:border-sky-800/60 dark:bg-sky-950/35 dark:text-sky-100">
            Выберите дату ниже — она подставится в <code className="font-mono">{"{{date}}"}</code>.
          </p>
        ) : null}
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Загрузка шаблона…</p>
        ) : (
          <>
            <div>
              <label
                htmlFor="auto-reply-subject"
                className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]"
              >
                Тема
              </label>
              <input
                id="auto-reply-subject"
                type="text"
                value={subject}
                disabled={!sendReply}
                onChange={(e) => {
                  dirtyRef.current = true;
                  setSubject(e.target.value);
                }}
                className="h-10 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 text-sm text-[var(--app-text)] shadow-sm outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)] disabled:opacity-50"
              />
            </div>
            {editableBlocks.map((block) =>
              block.type === "text" ? (
                <div key={block.id}>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    Текст письма
                  </label>
                  <textarea
                    disabled={!sendReply}
                    rows={6}
                    value={textOverrides[block.id] ?? block.content}
                    onChange={(e) => {
                      dirtyRef.current = true;
                      setTextOverrides((prev) => ({ ...prev, [block.id]: e.target.value }));
                    }}
                    className="w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm text-[var(--app-text)] shadow-sm outline-none focus:border-[var(--sidebar-blue)] disabled:opacity-50"
                  />
                </div>
              ) : null,
            )}
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Предпросмотр
              </p>
              {layoutType === "freeform" ? (
                <div
                  ref={editorRef}
                  role="textbox"
                  aria-multiline
                  aria-label="Текст ответного письма"
                  contentEditable={sendReply}
                  suppressContentEditableWarning
                  onFocus={() => {
                    editorFocusedRef.current = true;
                  }}
                  onBlur={() => {
                    editorFocusedRef.current = false;
                  }}
                  onInput={(e) => {
                    dirtyRef.current = true;
                    setEditorHtml(e.currentTarget.innerHTML);
                  }}
                  className={EDITOR_CLASS}
                />
              ) : (
                <div
                  className={PREVIEW_CLASS}
                  dangerouslySetInnerHTML={{ __html: editorHtml }}
                />
              )}
            </div>
          </>
        )}
      </div>
      {needsDatePicker ? (
        <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 py-3">
          <label
            htmlFor="auto-reply-date"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]"
          >
            Дата в письме
          </label>
          <input
            id="auto-reply-date"
            type="date"
            value={pickerDateYmd}
            disabled={!sendReply}
            onChange={(e) => handlePickerDateChange(e.target.value)}
            className="h-10 w-full max-w-xs rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 text-sm text-[var(--app-text)] shadow-sm outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)] disabled:opacity-50"
          />
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            Подставляется вместо <code className="font-mono">{"{{date}}"}</code> в шаблоне.
          </p>
        </div>
      ) : null}
    </div>
  );
}
