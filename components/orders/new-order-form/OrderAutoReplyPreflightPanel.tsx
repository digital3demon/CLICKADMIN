"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
} from "@/lib/mail/reply-block-editor";
import {
  buildReplyDateDisplayByKey,
  collectReplyDatePlaceholdersInHaystack,
  injectReplyInlineDatePickers,
  initialReplyDatePickerState,
  replyDateStateToLegacyValues,
  stripReplyInlineDatePickers,
  type ReplyDatePlaceholderDef,
  type ReplyDatePlaceholderKey,
  type ReplyDatePickerState,
} from "@/lib/mail/reply-preflight-date-placeholders";
import {
  restoreReplyTemplateCidsFromPreview,
  substituteReplyTemplateCidsForPreview,
} from "@/lib/mail/reply-template-cid";
import { OrderAutoReplyBlocksPreview } from "./OrderAutoReplyBlocksPreview";
import { ReplyPreflightInlineDatePicker } from "./ReplyPreflightInlineDatePicker";

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
  labWholeDay?: boolean;
  appointmentWholeDay?: boolean;
  sendReply: boolean;
  onStateChange: (state: AutoReplyPreflightState) => void;
};

type LoadedTemplate = {
  subjectTemplate: string;
  htmlTemplate: string;
  layoutType: ReplyLayoutType;
  editorDocument: ReplyEditorDocument | null;
};

type ActiveDatePicker = {
  key: ReplyDatePlaceholderKey;
  anchorRect: DOMRect;
};

