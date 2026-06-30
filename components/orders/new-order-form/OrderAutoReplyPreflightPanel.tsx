"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrderSourceEmail } from "@/components/orders/new-order-panel-context";
import { buildEmailReplyTemplateContext } from "@/lib/mail/build-email-reply-context";
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
  collectReplyDatePlaceholdersInHaystack,
  initialReplyDatePickerValues,
  type ReplyDatePlaceholderDef,
  type ReplyDatePlaceholderKey,
} from "@/lib/mail/reply-preflight-date-placeholders";
import {
  restoreReplyTemplateCidsFromPreview,
  substituteReplyTemplateCidsForPreview,
} from "@/lib/mail/reply-template-cid";
import { OrderAutoReplyBlocksPreview } from "./OrderAutoReplyBlocksPreview";

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

const EDITOR_CLASS =
  "min-h-[12rem] w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-muted)] px-3 py-2 text-sm leading-relaxed text-[var(--app-text)] shadow-sm outline-none [&_img]:my-2 [&_img]:max-h-48 [&_img]:max-w-full [&_img]:rounded-md [&_p]:my-1";

function templateHaystack(template: LoadedTemplate): string {
  return template.layoutType === "blocks"
    ? JSON.stringify(template.editorDocument ?? {})
    : `${template.subjectTemplate}\n${template.htmlTemplate}`;
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
  const [datePlaceholderDefs, setDatePlaceholderDefs] = useState<
    ReplyDatePlaceholderDef[]
  >([]);
  const [datePickerValues, setDatePickerValues] = useState<
    Partial<Record<ReplyDatePlaceholderKey, string>>
  >({});
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [canSendReply, setCanSendReply] = useState(false);
  const dirtyRef = useRef(false);
  const templateRef = useRef<LoadedTemplate | null>(null);
  const templateAssetsRef = useRef<Array<{ id: string; contentId: string }>>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorFocusedRef = useRef(false);

  const preflightOverrides: ReplyPreflightOverrides = useMemo(
    () => ({
      datePickerValues,
      textOverrides,
    }),
    [datePickerValues, textOverrides],
  );

  const buildContext = useCallback(() => {
    const dateVal =
      datePickerValues.date?.trim() ||
      /(\d{4}-\d{2}-\d{2})/.exec(dueDateLocal.trim())?.[1] ||
      /(\d{4}-\d{2}-\d{2})/.exec(appointmentLocal.trim())?.[1] ||
      null;
    const appointmentVal =
      datePickerValues.appointmentDate?.trim() || appointmentLocal.trim() || null;
    const dueVal = datePickerValues.dueDate?.trim() || dueDateLocal.trim() || null;
    return buildEmailReplyTemplateContext({
      orderNumber: orderNumberPreview,
      patientName,
      doctorName,
      clinicName,
      clinicAddress,
      date: dateVal,
      dueDate: dueVal,
      appointmentDate: appointmentVal,
      originalSubject: sourceEmail!.subject,
      originalFromName: sourceEmail!.fromName,
      originalFromAddress: sourceEmail!.fromAddress,
      orderStatusUrl: SAMPLE_ORDER_STATUS_URL,
    });
  }, [
    datePickerValues,
    orderNumberPreview,
    patientName,
    doctorName,
    clinicName,
    clinicAddress,
    dueDateLocal,
    appointmentLocal,
    sourceEmail,
  ]);

  const renderPreviewHtml = useCallback(
    (template: LoadedTemplate, accountId: string) => {
      const ctx = buildContext();
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
    (template: LoadedTemplate, accountId: string) => {
      const { nextSubject, previewHtml } = renderPreviewHtml(template, accountId);
      setSubject(nextSubject);
      setLayoutType(template.layoutType);
      setEditorHtml(previewHtml);
      if (template.layoutType === "freeform") {
        const el = editorRef.current;
        if (el && !editorFocusedRef.current) el.innerHTML = previewHtml;
      }
    },
    [renderPreviewHtml],
  );

  const handleDatePickerChange = useCallback(
    (key: ReplyDatePlaceholderKey, value: string) => {
      dirtyRef.current = true;
      setDatePickerValues((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleTextOverride = useCallback((blockId: string, text: string) => {
    dirtyRef.current = true;
    setTextOverrides((prev) => ({ ...prev, [blockId]: text }));
  }, []);

  useEffect(() => {
    if (!open || !sourceEmail) return;
    dirtyRef.current = false;
    templateRef.current = null;
    setTextOverrides({});
    setDatePlaceholderDefs([]);
    setDatePickerValues({});
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
            ? Boolean(template?.editorDocument) ||
              Boolean(template?.htmlTemplate?.trim())
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
        const defs = collectReplyDatePlaceholdersInHaystack(templateHaystack(loaded));
        setDatePlaceholderDefs(defs);
        const initialDates = initialReplyDatePickerValues(
          defs,
          dueDateLocal,
          appointmentLocal,
        );
        setDatePickerValues(initialDates);
        const ctx = buildEmailReplyTemplateContext({
          orderNumber: orderNumberPreview,
          patientName,
          doctorName,
          clinicName,
          clinicAddress,
          date:
            initialDates.date?.trim() ||
            /(\d{4}-\d{2}-\d{2})/.exec(dueDateLocal.trim())?.[1] ||
            /(\d{4}-\d{2}-\d{2})/.exec(appointmentLocal.trim())?.[1] ||
            null,
          dueDate: initialDates.dueDate?.trim() || dueDateLocal.trim() || null,
          appointmentDate:
            initialDates.appointmentDate?.trim() || appointmentLocal.trim() || null,
          originalSubject: sourceEmail.subject,
          originalFromName: sourceEmail.fromName,
          originalFromAddress: sourceEmail.fromAddress,
          orderStatusUrl: SAMPLE_ORDER_STATUS_URL,
        });
        const subjectRaw = loaded.subjectTemplate.trim();
        const nextSubject = subjectRaw
          ? renderEmailReplyTemplate(subjectRaw, ctx)
          : defaultReplySubject(ctx.originalSubject);
        let html: string;
        if (loaded.layoutType === "blocks") {
          html = renderReplyBlocksHtml(
            loaded.editorDocument ?? createClickLabPreset(),
            ctx,
            templateAssetsRef.current,
          );
        } else {
          html = renderEmailReplyTemplate(loaded.htmlTemplate, ctx, { html: true });
        }
        const previewHtml = substituteReplyTemplateCidsForPreview(
          html,
          templateAssetsRef.current,
          sourceEmail.accountId,
        );
        setSubject(nextSubject);
        setLayoutType(loaded.layoutType);
        setEditorHtml(previewHtml);
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
  }, [open, sourceEmail?.id, sourceEmail?.accountId, dueDateLocal, appointmentLocal]);

  useEffect(() => {
    if (layoutType !== "freeform" || editorFocusedRef.current) return;
    const el = editorRef.current;
    if (el && el.innerHTML !== editorHtml) {
      el.innerHTML = editorHtml;
    }
  }, [editorHtml, layoutType]);

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
    datePickerValues,
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
  }, [textOverrides, datePickerValues, renderPreviewHtml, sourceEmail]);

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

  const editableTextBlockIds =
    layoutType === "blocks" && templateRef.current
      ? getEditablePreflightBlocks(
          templateRef.current.editorDocument ?? createClickLabPreset(),
        )
          .filter((b) => b.type === "text")
          .map((b) => b.id)
      : [];

  const unresolvedDateTokens = datePlaceholderDefs.filter((def) => {
    const value = datePickerValues[def.key]?.trim();
    if (value) return false;
    return editorHtml.includes(def.token);
  });

  return (
    <div className="flex w-full min-w-[min(100%,22rem)] max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl lg:w-[32rem] lg:max-w-[32rem]">
      <div className="shrink-0 border-b border-[var(--border-subtle)] px-5 py-4">
        <h2 className="text-lg font-semibold text-[var(--app-text)]">Ответное письмо</h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Кому: {senderLabel(sourceEmail)}
        </p>
      </div>
      <div className="space-y-3 px-5 py-4">
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
        {unresolvedDateTokens.length > 0 ? (
          <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950 dark:border-sky-800/60 dark:bg-sky-950/35 dark:text-sky-100">
            Укажите{" "}
            {unresolvedDateTokens.map((d) => d.label.toLowerCase()).join(", ")} — плейсхолдер
            останется в письме, пока дата не выбрана.
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
            {datePlaceholderDefs.map((def) => (
              <div key={def.key}>
                <label
                  htmlFor={`auto-reply-date-${def.key}`}
                  className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]"
                >
                  {def.label}
                </label>
                <input
                  id={`auto-reply-date-${def.key}`}
                  type={def.inputType}
                  value={datePickerValues[def.key] ?? ""}
                  disabled={!sendReply}
                  onChange={(e) => handleDatePickerChange(def.key, e.target.value)}
                  className="h-10 w-full max-w-xs rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 text-sm text-[var(--app-text)] shadow-sm outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)] disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Подставляется вместо{" "}
                  <code className="font-mono">{def.token}</code>
                </p>
              </div>
            ))}
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
                <OrderAutoReplyBlocksPreview
                  html={editorHtml}
                  editableBlockIds={editableTextBlockIds}
                  disabled={!sendReply}
                  onTextOverride={handleTextOverride}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