const EDITOR_CLASS =
  "min-h-[12rem] w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-muted)] px-3 py-2 text-sm leading-relaxed text-[var(--app-text)] shadow-sm outline-none [&_.reply-inline-date-pick]:cursor-pointer [&_.reply-inline-date-pick]:underline [&_.reply-inline-date-pick]:decoration-dotted [&_.reply-inline-date-pick]:underline-offset-2 [&_.reply-inline-date-pick]:decoration-orange-400 [&_img]:my-2 [&_img]:max-h-48 [&_img]:max-w-full [&_img]:rounded-md [&_p]:my-1";

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
  labWholeDay = true,
  appointmentWholeDay = true,
  sendReply,
  onStateChange,
}: Props) {
  const [subject, setSubject] = useState("");
  const [editorHtml, setEditorHtml] = useState("");
  const [layoutType, setLayoutType] = useState<ReplyLayoutType>("blocks");
  const [textOverrides, setTextOverrides] = useState<Record<string, string>>({});
  const [datePlaceholderDefs, setDatePlaceholderDefs] = useState<
    ReplyDatePlaceholderDef[]
  >([]);
  const [datePickerState, setDatePickerState] = useState<ReplyDatePickerState>({});
  const [activeDatePicker, setActiveDatePicker] = useState<ActiveDatePicker | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [canSendReply, setCanSendReply] = useState(false);
  const dirtyRef = useRef(false);
  const templateRef = useRef<LoadedTemplate | null>(null);
  const templateAssetsRef = useRef<Array<{ id: string; contentId: string }>>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorFocusedRef = useRef(false);

  const renderPreviewHtml = useCallback(
    (
      template: LoadedTemplate,
      accountId: string,
      opts?: {
        dateState?: ReplyDatePickerState;
        defs?: readonly ReplyDatePlaceholderDef[];
      },
    ) => {
      const effectiveDateState = opts?.dateState ?? datePickerState;
      const effectiveDefs = opts?.defs ?? datePlaceholderDefs;
      const dateVal =
        effectiveDateState.date?.value?.trim() ||
        /(\d{4}-\d{2}-\d{2})/.exec(dueDateLocal.trim())?.[1] ||
        /(\d{4}-\d{2}-\d{2})/.exec(appointmentLocal.trim())?.[1] ||
        null;
      const appointmentVal =
        effectiveDateState.appointmentDate?.value?.trim() ||
        appointmentLocal.trim() ||
        null;
      const dueVal =
        effectiveDateState.dueDate?.value?.trim() || dueDateLocal.trim() || null;
      const base = buildEmailReplyTemplateContext({
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
      const displayByKey = buildReplyDateDisplayByKey(effectiveDefs, effectiveDateState);
      const ctx = {
        ...base,
        date: displayByKey.date ?? base.date,
        dueDate: displayByKey.dueDate ?? base.dueDate,
        appointmentDate: displayByKey.appointmentDate ?? base.appointmentDate,
      };

      const subjectRaw = template.subjectTemplate.trim();
      const nextSubject = subjectRaw
        ? renderEmailReplyTemplate(subjectRaw, ctx)
        : defaultReplySubject(ctx.originalSubject);

      let html: string;
      if (template.layoutType === "blocks") {
        const doc = template.editorDocument ?? createClickLabPreset();
        html = renderReplyBlocksHtml(doc, ctx, templateAssetsRef.current, {
          datePickerValues: replyDateStateToLegacyValues(effectiveDateState),
          textOverrides,
        });
      } else {
        html = renderEmailReplyTemplate(template.htmlTemplate, ctx, { html: true });
      }
      const previewHtml = substituteReplyTemplateCidsForPreview(
        html,
        templateAssetsRef.current,
        accountId,
      );
      const withInlinePickers = injectReplyInlineDatePickers(
        previewHtml,
        effectiveDefs,
        displayByKey,
      );
      return { nextSubject, previewHtml: withInlinePickers };
    },
    [
      datePickerState,
      datePlaceholderDefs,
      orderNumberPreview,
      patientName,
      doctorName,
      clinicName,
      clinicAddress,
      dueDateLocal,
      appointmentLocal,
      sourceEmail,
      textOverrides,
    ],
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

  const handleInlineDateClick = useCallback(
    (key: ReplyDatePlaceholderKey, anchorRect: DOMRect) => {
      if (!sendReply) return;
      setActiveDatePicker({ key, anchorRect });
    },
    [sendReply],
  );

  const handleDateApply = useCallback(
    (key: ReplyDatePlaceholderKey, value: string, hasTime: boolean) => {
      dirtyRef.current = true;
      setDatePickerState((prev) => ({ ...prev, [key]: { value, hasTime } }));
      setActiveDatePicker(null);
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
    setDatePickerState({});
    setActiveDatePicker(null);
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
        const initialDates = initialReplyDatePickerState(
          defs,
          dueDateLocal,
          appointmentLocal,
          { labWholeDay, appointmentWholeDay },
        );
        setDatePickerState(initialDates);
        const { nextSubject, previewHtml } = renderPreviewHtml(
          loaded,
          sourceEmail.accountId,
          { dateState: initialDates, defs },
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
  }, [
    open,
    sourceEmail?.id,
    sourceEmail?.accountId,
    // Исключаем renderPreviewHtml и локальные даты из зависимостей загрузки,
    // чтобы не провоцировать бесконечный цикл (fetch -> set state -> renderPreviewHtml меняется -> fetch).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);

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
    labWholeDay,
    appointmentWholeDay,
    datePickerState,
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
  }, [textOverrides, datePickerState, renderPreviewHtml, sourceEmail]);

  useEffect(() => {
    const root = editorRef.current;
    if (!root || layoutType !== "freeform") return;

    const onClick = (e: MouseEvent) => {
      if (!sendReply) return;
      const span = (e.target as HTMLElement | null)?.closest?.(
        "[data-reply-date-key]",
      ) as HTMLElement | null;
      if (!span) return;
      const key = span.getAttribute("data-reply-date-key") as ReplyDatePlaceholderKey | null;
      if (!key) return;
      e.preventDefault();
      e.stopPropagation();
      handleInlineDateClick(key, span.getBoundingClientRect());
    };

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [layoutType, sendReply, handleInlineDateClick]);

  useEffect(() => {
    let htmlForSend = stripReplyInlineDatePickers(editorHtml);
    if (sourceEmail && htmlForSend.trim()) {
      htmlForSend = restoreReplyTemplateCidsFromPreview(
        htmlForSend,
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
    const value = datePickerState[def.key]?.value?.trim();
    if (value) return false;
    return editorHtml.includes(def.token);
  });

  const activeDef = activeDatePicker
    ? datePlaceholderDefs.find((d) => d.key === activeDatePicker.key)
    : undefined;
  const activeEntry = activeDatePicker
    ? datePickerState[activeDatePicker.key]
    : undefined;

  return (
    <>
      <div className="flex w-full min-w-[min(100%,22rem)] max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl lg:w-[32rem] lg:max-w-[32rem]">
        <div className="shrink-0 border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--app-text)]">Ответное письмо</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Кому: {senderLabel(sourceEmail)}
          </p>
        </div>
        <div className="space-y-3 px-5 py-4">
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
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  Предпросмотр
                </p>
                <p className="mb-2 text-xs text-[var(--text-muted)]">
                  Нажмите на подчёркнутую дату в тексте, чтобы изменить её. Без выбора времени
                  в письме будет «в течение дня».
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
                    onInlineDateClick={handleInlineDateClick}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {activeDef && activeDatePicker ? (
        <ReplyPreflightInlineDatePicker
          open
          anchorRect={activeDatePicker.anchorRect}
          def={activeDef}
          value={activeEntry?.value ?? ""}
          hasTime={activeEntry?.hasTime ?? false}
          onApply={(value, hasTime) =>
            handleDateApply(activeDatePicker.key, value, hasTime)
          }
          onClose={() => setActiveDatePicker(null)}
        />
      ) : null}
    </>
  );
}
